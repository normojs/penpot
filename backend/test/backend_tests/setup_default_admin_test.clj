;; This Source Code Form is subject to the terms of the Mozilla Public
;; License, v. 2.0. If a copy of the MPL was not distributed with this
;; file, You can obtain one at http://mozilla.org/MPL/2.0/.
;;
;; Copyright (c) KALEIDOS INC Sucursal en España SL
;;
;; Fork tests: first-deploy default admin bootstrap.

(ns backend-tests.setup-default-admin-test
  (:require
   [app.config :as cf]
   [app.db :as db]
   [app.setup.default-admin :as default-admin]
   [backend-tests.helpers :as th]
   [clojure.test :as t]))

(t/use-fixtures :once th/state-init)
(t/use-fixtures :each th/database-reset)

(defn- with-admin-env
  [email password fullname f]
  (let [orig cf/get]
    (with-redefs [cf/get (fn
                           ([k]
                            (case k
                              :default-admin-email email
                              :default-admin-password password
                              :default-admin-fullname fullname
                              (orig k)))
                           ([k default]
                            (case k
                              :default-admin-email (if (some? email) email default)
                              :default-admin-password (if (some? password) password default)
                              :default-admin-fullname (if (some? fullname) fullname default)
                              (orig k default))))
                  cf/flags (conj (or cf/flags #{}) :login-with-password)]
      (f))))

(t/deftest ensure-default-admin-skipped-when-unset
  (with-admin-env nil nil nil
    (fn []
      (t/is (= :skipped (default-admin/ensure-default-admin! th/*system*))))))

(t/deftest ensure-default-admin-skipped-short-password
  (with-admin-env "admin@example.com" "short" nil
    (fn []
      (t/is (= :skipped (default-admin/ensure-default-admin! th/*system*)))
      (t/is (nil? (db/run! th/*system*
                           (fn [{:keys [::db/conn]}]
                             (db/get* conn :profile {:email "admin@example.com"}))))))))

(t/deftest ensure-default-admin-skipped-invalid-email
  (with-admin-env "not-an-email" "long-enough-password" nil
    (fn []
      (t/is (= :skipped (default-admin/ensure-default-admin! th/*system*))))))

(t/deftest ensure-default-admin-creates-once
  (with-admin-env "admin@example.com" "long-enough-password" "Ops Admin"
    (fn []
      (t/is (= :created (default-admin/ensure-default-admin! th/*system*)))
      (let [row (db/run! th/*system*
                         (fn [{:keys [::db/conn]}]
                           (db/get* conn :profile {:email "admin@example.com"})))]
        (t/is (some? row))
        (t/is (= "Ops Admin" (:fullname row)))
        (t/is (true? (:is-active row)))
        (t/is (false? (:is-demo row)))
        (t/is (some? (:default-team-id row)))
        (t/is (some? (:default-project-id row))))

      ;; second call is create-only (exists)
      (t/is (= :exists (default-admin/ensure-default-admin! th/*system*)))

      ;; password env change does not rewrite hash (create-only)
      (let [pwd1 (db/run! th/*system*
                          (fn [{:keys [::db/conn]}]
                            (:password (db/get* conn :profile {:email "admin@example.com"}))))]
        (with-admin-env "admin@example.com" "a-completely-different-password" "Ops Admin"
          (fn []
            (t/is (= :exists (default-admin/ensure-default-admin! th/*system*)))
            (let [pwd2 (db/run! th/*system*
                                (fn [{:keys [::db/conn]}]
                                  (:password (db/get* conn :profile {:email "admin@example.com"}))))]
              (t/is (= pwd1 pwd2)))))))))

(t/deftest ensure-default-admin-race-is-exists
  ;; Pre-create the email, then force the create path by stubbing private exists?
  ;; so insert hits unique email and is mapped to :exists (not thrown).
  (with-admin-env "race@example.com" "long-enough-password" nil
    (fn []
      (th/create-profile* 99 {:email "race@example.com"
                              :password "long-enough-password"
                              :fullname "Preexisting"
                              :is-active true})
      (with-redefs [app.setup.default-admin/profile-exists-by-email? (fn [_ _] false)]
        (t/is (= :exists (default-admin/ensure-default-admin! th/*system*)))))))
