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

(t/deftest initialize-keeps-mcp-disabled-without-workspace
  (let [result (ptk/update (mcp/initialize) (state false))]
    (t/is (false? (get-in result [:mcp :active])))
    (t/is (= "disconnected" (get-in result [:mcp :connection-status])))
    (t/is (nil? (get-in result [:mcp :connected-tab])))))

(t/deftest initialize-owns-mcp-when-enabled-without-workspace
  (let [result (ptk/update (mcp/initialize) (state true))]
    (t/is (true? (get-in result [:mcp :active])))
    (t/is (= "tab-1" (get-in result [:mcp :connected-tab])))
    (t/is (= "disconnected" (get-in result [:mcp :connection-status])))))

(t/deftest connection-status-update-keeps-legacy-ui-state
  (let [result (ptk/update (mcp/update-mcp-connection-status "connected")
                           (state true))]
    (t/is (= "connected" (get-in result [:mcp :connection-status])))))

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
