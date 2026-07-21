;; This Source Code Form is subject to the terms of the Mozilla Public
;; License, v. 2.0. If a copy of the MPL was not distributed with this
;; file, You can obtain one at http://mozilla.org/MPL/2.0/.
;;
;; Copyright (c) KALEIDOS INC Sucursal en España SL
;;
;; Fork extension: first-deploy default admin bootstrap.

(ns app.setup.default-admin
  "Idempotent bootstrap of a default login profile on first deploy.

  Enabled only when both `PENPOT_DEFAULT_ADMIN_EMAIL` and
  `PENPOT_DEFAULT_ADMIN_PASSWORD` are set. If a profile with that email
  already exists, this is a no-op (safe on every restart)."
  (:require
   [app.auth :refer [derive-password]]
   [app.common.logging :as l]
   [app.common.uuid :as uuid]
   [app.config :as cf]
   [app.db :as db]
   [app.rpc.commands.auth :as auth]
   [app.setup :as-alias setup]
   [cuerdas.core :as str]
   [integrant.core :as ig]))

(defn- profile-exists-by-email?
  [conn email]
  (some? (db/get* conn :profile {:email email :deleted-at nil}
                  {::db/remove-deleted false})))

(defn- create-default-admin!
  [{:keys [::db/conn] :as cfg} {:keys [email password fullname]}]
  (let [params {:id (uuid/next)
                :email email
                :fullname fullname
                :is-active true
                :is-demo false
                :password (derive-password password)
                :props {}}
        profile (auth/create-profile cfg params)]
    ;; create-profile-rels expects a connection (same call pattern as srepl CLI).
    (auth/create-profile-rels conn profile)))

(defn ensure-default-admin!
  "Create the configured default admin when missing. Returns:
   - `:created` when a new profile was inserted
   - `:exists` when the email already has a profile
   - `:skipped` when bootstrap env is incomplete"
  [cfg]
  (let [email    (some-> (cf/get :default-admin-email) str/lower str/trim)
        password (cf/get :default-admin-password)
        fullname (or (some-> (cf/get :default-admin-fullname) str/trim)
                     "Administrator")]
    (cond
      (or (str/blank? email) (str/blank? password))
      (do
        (l/inf :hint "default admin bootstrap skipped (set PENPOT_DEFAULT_ADMIN_EMAIL and PENPOT_DEFAULT_ADMIN_PASSWORD to enable)")
        :skipped)

      (< (count password) 8)
      (do
        (l/wrn :hint "default admin bootstrap skipped: PENPOT_DEFAULT_ADMIN_PASSWORD must be at least 8 characters")
        :skipped)

      :else
      (db/tx-run! cfg
                  (fn [{:keys [::db/conn] :as cfg}]
                    (if (profile-exists-by-email? conn email)
                      (do
                        (l/inf :hint "default admin already present"
                               :email email)
                        :exists)
                      (do
                        (create-default-admin! cfg
                                               {:email email
                                                :password password
                                                :fullname fullname})
                        (l/inf :hint "default admin profile created"
                               :email email
                               :fullname fullname)
                        :created)))))))

(defmethod ig/assert-key ::setup/default-admin
  [_ params]
  (assert (db/pool? (::db/pool params)) "expected valid database pool"))

(defmethod ig/init-key ::setup/default-admin
  [_ cfg]
  ;; Depend on ::setup/props (and migrations via props) so schema exists.
  (ensure-default-admin! cfg)
  {})
