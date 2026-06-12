;; This Source Code Form is subject to the terms of the Mozilla Public
;; License, v. 2.0. If a copy of the MPL was not distributed with this
;; file, You can obtain one at http://mozilla.org/MPL/2.0/.
;;
;; Copyright (c) KALEIDOS INC Sucursal en España SL

(ns backend-tests.rpc-headless-commands-test
  (:require
   [app.common.features :as cfeat]
   [app.common.types.text :as cttx]
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

(t/deftest create-file-shape
  (let [profile  (th/create-profile* 1 {:is-active true})
        file     (th/create-file* 1 {:profile-id (:id profile)
                                     :project-id (:default-project-id profile)
                                     :is-shared false})
        page-id  (get-in file [:data :pages 0])
        frame-id (uuid/next)
        rect-id  (uuid/next)
        text-id  (uuid/next)]

    (t/testing "create a top-level frame"
      (let [out {::th/type :create-file-shape
                 ::rpc/profile-id (:id profile)
                 :id (:id file)
                 :page-id page-id
                 :shape-id frame-id
                 :type :frame
                 :name "  Login  "
                 :x 10
                 :y 20
                 :width 320
                 :height 640
                 :features cfeat/supported-features}
            out (th/command! out)]
        (t/is (nil? (:error out)))
        (t/is (= {:id frame-id
                  :name "Login"
                  :type :frame
                  :page-id page-id
                  :parent-id uuid/zero
                  :frame-id uuid/zero
                  :x 10
                  :y 20
                  :width 320
                  :height 640}
                 (get-in out [:result :shape])))
        (t/is (= 1 (get-in out [:result :revn])))))

    (t/testing "create a rectangle inside the frame"
      (let [out {::th/type :create-file-shape
                 ::rpc/profile-id (:id profile)
                 :id (:id file)
                 :page-id page-id
                 :shape-id rect-id
                 :parent-id frame-id
                 :type :rect
                 :name "CTA"
                 :x 24
                 :y 32
                 :width 120
                 :height 40
                 :fill {:color "#00ff00"
                        :opacity 0.75}
                 :border-radius 8
                 :features cfeat/supported-features}
            out (th/command! out)]
        (t/is (nil? (:error out)))
        (t/is (= rect-id (get-in out [:result :shape :id])))
        (t/is (= 2 (get-in out [:result :revn])))))

    (t/testing "create a text layer inside the frame"
      (let [out {::th/type :create-file-shape
                 ::rpc/profile-id (:id profile)
                 :id (:id file)
                 :page-id page-id
                 :shape-id text-id
                 :parent-id frame-id
                 :type :text
                 :x 24
                 :y 96
                 :width 200
                 :height 32
                 :content "Hello backend"
                 :font-size 24
                 :features cfeat/supported-features}
            out (th/command! out)]
        (t/is (nil? (:error out)))
        (t/is (= text-id (get-in out [:result :shape :id])))
        (t/is (= 3 (get-in out [:result :revn])))))

    (t/testing "created shapes are persisted"
      (let [out {::th/type :get-file
                 ::rpc/profile-id (:id profile)
                 :id (:id file)
                 :features cfeat/supported-features}
            out (th/command! out)
            data (:data (:result out))
            objects (get-in data [:pages-index page-id :objects])
            rect (get objects rect-id)
            text (get objects text-id)]
        (t/is (nil? (:error out)))
        (t/is (= [frame-id] (get-in objects [uuid/zero :shapes])))
        (t/is (= [rect-id text-id] (get-in objects [frame-id :shapes])))
        (t/is (= [{:fill-color "#00ff00" :fill-opacity 0.75}] (:fills rect)))
        (t/is (= "Hello backend" (cttx/content->text (:content text))))))))
