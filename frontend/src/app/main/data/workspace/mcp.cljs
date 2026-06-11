;; This Source Code Form is subject to the terms of the Mozilla Public
;; License, v. 2.0. If a copy of the MPL was not distributed with this
;; file, You can obtain one at http://mozilla.org/MPL/2.0/.
;;
;; Copyright (c) KALEIDOS INC Sucursal en España SL

(ns app.main.data.workspace.mcp
  (:require
   [app.main.data.mcp :as mcp]))

(def set-mcp-active mcp/set-mcp-active)
(def start-reconnect-watcher! mcp/start-reconnect-watcher!)
(def stop-reconnect-watcher! mcp/stop-reconnect-watcher!)
(def handle-pong mcp/handle-pong)
(def handle-ping mcp/handle-ping)
(def notify-other-tabs-disconnect mcp/notify-other-tabs-disconnect)
(def update-mcp-status mcp/update-mcp-status)
(def update-mcp-connection-status mcp/update-mcp-connection-status)
(def connect-mcp mcp/connect-mcp)
(def user-disconnect-mcp mcp/user-disconnect-mcp)
(def bind-current-file-context mcp/bind-current-file-context)
(def release-current-file-context mcp/release-current-file-context)
(def init-mcp mcp/init-mcp)
(def init mcp/initialize)
