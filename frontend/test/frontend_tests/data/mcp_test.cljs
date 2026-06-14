;; This Source Code Form is subject to the terms of the Mozilla Public
;; License, v. 2.0. If a copy of the MPL was not distributed with this
;; file, You can obtain one at http://mozilla.org/MPL/2.0/.
;;
;; Copyright (c) KALEIDOS INC Sucursal en España SL

(ns frontend-tests.data.mcp-test
  (:require
   [app.main.data.mcp :as mcp]
   [cljs.test :as t]
   [potok.v2.core :as ptk]))

(defn- state
  [enabled?]
  {:session-id "tab-1"
   :profile {:props {:mcp-enabled enabled?}}})

(defn- runtime-defaults
  []
  {:mode "builtin"
   :auto-connect true
   :public-uri "https://penpot.example"
   :stream-uri "https://penpot.example/mcp/stream"
   :sse-uri "https://penpot.example/mcp/sse"
   :websocket-uri "https://penpot.example/mcp/ws"
   :status-uri "https://penpot.example/mcp/status"})

(t/deftest effective-config-uses-runtime-defaults-without-profile-config
  (t/is (= (runtime-defaults)
           (mcp/effective-config (runtime-defaults) {}))))

(t/deftest effective-config-reset-uses-runtime-defaults
  (t/is (= (runtime-defaults)
           (mcp/effective-config (runtime-defaults) {:mcp-config nil}))))

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
                           (assoc-in (state true) [:mcp :file-context {:status "unbound"}]))]
    (t/is (= "binding" (get-in result [:mcp :file-context :status])))))

(t/deftest release-current-file-context-sets-releasing-status
  (let [result (ptk/update (mcp/release-current-file-context)
                           (assoc-in (state true) [:mcp :file-context {:status "bound"}]))]
    (t/is (= "releasing" (get-in result [:mcp :file-context :status])))))

(t/deftest update-mcp-file-context-status-stores-plugin-status
  (let [result (ptk/update (mcp/update-mcp-file-context-status
                           {:status "bound"
                            :context {:fileId "file-1"}})
                           (state true))]
    (t/is (= "bound" (get-in result [:mcp :file-context :status])))
    (t/is (= "file-1" (get-in result [:mcp :file-context :context :fileId])))))

(t/deftest disconnect-flow-resets-file-context-to-unbound
  (let [bound-state (assoc-in (state true) [:mcp :file-context {:status "bound"}])
        result (ptk/update (mcp/update-mcp-file-context-status {:status "unbound"})
                           bound-state)]
    (t/is (= "unbound" (get-in result [:mcp :file-context :status])))))
