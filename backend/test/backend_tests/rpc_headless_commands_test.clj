;; This Source Code Form is subject to the terms of the Mozilla Public
;; License, v. 2.0. If a copy of the MPL was not distributed with this
;; file, You can obtain one at http://mozilla.org/MPL/2.0/.
;;
;; Copyright (c) KALEIDOS INC Sucursal en España SL

(ns backend-tests.rpc-headless-commands-test
  (:require
   [app.common.features :as cfeat]
   [app.common.uuid :as uuid]
   [app.rpc :as-alias rpc]
   [backend-tests.helpers :as th]
   [clojure.test :as t]))

(t/use-fixtures :once th/state-init)
(t/use-fixtures :each th/database-reset)

(t/deftest get-file-pages-and-create-file-page
  (let [profile (th/create-profile* 1 {:is-active true})
        file    (th/create-file* 1 {:profile-id (:id profile)
                                    :project-id (:default-project-id profile)
                                    :is-shared false})
        page-id (uuid/next)]

    (t/testing "list current file pages"
      (let [out {::th/type :get-file-pages
                 ::rpc/profile-id (:id profile)
                 :id (:id file)}
            out (th/command! out)]
        (t/is (nil? (:error out)))
        (t/is (= {:file-id (:id file)
                  :pages [{:id (get-in file [:data :pages 0])
                           :name "Page 1"}]}
                 (:result out)))))

    (t/testing "create a new page through the headless backend command"
      (let [out {::th/type :create-file-page
                 ::rpc/profile-id (:id profile)
                 :id (:id file)
                 :page-id page-id
                 :name "  Prototype  "
                 :features cfeat/supported-features}
            out (th/command! out)]
        (t/is (nil? (:error out)))
        (t/is (= {:id page-id :name "Prototype"}
                 (get-in out [:result :page])))
        (t/is (= 1 (get-in out [:result :revn])))))

    (t/testing "created page is persisted in file data"
      (let [out {::th/type :get-file-pages
                 ::rpc/profile-id (:id profile)
                 :id (:id file)}
            out (th/command! out)]
        (t/is (nil? (:error out)))
        (t/is (= [{:id (get-in file [:data :pages 0])
                   :name "Page 1"}
                  {:id page-id
                   :name "Prototype"}]
                 (get-in out [:result :pages])))))))
