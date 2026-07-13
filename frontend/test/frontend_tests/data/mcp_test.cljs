;; This Source Code Form is subject to the terms of the Mozilla Public
;; License, v. 2.0. If a copy of the MPL was not distributed with this
;; file, You can obtain one at http://mozilla.org/MPL/2.0/.
;;
;; Copyright (c) KALEIDOS INC Sucursal en España SL

(ns frontend-tests.data.mcp-test
  (:require
   [app.main.broadcast :as mbc]
   [app.main.data.mcp :as mcp]
   [app.main.data.profile :as du]
   [cljs.test :as t]
   [potok.v2.core :as ptk]))

(defn- state
  [enabled?]
  {:session-id "tab-1"
   :profile {:props {:mcp-enabled enabled?}}})

(defn- state-with-props
  [props]
  {:session-id "tab-1"
   :profile {:props props}})

(defn- runtime-defaults
  []
  {:mode "builtin"
   :auto-connect true
   :public-uri "https://penpot.example"
   :stream-uri "https://penpot.example/mcp/stream"
   :sse-uri "https://penpot.example/mcp/sse"
   :websocket-uri "https://penpot.example/mcp/ws"
   :status-uri "https://penpot.example/mcp/status"})

(defn- canonical-url-derivation-cases
  []
  ;; Mirrors mcp/docs/mcp-url-derivation-fixtures.json.
  [{:id "builtin-default"
    :profile-props {}
    :expected (runtime-defaults)}
   {:id "builtin-auto-connect-false"
    :profile-props {:mcp-config {:mode "builtin"
                                 :auto-connect false
                                 :public-uri "https://ignored.example"
                                 :stream-uri "https://ignored.example/mcp/stream"
                                 :sse-uri "https://ignored.example/mcp/sse"
                                 :websocket-uri "wss://ignored.example/mcp/ws"
                                 :status-uri "https://ignored.example/mcp/status"}}
    :expected (assoc (runtime-defaults) :auto-connect false)}
   {:id "custom-public-uri"
    :profile-props {:mcp-config {:mode "custom"
                                 :public-uri "https://mcp.example"}}
    :expected {:mode "custom"
               :auto-connect true
               :public-uri "https://mcp.example"
               :stream-uri "https://mcp.example/mcp/stream"
               :sse-uri "https://mcp.example/mcp/sse"
               :websocket-uri "https://mcp.example/mcp/ws"
               :status-uri "https://mcp.example/mcp/status"}}
   {:id "custom-explicit-overrides"
    :profile-props {:mcp-config {:mode "custom"
                                 :public-uri "https://mcp.example"
                                 :stream-uri "https://stream.example/mcp"
                                 :sse-uri "https://sse.example/sse"
                                 :websocket-uri "wss://ws.example"
                                 :status-uri "https://status.example/status"}}
    :expected {:mode "custom"
               :auto-connect true
               :public-uri "https://mcp.example"
               :stream-uri "https://stream.example/mcp"
               :sse-uri "https://sse.example/sse"
               :websocket-uri "wss://ws.example"
               :status-uri "https://status.example/status"}}
   {:id "custom-blank-and-partial-fallback"
    :profile-props {:mcp-config {:mode "custom"
                                 :public-uri " "
                                 :stream-uri ""
                                 :sse-uri "https://sse.example/sse"
                                 :websocket-uri "   "
                                 :status-uri nil}}
    :expected {:mode "custom"
               :auto-connect true
               :public-uri "https://penpot.example"
               :stream-uri "https://penpot.example/mcp/stream"
               :sse-uri "https://sse.example/sse"
               :websocket-uri "https://penpot.example/mcp/ws"
               :status-uri "https://penpot.example/mcp/status"}}
   {:id "local-default"
    :profile-props {:mcp-config {:mode "local"
                                 :auto-connect false}}
    :expected {:mode "local"
               :auto-connect false
               :public-uri "http://localhost:4401"
               :stream-uri "http://localhost:4401/mcp"
               :sse-uri "http://localhost:4401/sse"
               :websocket-uri "ws://localhost:4402"
               :status-uri "http://localhost:4401/status"}}
   {:id "local-partial-overrides"
    :profile-props {:mcp-config {:mode "local"
                                 :public-uri "http://localhost:5501"
                                 :sse-uri "http://localhost:5501/sse"
                                 :status-uri "http://localhost:5501/status"}}
    :expected {:mode "local"
               :auto-connect true
               :public-uri "http://localhost:5501"
               :stream-uri "http://localhost:4401/mcp"
               :sse-uri "http://localhost:5501/sse"
               :websocket-uri "ws://localhost:4402"
               :status-uri "http://localhost:5501/status"}}
   {:id "unknown-mode-fallback"
    :profile-props {:mcp-config {:mode "sidecar"
                                 :auto-connect false
                                 :public-uri "https://ignored.example"
                                 :stream-uri "https://ignored.example/mcp/stream"}}
    :expected (assoc (runtime-defaults) :auto-connect false)}
   {:id "missing-mode-fallback"
    :profile-props {:mcp-config {:public-uri "https://ignored.example"
                                 :stream-uri "https://ignored.example/mcp/stream"}}
    :expected (runtime-defaults)}
   {:id "reset-config"
    :profile-props {:mcp-config nil}
    :expected (runtime-defaults)}])

(t/deftest effective-config-matches-canonical-url-derivation-fixtures
  (doseq [{:keys [id profile-props expected]} (canonical-url-derivation-cases)]
    (t/testing id
      (t/is (= expected
               (mcp/effective-config (runtime-defaults) profile-props))))))

(t/deftest effective-config-uses-runtime-defaults-without-profile-config
  (t/is (= (runtime-defaults)
           (mcp/effective-config (runtime-defaults) {}))))

(t/deftest effective-config-reset-uses-runtime-defaults
  (t/is (= (runtime-defaults)
           (mcp/effective-config (runtime-defaults) {:mcp-config nil}))))

(t/deftest effective-config-missing-mode-falls-back-to-built-in
  (let [result (mcp/effective-config
                (runtime-defaults)
                {:mcp-config {:public-uri "https://ignored.example"
                              :stream-uri "https://ignored.example/mcp"}})]
    (t/is (= (runtime-defaults) result))))

(t/deftest effective-config-unknown-mode-falls-back-to-built-in
  (let [result (mcp/effective-config
                (runtime-defaults)
                {:mcp-config {:mode "sidecar"
                              :auto-connect false
                              :public-uri "https://ignored.example"
                              :stream-uri "https://ignored.example/mcp"}})]
    (t/is (= (assoc (runtime-defaults) :auto-connect false)
             result))))

(t/deftest effective-config-builtin-ignores-url-overrides
  (let [result (mcp/effective-config
                (runtime-defaults)
                {:mcp-config {:mode "builtin"
                              :auto-connect false
                              :stream-uri "https://custom.example/mcp"
                              :websocket-uri "wss://custom.example/ws"
                              :status-uri "https://custom.example/status"}})]
    (t/is (= (assoc (runtime-defaults) :auto-connect false)
             result))))

(t/deftest effective-config-local-uses-standalone-defaults
  (let [result (mcp/effective-config
                (runtime-defaults)
                {:mcp-config {:mode "local"
                              :auto-connect false}})]
    (t/is (= "local" (:mode result)))
    (t/is (false? (:auto-connect result)))
    (t/is (= "http://localhost:4401/mcp" (:stream-uri result)))
    (t/is (= "http://localhost:4401/sse" (:sse-uri result)))
    (t/is (= "ws://localhost:4402" (:websocket-uri result)))
    (t/is (= "http://localhost:4401/status" (:status-uri result)))))

(t/deftest effective-config-custom-derives-gateway-urls
  (let [result (mcp/effective-config
                (runtime-defaults)
                {:mcp-config {:mode "custom"
                              :public-uri "https://mcp.example"}})]
    (t/is (= {:mode "custom"
              :auto-connect true
              :public-uri "https://mcp.example"
              :stream-uri "https://mcp.example/mcp/stream"
              :sse-uri "https://mcp.example/mcp/sse"
              :websocket-uri "https://mcp.example/mcp/ws"
              :status-uri "https://mcp.example/mcp/status"}
             result))))

(t/deftest effective-config-custom-explicit-urls-win
  (let [result (mcp/effective-config
                (runtime-defaults)
                {:mcp-config {:mode "custom"
                              :public-uri "https://mcp.example"
                              :stream-uri "https://stream.example/mcp"
                              :websocket-uri "wss://ws.example"
                              :status-uri "https://status.example/status"}})]
    (t/is (= "https://stream.example/mcp" (:stream-uri result)))
    (t/is (= "https://mcp.example/mcp/sse" (:sse-uri result)))
    (t/is (= "wss://ws.example" (:websocket-uri result)))
    (t/is (= "https://status.example/status" (:status-uri result)))))

(t/deftest effective-config-custom-blank-and-partial-fields-fall-back
  (let [result (mcp/effective-config
                (runtime-defaults)
                {:mcp-config {:mode "custom"
                              :public-uri " "
                              :stream-uri ""
                              :sse-uri "https://sse.example/sse"
                              :websocket-uri "   "
                              :status-uri nil}})]
    (t/is (= "https://penpot.example" (:public-uri result)))
    (t/is (= "https://penpot.example/mcp/stream" (:stream-uri result)))
    (t/is (= "https://sse.example/sse" (:sse-uri result)))
    (t/is (= "https://penpot.example/mcp/ws" (:websocket-uri result)))
    (t/is (= "https://penpot.example/mcp/status" (:status-uri result)))))

(t/deftest editable-config-defaults-to-built-in-mode
  (t/is (= {:mode "builtin"
            :auto-connect true
            :public-uri ""
            :stream-uri ""
            :sse-uri ""
            :websocket-uri ""
            :status-uri ""}
           (mcp/editable-config {}))))

(t/deftest editable-config-preserves-saved-connection-fields
  (t/is (= {:mode "custom"
            :auto-connect false
            :public-uri "https://mcp.example"
            :stream-uri "https://stream.example/mcp"
            :sse-uri ""
            :websocket-uri "wss://ws.example"
            :status-uri ""}
           (mcp/editable-config
            {:mcp-config {:mode "custom"
                          :auto-connect false
                          :public-uri "https://mcp.example"
                          :stream-uri "https://stream.example/mcp"
                          :websocket-uri "wss://ws.example"}}))))

(t/deftest editable-config-profile-props-reset-built-in-defaults
  (t/is (= {:mcp-config nil}
           (mcp/editable-config->profile-props
            {:mode "builtin"
             :auto-connect true
             :public-uri "https://ignored.example"
             :stream-uri "https://ignored.example/mcp"}))))

(t/deftest editable-config-profile-props-keeps-built-in-auto-connect-override
  (t/is (= {:mcp-config {:mode "builtin"
                         :auto-connect false}}
           (mcp/editable-config->profile-props
            {:mode "builtin"
             :auto-connect false}))))

(t/deftest editable-config-profile-props-trims-custom-fields
  (t/is (= {:mcp-config {:mode "custom"
                         :auto-connect false
                         :public-uri "https://mcp.example"
                         :stream-uri "https://stream.example/mcp"
                         :websocket-uri "wss://ws.example"}}
           (mcp/editable-config->profile-props
            {:mode "custom"
             :auto-connect false
             :public-uri " https://mcp.example "
             :stream-uri " https://stream.example/mcp "
             :sse-uri "   "
             :websocket-uri " wss://ws.example "
             :status-uri ""}))))

(t/deftest editable-config-profile-props-keeps-local-overrides
  (t/is (= {:mcp-config {:mode "local"
                         :auto-connect true
                         :status-uri "http://localhost:4401/status"}}
           (mcp/editable-config->profile-props
            {:mode "local"
             :auto-connect true
             :status-uri " http://localhost:4401/status "}))))

(t/deftest config-save-events-update-profile-and-broadcast-reconfigure
  (let [[profile-event reconfigure-event :as events]
        (mcp/config-save-events
         {:mode "custom"
          :auto-connect false
          :public-uri "https://mcp.example"
          :stream-uri "https://stream.example/mcp"})

        result
        (ptk/update profile-event (state-with-props {:mcp-enabled true}))]

    (t/is (= 2 (count events)))
    (t/is (= ::du/update-profile-props (ptk/type profile-event)))
    (t/is (= ::mbc/event (ptk/type reconfigure-event)))
    (t/is (= {:mcp-enabled true
              :mcp-config {:mode "custom"
                           :auto-connect false
                           :public-uri "https://mcp.example"
                           :stream-uri "https://stream.example/mcp"}}
             (get-in result [:profile :props])))))

(t/deftest config-reset-events-reset-profile-and-broadcast-reconfigure
  (let [[profile-event reconfigure-event :as events]
        (mcp/config-reset-events)

        result
        (ptk/update profile-event
                    (state-with-props
                     {:mcp-enabled true
                      :mcp-config {:mode "custom"
                                   :public-uri "https://mcp.example"}}))]

    (t/is (= 2 (count events)))
    (t/is (= ::du/update-profile-props (ptk/type profile-event)))
    (t/is (= ::mbc/event (ptk/type reconfigure-event)))
    (t/is (= {:mcp-enabled true
              :mcp-config nil}
             (get-in result [:profile :props])))))

(t/deftest auto-connect-defaults-to-enabled
  (t/is (true? (mcp/auto-connect? {}))))

(t/deftest auto-connect-can-be-disabled-by-profile-config
  (t/is (false? (mcp/auto-connect? {:mcp-config {:mode "builtin"
                                                 :auto-connect false}}))))

(t/deftest initialize-keeps-mcp-disabled-without-workspace
  (let [result (ptk/update (mcp/initialize) (state false))]
    (t/is (false? (get-in result [:mcp :active])))
    (t/is (= "disconnected" (get-in result [:mcp :connection-status])))
    (t/is (nil? (get-in result [:mcp :connected-tab])))))

(t/deftest frontend-version-is-available-for-plugin-handshake
  (t/is (string? (mcp/frontend-version)))
  (t/is (seq (mcp/frontend-version))))

(t/deftest initialize-owns-mcp-when-enabled-without-workspace
  (let [result (ptk/update (mcp/initialize) (state true))]
    (t/is (true? (get-in result [:mcp :active])))
    (t/is (= "tab-1" (get-in result [:mcp :connected-tab])))
    (t/is (= "disconnected" (get-in result [:mcp :connection-status])))))

(t/deftest initialize-does-not-auto-connect-when-disabled-by-config
  (let [result (ptk/update (mcp/initialize)
                           (state-with-props
                            {:mcp-enabled true
                             :mcp-config {:mode "builtin"
                                          :auto-connect false}}))]
    (t/is (false? (get-in result [:mcp :active])))
    (t/is (nil? (get-in result [:mcp :connected-tab])))
    (t/is (= "disconnected" (get-in result [:mcp :connection-status])))))

(t/deftest initialize-clears-owned-tab-when-auto-connect-is-disabled
  (let [result (ptk/update (mcp/initialize)
                           (assoc (state-with-props
                                   {:mcp-enabled true
                                    :mcp-config {:mode "builtin"
                                                 :auto-connect false}})
                                  :mcp {:connected-tab "tab-1"
                                        :connection-status "connected"}))]
    (t/is (false? (get-in result [:mcp :active])))
    (t/is (= "disconnected" (get-in result [:mcp :connection-status])))
    (t/is (nil? (get-in result [:mcp :connected-tab])))))

(t/deftest connect-mcp-still-claims-current-tab-when-auto-connect-disabled
  (let [result (ptk/update (mcp/connect-mcp)
                           (state-with-props
                            {:mcp-enabled true
                             :mcp-config {:mode "builtin"
                                          :auto-connect false}}))]
    (t/is (= "tab-1" (get-in result [:mcp :connected-tab])))))

(t/deftest connection-status-update-keeps-legacy-ui-state
  (let [result (ptk/update (mcp/update-mcp-connection-status "connected")
                           (state true))]
    (t/is (= "connected" (get-in result [:mcp :connection-status])))))

(t/deftest connection-status-update-stores-last-error-details
  (let [result (ptk/update (mcp/update-mcp-connection-status
                            "error"
                            {:label "Connection error"
                             :error "WebSocket connection error"})
                           (state true))]
    (t/is (= "error" (get-in result [:mcp :connection-status])))
    (t/is (= "WebSocket connection error" (get-in result [:mcp :last-error :message])))))

(t/deftest connection-status-update-clears-last-error-on-connect
  (let [result (ptk/update (mcp/update-mcp-connection-status "connected")
                           (assoc (state true)
                                  :mcp {:last-error {:message "Previous error"}}))]
    (t/is (= "connected" (get-in result [:mcp :connection-status])))
    (t/is (nil? (get-in result [:mcp :last-error])))))

(t/deftest fetch-diagnostics-marks-state-loading
  (let [result (ptk/update (mcp/fetch-diagnostics) (state true))]
    (t/is (= "loading" (get-in result [:mcp :diagnostics :status])))))

(t/deftest update-mcp-diagnostics-stores-last-error
  (let [result (ptk/update (mcp/update-mcp-diagnostics
                            {:status "error"
                             :updated-at "2026-06-13T00:00:00.000Z"
                             :error {:message "MCP status unavailable"}})
                           (state true))]
    (t/is (= "error" (get-in result [:mcp :diagnostics :status])))
    (t/is (= "MCP status unavailable" (get-in result [:mcp :last-error :message])))))

(t/deftest set-mcp-active-updates-reconnect-state
  (let [active-result   (ptk/update (mcp/set-mcp-active true) (state true))
        inactive-result (ptk/update (mcp/set-mcp-active false) (state true))]
    (t/is (true? (get-in active-result [:mcp :active])))
    (t/is (false? (get-in inactive-result [:mcp :active])))))

(t/deftest update-mcp-status-keeps-profile-props-compatible
  (let [enabled-result  (ptk/update (mcp/update-mcp-status true) (state false))
        disabled-result (ptk/update (mcp/update-mcp-status false) (state true))]
    (t/is (true? (get-in enabled-result [:profile :props :mcp-enabled])))
    (t/is (false? (get-in disabled-result [:profile :props :mcp-enabled])))))

(t/deftest connect-mcp-claims-current-tab
  (let [result (ptk/update (mcp/connect-mcp) (state true))]
    (t/is (= "tab-1" (get-in result [:mcp :connected-tab])))))

(t/deftest handle-pong-updates-tab-ownership
  (let [connected-result
        (ptk/update (mcp/handle-pong {:id "tab-2"
                                      :data {:connection-status "connected"}})
                    (state true))

        disconnected-result
        (ptk/update (mcp/handle-pong {:id "tab-2"
                                      :data {:connection-status "disconnected"}})
                    (assoc-in (state true) [:mcp :connected-tab] "tab-2"))]
    (t/is (= "tab-2" (get-in connected-result [:mcp :connected-tab])))
    (t/is (nil? (get-in disconnected-result [:mcp :connected-tab])))))

(t/deftest initialize-initializes-file-context-unbound
  (let [result (ptk/update (mcp/initialize) (state true))]
    (t/is (= {:status "unbound"} (get-in result [:mcp :file-context])))))

(t/deftest bind-current-file-context-sets-binding-status
  (let [result (ptk/update (mcp/bind-current-file-context)
                           (assoc-in (state true) [:mcp :file-context] {:status "unbound"}))]
    (t/is (= "binding" (get-in result [:mcp :file-context :status])))))

(t/deftest release-current-file-context-sets-releasing-status
  (let [result (ptk/update (mcp/release-current-file-context)
                           (assoc-in (state true) [:mcp :file-context] {:status "bound"}))]
    (t/is (= "releasing" (get-in result [:mcp :file-context :status])))))

(t/deftest update-mcp-file-context-status-stores-plugin-status
  (let [result (ptk/update (mcp/update-mcp-file-context-status
                            {:status "bound"
                             :context {:fileId "file-1"}})
                           (state true))]
    (t/is (= "bound" (get-in result [:mcp :file-context :status])))
    (t/is (= "file-1" (get-in result [:mcp :file-context :context :fileId])))))

(t/deftest file-context-summary-covers-external-status-states
  (let [unbound   (mcp/file-context-summary
                   {:file-context {:status "unbound"}})
        available (mcp/file-context-summary
                   {:file-context {:status "available"
                                   :context {:fileId "file-1"
                                             :fileName "Prototype"
                                             :pageId "page-1"
                                             :pageName "Welcome"}}})
        bound     (mcp/file-context-summary
                   {:file-context {:status "bound"
                                   :context {:fileId "file-1"
                                             :fileName "Prototype"}}})
        stale     (mcp/file-context-summary
                   {:file-context {:status "unbound"}
                    :diagnostics {:data {:fileContexts {:totalContexts 1
                                                        :availableContexts 0
                                                        :boundContexts 0
                                                        :staleContexts 1}}}})
        expired   (mcp/file-context-summary
                   {:file-context {:status "bound"
                                   :context {:fileId "file-1"
                                             :fileName "Prototype"}}}
                   {:token-expired? true})]
    (t/is (= "unbound" (:status unbound)))
    (t/is (= "integrations.mcp-server.context.unbound" (:label-key unbound)))
    (t/is (= 0 (:context-count unbound)))
    (t/is (= "available" (:status available)))
    (t/is (= "Prototype / Welcome" (:target-label available)))
    (t/is (= 1 (:context-count available)))
    (t/is (= "bound" (:status bound)))
    (t/is (true? (:bound? bound)))
    (t/is (= "stale" (:status stale)))
    (t/is (= 1 (:stale-count stale)))
    (t/is (= "expired-token" (:status expired)))
    (t/is (= "integrations.mcp-server.context.expired-token" (:label-key expired)))))

(t/deftest disconnect-flow-resets-file-context-to-unbound
  (let [bound-state (assoc-in (state true) [:mcp :file-context] {:status "bound"})
        result (ptk/update (mcp/update-mcp-file-context-status {:status "unbound"})
                           bound-state)]
    (t/is (= "unbound" (get-in result [:mcp :file-context :status])))))
