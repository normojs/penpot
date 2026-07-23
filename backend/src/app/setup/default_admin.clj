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
  already exists, this is a no-op (safe on every restart).

  **Create-only:** changing `PENPOT_DEFAULT_ADMIN_PASSWORD` later does
  **not** update an existing profile password. Rotate passwords via UI
  or `srepl` / admin tooling.

  Concurrent multi-replica first boot: duplicate insert races are treated
  as `:exists` (does not fail Integrant init)."
  (:require
   [app.auth :refer [derive-password]]
   [app.common.exceptions :as ex]
   [app.common.logging :as l]
   [app.common.schema :as sm]
   [app.common.uuid :as uuid]
   [app.config :as cf]
   [app.db :as db]
   [app.rpc.commands.auth :as auth]
   [app.rpc.commands.profile :as profile]
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

(defn- email-already-exists-error?
  [cause]
  (or (and (ex/error? cause)
           (= :email-already-exists (:code (ex-data cause))))
      (let [cause' (ex-cause cause)]
        (and (some? cause')
             (ex/error? cause')
             (= :email-already-exists (:code (ex-data cause')))))))

(defn ensure-default-admin!
  "Create the configured default admin when missing. Returns:
   - `:created` when a new profile was inserted
   - `:exists` when the email already has a profile (including race losers)
   - `:skipped` when bootstrap env is incomplete / invalid"
  [cfg]
  (let [email    (some-> (cf/get :default-admin-email)
                         profile/clean-email
                         str/trim)
        password (cf/get :default-admin-password)
        fullname (or (some-> (cf/get :default-admin-fullname) str/trim)
                     "Administrator")]
    (cond
      (or (str/blank? email) (str/blank? password))
      (do
        (l/inf :hint "default admin bootstrap skipped (set PENPOT_DEFAULT_ADMIN_EMAIL and PENPOT_DEFAULT_ADMIN_PASSWORD to enable)")
        :skipped)

      (not (sm/email-string? email))
      (do
        (l/wrn :hint "default admin bootstrap skipped: PENPOT_DEFAULT_ADMIN_EMAIL is not a valid email"
               :email email)
        :skipped)

      (< (count password) 8)
      (do
        (l/wrn :hint "default admin bootstrap skipped: PENPOT_DEFAULT_ADMIN_PASSWORD must be at least 8 characters")
        :skipped)

      :else
      (do
        (when-not (or (contains? cf/flags :login)
                      (contains? cf/flags :login-with-password))
          (l/wrn :hint "default admin will be created but password login flags are off (enable-login / enable-login-with-password); users cannot sign in with email/password until flags allow it"))

        (db/tx-run! cfg
                    (fn [{:keys [::db/conn] :as cfg}]
                      (if (profile-exists-by-email? conn email)
                        (do
                          (l/inf :hint "default admin already present (password is not updated from env; change via UI if needed)"
                                 :email email)
                          :exists)
                        (try
                          (create-default-admin! cfg
                                                 {:email email
                                                  :password password
                                                  :fullname fullname})
                          (l/inf :hint "default admin profile created"
                                 :email email
                                 :fullname fullname)
                          :created
                          (catch Throwable cause
                            (if (email-already-exists-error? cause)
                              (do
                                (l/inf :hint "default admin already present (concurrent create race)"
                                       :email email)
                                :exists)
                              (throw cause)))))))))))

(defmethod ig/assert-key ::setup/default-admin
  [_ params]
  (assert (db/pool? (::db/pool params)) "expected valid database pool"))

(defmethod ig/init-key ::setup/default-admin
  [_ cfg]
  ;; Depend on ::setup/props (and migrations via props) so schema exists.
  (ensure-default-admin! cfg)
  {})
