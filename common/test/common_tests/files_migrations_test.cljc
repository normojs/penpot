;; This Source Code Form is subject to the terms of the Mozilla Public
;; License, v. 2.0. If a copy of the MPL was not distributed with this
;; file, You can obtain one at http://mozilla.org/MPL/2.0/.
;;
;; Copyright (c) KALEIDOS INC Sucursal en España SL

(ns common-tests.files-migrations-test
  (:require
   [app.common.data :as d]
   [app.common.files.migrations :as cfm]
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

(t/deftest prototype-interaction-id-migration-preserves-file-level-clone-identities
  (let [source-file-id (uuid/next)
        cloned-file-id (uuid/next)
        page-a-id (uuid/next)
        page-b-id (uuid/next)
        shape-a-id (uuid/next)
        shape-b-id (uuid/next)
        shape-c-id (uuid/next)
        destination-a-id (uuid/next)
        destination-b-id (uuid/next)
        stable-a-id (uuid/next)
        stable-b-id (uuid/next)
        duplicate-id (uuid/next)
        stable-a (navigate-interaction destination-a-id {:id stable-a-id
                                                         :preserve-scroll true})
        stable-b (navigate-interaction destination-b-id {:id stable-b-id
                                                         :event-type :mouse-enter})
        missing (navigate-interaction destination-a-id {:event-type :mouse-leave})
        duplicate-first (navigate-interaction destination-b-id {:id duplicate-id
                                                                :delay 100})
        duplicate-second (navigate-interaction destination-a-id {:id duplicate-id
                                                                 :preserve-scroll true})
        source-data {:id source-file-id
                     :pages [page-a-id]
                     :pages-index
                     {page-a-id {:id page-a-id
                                 :name "Source"
                                 :objects
                                 {shape-a-id {:id shape-a-id
                                              :type :rect
                                              :interactions [stable-a
                                                             stable-b]}}}}}
        cloned-data {:id cloned-file-id
                     :pages [page-a-id page-b-id]
                     :pages-index
                     {page-a-id {:id page-a-id
                                 :name "Cloned page A"
                                 :objects
                                 {shape-a-id {:id shape-a-id
                                              :type :rect
                                              :interactions [stable-a
                                                             missing]}
                                  shape-b-id {:id shape-b-id
                                              :type :rect
                                              :interactions [duplicate-first]}}}
                      page-b-id {:id page-b-id
                                 :name "Cloned page B"
                                 :objects
                                 {shape-c-id {:id shape-c-id
                                              :type :rect
                                              :interactions [stable-b
                                                             duplicate-second]}}}}}
        cloned-data' (cfm/migrate-data cloned-data "0018-assign-prototype-interaction-ids")
        migrated-a (get-in cloned-data' [:pages-index page-a-id :objects shape-a-id :interactions])
        migrated-b (get-in cloned-data' [:pages-index page-a-id :objects shape-b-id :interactions])
        migrated-c (get-in cloned-data' [:pages-index page-b-id :objects shape-c-id :interactions])
        migrated-interactions (concat migrated-a migrated-b migrated-c)
        migrated-ids (mapv :id migrated-interactions)]
    (t/is (= source-file-id (:id source-data)))
    (t/is (= cloned-file-id (:id cloned-data')))
    (t/is (= stable-a-id (:id (first migrated-a))))
    (t/is (= stable-b-id (:id (first migrated-c))))
    (t/is (= duplicate-id (:id (first migrated-b))))
    (t/is (uuid? (:id (second migrated-a))))
    (t/is (not= duplicate-id (:id (second migrated-c))))
    (t/is (every? uuid? migrated-ids))
    (t/is (apply distinct? migrated-ids))
    (t/is (= (mapv #(dissoc % :id) [stable-a missing])
             (mapv #(dissoc % :id) migrated-a)))
    (t/is (= (mapv #(dissoc % :id) [duplicate-first])
             (mapv #(dissoc % :id) migrated-b)))
    (t/is (= (mapv #(dissoc % :id) [stable-b duplicate-second])
             (mapv #(dissoc % :id) migrated-c)))))
