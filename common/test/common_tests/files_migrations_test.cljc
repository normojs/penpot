;; This Source Code Form is subject to the terms of the Mozilla Public
;; License, v. 2.0. If a copy of the MPL was not distributed with this
;; file, You can obtain one at http://mozilla.org/MPL/2.0/.
;;
;; Copyright (c) KALEIDOS INC Sucursal en España SL

(ns common-tests.files-migrations-test
  (:require
   [app.common.data :as d]
   [app.common.files.migrations :as cfm]
   [app.common.pprint :as pp]
   [app.common.types.file :as ctf]
   [app.common.uuid :as uuid]
   [clojure.test :as t]))

(defmethod cfm/migrate-data "test/1" [data _] (update data :sum inc))
(defmethod cfm/migrate-data "test/2" [data _] (update data :sum inc))
(defmethod cfm/migrate-data "test/3" [data _] (update data :sum inc))

(t/deftest generic-migration-subsystem-1
  (let [migrations (into (d/ordered-set) ["test/1" "test/2" "test/3"])]
    (with-redefs [cfm/available-migrations migrations
                  ctf/check-file-data identity]
      (let [file  {:data {:sum 1}
                   :id 1
                   :migrations (d/ordered-set "test/1")}
            file' (cfm/migrate file nil)]
        (t/is (= cfm/available-migrations (:migrations file')))
        (t/is (= 3 (:sum (:data file'))))))))

(defn- navigate-interaction
  [destination attrs]
  (merge {:action-type :navigate
          :event-type :click
          :destination destination
          :preserve-scroll false}
         attrs))

(t/deftest prototype-interaction-id-migration-is-available
  (t/is (contains? cfm/available-migrations "0018-assign-prototype-interaction-ids")))

(t/deftest prototype-interaction-id-migration-assigns-missing-and-duplicate-ids
  (let [file-id (uuid/next)
        page-id (uuid/next)
        shape-id (uuid/next)
        component-id (uuid/next)
        component-shape-id (uuid/next)
        destination-id (uuid/next)
        stable-id (uuid/next)
        duplicate-id (uuid/next)
        missing (navigate-interaction destination-id {:event-type :mouse-enter})
        stable (navigate-interaction destination-id {:id stable-id
                                                     :preserve-scroll true})
        duplicate-first (navigate-interaction destination-id {:id duplicate-id
                                                              :event-type :mouse-leave})
        duplicate-second (navigate-interaction destination-id {:id duplicate-id
                                                               :delay 100})
        component-duplicate (navigate-interaction destination-id {:id duplicate-id
                                                                  :preserve-scroll true})
        component-missing (navigate-interaction destination-id {:event-type :mouse-enter
                                                                :delay 200})
        data {:id file-id
              :pages [page-id]
              :pages-index
              {page-id {:id page-id
                        :name "Page 1"
                        :objects
                        {shape-id {:id shape-id
                                   :type :rect
                                   :interactions [missing
                                                  stable
                                                  duplicate-first
                                                  duplicate-second]}}}}
              :components
              {component-id {:id component-id
                             :objects
                             {component-shape-id {:id component-shape-id
                                                  :type :rect
                                                  :interactions [component-duplicate
                                                                 component-missing]}}}}}
        data' (cfm/migrate-data data "0018-assign-prototype-interaction-ids")
        migrated-interactions (get-in data' [:pages-index page-id :objects shape-id :interactions])
        migrated-component-interactions (get-in data' [:components component-id :objects component-shape-id :interactions])
        interaction-ids (mapv :id (concat migrated-interactions migrated-component-interactions))]
    (t/is (every? uuid? interaction-ids))
    (t/is (apply distinct? interaction-ids))
    (t/is (= stable-id (:id (second migrated-interactions))))
    (t/is (= duplicate-id (:id (nth migrated-interactions 2))))
    (t/is (not= duplicate-id (:id (nth migrated-interactions 3))))
    (t/is (not= duplicate-id (:id (first migrated-component-interactions))))
    (t/is (= (mapv #(dissoc % :id) [missing stable duplicate-first duplicate-second])
             (mapv #(dissoc % :id) migrated-interactions)))
    (t/is (= (mapv #(dissoc % :id) [component-duplicate component-missing])
             (mapv #(dissoc % :id) migrated-component-interactions)))))
