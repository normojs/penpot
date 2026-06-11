;; This Source Code Form is subject to the terms of the Mozilla Public
;; License, v. 2.0. If a copy of the MPL was not distributed with this
;; file, You can obtain one at http://mozilla.org/MPL/2.0/.
;;
;; Copyright (c) KALEIDOS INC Sucursal en España SL

(ns frontend-tests.config-test
  (:require
   [app.config :as cf]
   [cljs.test :as t :include-macros true]))

(t/deftest mcp-public-url-builds-from-public-base
  (t/is (= "https://penpot.example.com/mcp/stream"
           (cf/mcp-public-url "https://penpot.example.com" "stream")))
  (t/is (= "https://penpot.example.com/base/mcp/ws"
           (cf/mcp-public-url "https://penpot.example.com/base" "ws"))))
