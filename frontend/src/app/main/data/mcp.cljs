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
   [app.util.i18n :refer [tr]]
   [app.util.timers :as ts]
   [beicon.v2.core :as rx]
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
  [value]
  (ptk/reify ::update-mcp-plugin-connection
    ptk/UpdateEvent
    (update [_ state]
      (update state :mcp assoc :connection-status value))

    ptk/WatchEvent
    (watch [_ _ _]
      (rx/of (manage-mcp-notification)
             (mbc/event :mcp/pong {:connection-status value})))))

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
  [stream]
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
                    :getServerUrl #(str cf/mcp-ws-uri)
                    :getFrontendVersion frontend-version
                    :setMcpStatus
                    (fn [status]
                      (when (= status "connected")
                        (start-reconnect-watcher!))
                      (st/emit! (update-mcp-connection-status status))
                      (log/info :hint "MCP STATUS" :status status))
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
       (rx/ignore)))

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
                 (init-mcp stream)

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
