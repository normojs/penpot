;; This Source Code Form is subject to the terms of the Mozilla Public
;; License, v. 2.0. If a copy of the MPL was not distributed with this
;; file, You can obtain one at http://mozilla.org/MPL/2.0/.
;;
;; Copyright (c) KALEIDOS INC Sucursal en España SL

(ns app.main.data.mcp
  (:require
   [app.common.logging :as log]
   [app.common.uri :as u]
   [app.config :as cf]
   [app.main.broadcast :as mbc]
   [app.main.data.event :as ev]
   [app.main.data.notifications :as ntf]
   [app.main.data.plugins :as dp]
   [app.main.data.profile :as du]
   [app.main.repo :as rp]
   [app.main.store :as st]
   [app.plugins.register :refer [mcp-plugin-id]]
   [app.util.http :as http]
   [app.util.i18n :refer [tr]]
   [app.util.timers :as ts]
   [beicon.v2.core :as rx]
   [cuerdas.core :as str]
   [potok.v2.core :as ptk]))

(def retry-interval 10000)

(log/set-level! :info)

(def ^:private default-manifest
  {:code "plugin.js"
   :name "Penpot MCP Plugin"
   :version 2
   :plugin-id mcp-plugin-id
   :description "This plugin enables interaction with the Penpot MCP server"
   :allow-background true
   :permissions
   #{"library:read" "library:write"
     "comment:read" "comment:write"
     "content:write" "content:read"}})

(defonce interval-sub (atom nil))

(defn- enabled?
  [state]
  (true? (-> state :profile :props :mcp-enabled)))

(defn- stop-event?
  [event]
  (contains? #{::initialize ::finalize} (ptk/type event)))

(defn frontend-version
  []
  (or (:full cf/version)
      cf/version-tag
      "unknown"))

(def ^:private local-default-config
  {:mode "local"
   :auto-connect true
   :public-uri "http://localhost:4401"
   :stream-uri "http://localhost:4401/mcp"
   :sse-uri "http://localhost:4401/sse"
   :websocket-uri "ws://localhost:4402"
   :status-uri "http://localhost:4401/status"})

(def ^:private config-uri-keys
  [:public-uri :stream-uri :sse-uri :websocket-uri :status-uri])

(defn- non-empty-string
  [value]
  (when (string? value)
    (let [value (str/trim value)]
      (when-not (str/blank? value)
        value))))

(defn- config-uri-overrides
  [config]
  (into {}
        (keep (fn [k]
                (when-let [value (non-empty-string (get config k))]
                  [k value])))
        config-uri-keys))

(defn- mcp-public-url
  [public-uri path]
  (when-let [public-uri (non-empty-string public-uri)]
    (try
      (cf/mcp-public-url public-uri path)
      (catch :default _
        nil))))

(defn runtime-default-config
  []
  {:mode "builtin"
   :auto-connect true
   :public-uri (str cf/mcp-public-uri)
   :stream-uri (str cf/mcp-server-url)
   :sse-uri (str cf/mcp-sse-uri)
   :websocket-uri (str cf/mcp-ws-uri)
   :status-uri (str cf/mcp-status-uri)})

(defn effective-config
  ([profile-props]
   (effective-config (runtime-default-config) profile-props))
  ([runtime-defaults profile-props]
   (let [config        (or (:mcp-config profile-props) {})
         mode          (case (:mode config)
                         "custom" "custom"
                         "local"  "local"
                         "builtin")
         auto-connect? (not (false? (:auto-connect config)))]
     (case mode
       "local"
       (-> local-default-config
           (merge (config-uri-overrides config))
           (assoc :mode "local"
                  :auto-connect auto-connect?))

       "custom"
       (let [public-uri (or (non-empty-string (:public-uri config))
                            (:public-uri runtime-defaults))]
         {:mode "custom"
          :auto-connect auto-connect?
          :public-uri public-uri
          :stream-uri (or (non-empty-string (:stream-uri config))
                          (mcp-public-url public-uri "stream")
                          (:stream-uri runtime-defaults))
          :sse-uri (or (non-empty-string (:sse-uri config))
                       (mcp-public-url public-uri "sse")
                       (:sse-uri runtime-defaults))
          :websocket-uri (or (non-empty-string (:websocket-uri config))
                             (mcp-public-url public-uri "ws")
                             (:websocket-uri runtime-defaults))
          :status-uri (or (non-empty-string (:status-uri config))
                          (mcp-public-url public-uri "status")
                          (:status-uri runtime-defaults))})

       (assoc runtime-defaults
              :mode "builtin"
              :auto-connect auto-connect?)))))

(defn editable-config
  [profile-props]
  (let [config (or (:mcp-config profile-props) {})]
    (-> (into {} (map (fn [k] [k (or (get config k) "")])) config-uri-keys)
        (assoc :mode (case (:mode config)
                       "custom" "custom"
                       "local"  "local"
                       "builtin")
               :auto-connect (not (false? (:auto-connect config)))))))

(defn editable-config->profile-props
  [config]
  (let [mode          (case (:mode config)
                        "custom" "custom"
                        "local"  "local"
                        "builtin")
        auto-connect? (not (false? (:auto-connect config)))
        uri-config    (if (= mode "builtin")
                        {}
                        (config-uri-overrides config))]
    (if (and (= mode "builtin")
             (true? auto-connect?)
             (empty? uri-config))
      {:mcp-config nil}
      {:mcp-config (assoc uri-config
                          :mode mode
                          :auto-connect auto-connect?)})))

(defn- now-iso
  []
  (.toISOString (js/Date.)))

(defn- error-message
  [cause]
  (cond
    (instance? js/Error cause) (.-message cause)
    (string? cause) cause
    :else (str cause)))

(defn- normalize-status-details
  [details]
  (cond
    (nil? details) nil
    (map? details) details
    :else (js->clj details :keywordize-keys true)))

(defn set-mcp-active
  [value]
  (ptk/reify ::set-mcp-active
    ptk/UpdateEvent
    (update [_ state]
      (assoc-in state [:mcp :active] value))))

(defn start-reconnect-watcher!
  []
  (st/emit! (set-mcp-active true))
  (when (nil? @interval-sub)
    (reset!
     interval-sub
     (ts/interval
      retry-interval
      (fn []
        (when-not (contains? #{"connecting" "connected"}
                             (-> @st/state :mcp :connection-status))
          (.log js/console "Reconnecting to MCP...")
          (st/emit! (ptk/data-event ::connect))))))))

(defn stop-reconnect-watcher!
  []
  (st/emit! (set-mcp-active false))
  (when @interval-sub
    (rx/dispose! @interval-sub)
    (reset! interval-sub nil)))

(declare manage-mcp-notification)

(defn handle-pong
  [{:keys [id data]}]
  (ptk/reify ::handle-pong
    ptk/UpdateEvent
    (update [_ state]
      (let [mcp-state (get state :mcp)]
        (cond
          (= "connected" (:connection-status data))
          (update state :mcp assoc :connected-tab id)

          (and (= "disconnected" (:connection-status data))
               (= id (:connected-tab mcp-state)))
          (update state :mcp dissoc :connected-tab)

          :else
          state)))

    ptk/WatchEvent
    (watch [_ _ _]
      (rx/of (manage-mcp-notification)))))

(defn handle-ping
  []
  (ptk/reify ::handle-ping
    ptk/WatchEvent
    (watch [_ state _]
      (let [conn-status (get-in state [:mcp :connection-status])]
        (rx/of (mbc/event :mcp/pong {:connection-status conn-status}))))))

(defn notify-other-tabs-disconnect
  []
  (ptk/reify ::notify-other-tabs-disconnect
    ptk/WatchEvent
    (watch [_ _ _]
      (rx/of (mbc/event :mcp/pong {:connection-status "disconnected"})))))

(defn update-mcp-status
  [value]
  (ptk/reify ::update-mcp-status
    ptk/UpdateEvent
    (update [_ state]
      (update-in state [:profile :props] assoc :mcp-enabled value))

    ptk/WatchEvent
    (watch [_ _ _]
      (rx/merge
       (rx/of (manage-mcp-notification))
       (case value
         true  (rx/of (ptk/data-event ::connect))
         false (rx/of (ptk/data-event ::disconnect))
         nil)))))

(defn update-mcp-connection-status
  ([value]
   (update-mcp-connection-status value nil))
  ([value details]
   (let [details (normalize-status-details details)]
     (ptk/reify ::update-mcp-plugin-connection
       ptk/UpdateEvent
       (update [_ state]
         (cond-> (update state :mcp assoc
                         :connection-status value
                         :connection-status-detail details)
           (= value "error")
           (assoc-in [:mcp :last-error] {:scope "connection"
                                         :message (or (:error details)
                                                      (:label details)
                                                      "MCP connection error")
                                         :updated-at (now-iso)})

           (contains? #{"connected" "connecting"} value)
           (update :mcp dissoc :last-error)))

       ptk/WatchEvent
       (watch [_ _ _]
         (rx/of (manage-mcp-notification)
                (mbc/event :mcp/pong {:connection-status value})))))))

(defn update-mcp-diagnostics
  [value]
  (ptk/reify ::update-mcp-diagnostics
    ptk/UpdateEvent
    (update [_ state]
      (cond-> (update state :mcp assoc :diagnostics value)
        (= "error" (:status value))
        (assoc-in [:mcp :last-error] {:scope "diagnostics"
                                      :message (get-in value [:error :message])
                                      :updated-at (:updated-at value)})))))

(defn fetch-diagnostics
  []
  (ptk/reify ::fetch-diagnostics
    ptk/UpdateEvent
    (update [_ state]
      (update state :mcp assoc-in [:diagnostics :status] "loading"))

    ptk/WatchEvent
    (watch [_ state _]
      (let [config (effective-config (get-in state [:profile :props]))]
        (->> (http/send! {:method :get
                          :uri (:status-uri config)
                          :credentials "include"
                          :response-type :json})
             (rx/mapcat
              (fn [{:keys [status body]}]
                (if (= status 200)
                  (rx/of body)
                  (rx/throw (ex-info "MCP status request failed" {:status status})))))
             (rx/map #(js->clj % :keywordize-keys true))
             (rx/map #(update-mcp-diagnostics {:status "ok"
                                               :updated-at (now-iso)
                                               :data %}))
             (rx/catch
              (fn [cause]
                (rx/of (update-mcp-diagnostics {:status "error"
                                                :updated-at (now-iso)
                                                :error {:message (error-message cause)}})))))))))

(defn update-mcp-file-context-status
  [value]
  (ptk/reify ::update-mcp-file-context-status
    ptk/UpdateEvent
    (update [_ state]
      (update state :mcp assoc :file-context value))))

(defn connect-mcp
  []
  (ptk/reify ::connect-mcp
    ptk/UpdateEvent
    (update [_ state]
      (update state :mcp assoc :connected-tab (:session-id state)))

    ptk/WatchEvent
    (watch [_ _ _]
      (rx/of (mbc/event :mcp/force-disconect {})
             (ptk/data-event ::connect)))))

(defn user-disconnect-mcp
  []
  (ptk/reify ::user-disconnect-mcp
    ptk/WatchEvent
    (watch [_ _ _]
      (rx/of (ptk/data-event ::disconnect)
             (update-mcp-connection-status "disconnected")
             (update-mcp-file-context-status {:status "unbound"})))

    ptk/EffectEvent
    (effect [_ _ _]
      (stop-reconnect-watcher!))))

(defn bind-current-file-context
  []
  (ptk/reify ::bind-current-file-context
    ptk/UpdateEvent
    (update [_ state]
      (update state :mcp assoc :file-context {:status "binding"}))

    ptk/WatchEvent
    (watch [_ _ _]
      (rx/of (ptk/data-event ::bind-file-context)))))

(defn release-current-file-context
  []
  (ptk/reify ::release-current-file-context
    ptk/UpdateEvent
    (update [_ state]
      (update state :mcp assoc :file-context {:status "releasing"}))

    ptk/WatchEvent
    (watch [_ _ _]
      (rx/of (ptk/data-event ::release-file-context)))))

(defn- manage-mcp-notification
  []
  (ptk/reify ::manage-mcp-notification
    ptk/WatchEvent
    (watch [_ state _]
      (let [mcp-state        (get state :mcp)
            mcp-enabled?     (enabled? state)
            current-tab-id   (get state :session-id)
            connected-tab-id (get mcp-state :connected-tab)]

        (if mcp-enabled?
          (if (= connected-tab-id current-tab-id)
            (rx/of (ntf/hide))
            (rx/of (ntf/dialog
                    {:content (tr "notifications.mcp.active-in-another-tab")
                     :cancel {:label (tr "labels.dismiss")
                              :callback #(st/emit! (ntf/hide)
                                                   (ev/event {::ev/name "dismiss-mcp-tab-switch"
                                                              ::ev/origin "workspace-notification"}))}
                     :accept {:label (tr "labels.switch")
                              :callback #(st/emit! (connect-mcp)
                                                   (ev/event {::ev/name "confirm-mcp-tab-switch"
                                                              ::ev/origin "workspace-notification"}))}})))
          (rx/of (ntf/hide)))))))

(defn init-mcp
  [stream profile-props]
  (let [config        (effective-config profile-props)
        websocket-uri (:websocket-uri config)]
    (->> (rp/cmd! :get-current-mcp-token)
         (rx/tap
          (fn [{:keys [token]}]
            (when token
              (dp/start-plugin!
               (assoc default-manifest
                      :url (str (u/join cf/public-uri "plugins/mcp/manifest.json"))
                      :host (str (u/join cf/public-uri "plugins/mcp/")))

               #js {:mcp
                    #js
                     {:getToken (constantly token)
                      :getServerUrl #(str websocket-uri)
                      :getFrontendVersion frontend-version
                      :setMcpStatus
                      (fn [status details]
                        (when (= status "connected")
                          (start-reconnect-watcher!))
                        (st/emit! (update-mcp-connection-status status details))
                        (log/info :hint "MCP STATUS" :status status :details details))
                      :setFileContextStatus
                      (fn [status]
                        (st/emit! (update-mcp-file-context-status (js->clj status :keywordize-keys true)))
                        (log/info :hint "MCP FILE CONTEXT" :status status))

                      :on
                      (fn [event cb]
                        (when-let [event
                                   (case event
                                     "disconnect" ::disconnect
                                     "connect" ::connect
                                     "bind-context" ::bind-file-context
                                     "release-context" ::release-file-context
                                     nil)]

                          (let [stopper (rx/filter stop-event? stream)]
                            (->> stream
                                 (rx/filter (ptk/type? event))
                                 (rx/take-until stopper)
                                 (rx/subs! #(cb))))))}}))))
         (rx/ignore))))

(defn initialize
  []
  (ptk/reify ::initialize
    ptk/UpdateEvent
    (update [_ state]
      (cond-> (update state :mcp assoc
                      :active (enabled? state)
                      :connection-status (get-in state [:mcp :connection-status] "disconnected")
                      :file-context (get-in state [:mcp :file-context] {:status "unbound"}))
        (enabled? state)
        (update :mcp assoc :connected-tab (:session-id state))))

    ptk/WatchEvent
    (watch [_ state stream]
      (let [stoper-s   (rx/filter stop-event? stream)
            session-id (get state :session-id)]

        (->> (rx/merge
              (rx/of (du/fetch-access-tokens))

              (if (enabled? state)
                (rx/merge
                 (init-mcp stream (get-in state [:profile :props]))

                 (rx/of (mbc/event :mcp/ping {}))

                 (->> mbc/stream
                      (rx/filter (mbc/type? :mcp/ping))
                      (rx/filter (fn [{:keys [id]}]
                                   (not= session-id id)))
                      (rx/map handle-ping))

                 (->> mbc/stream
                      (rx/filter (mbc/type? :mcp/pong))
                      (rx/filter (fn [{:keys [id]}]
                                   (not= session-id id)))
                      (rx/map handle-pong))

                 (->> mbc/stream
                      (rx/filter (mbc/type? :mcp/force-disconect))
                      (rx/filter (fn [{:keys [id]}]
                                   (not= session-id id)))
                      (rx/map deref)
                      (rx/map (fn [] (user-disconnect-mcp)))))
                (rx/empty))

              (->> mbc/stream
                   (rx/filter (mbc/type? :mcp/enable))
                   (rx/mapcat (fn [_]
                                (rx/of (update-mcp-status true)
                                       (initialize)))))

              (->> mbc/stream
                   (rx/filter (mbc/type? :mcp/disable))
                   (rx/mapcat (fn [_]
                                (rx/of (update-mcp-status false)
                                       (initialize)
                                       (user-disconnect-mcp))))))

             (rx/take-until stoper-s))))))

(defn finalize
  []
  (ptk/reify ::finalize
    ptk/WatchEvent
    (watch [_ _ _]
      (rx/of (user-disconnect-mcp)))

    ptk/EffectEvent
    (effect [_ _ _]
      (stop-reconnect-watcher!))))
