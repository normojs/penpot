;; This Source Code Form is subject to the terms of the Mozilla Public
;; License, v. 2.0. If a copy of the MPL was not distributed with this
;; file, You can obtain one at http://mozilla.org/MPL/2.0/.
;;
;; Copyright (c) KALEIDOS INC Sucursal en España SL

(ns app.setup.templates
  "A service/module that is responsible for download, load & internally
  expose a set of builtin penpot file templates."
  (:require
   [app.common.data :as d]
   [app.common.data.macros :as dm]
   [app.common.exceptions :as ex]
   [app.common.logging :as l]
   [app.common.schema :as sm]
   [app.http.client :as http]
   [app.setup :as-alias setup]
   [clojure.edn :as edn]
   [clojure.java.io :as io]
   [cuerdas.core :as str]
   [datoteka.fs :as fs]
   [integrant.core :as ig]))

(def ^:private schema:template
  [:map {:title "Template"}
   [:id ::sm/word-string]
   [:name ::sm/word-string]
   [:file-uri ::sm/word-string]])

(def ^:private schema:templates
  [:vector schema:template])

(def check-templates!
  (sm/check-fn schema:templates
               :code :invalid-templates
               :hint "invalid templates"))

;; Bound the time we wait on CDN / object-storage for a single kit.
(def ^:private template-download-timeout-ms 120000)

(defmethod ig/init-key ::setup/templates
  [_ _]
  (let [templates (-> "app/onboarding.edn" io/resource slurp edn/read-string)
        templates (check-templates! templates)
        dest      (fs/join fs/*cwd* "builtin-templates")]

    (doseq [{:keys [id path] :as template} templates]
      (let [path (or path (fs/join dest id))]
        (if (fs/exists? path)
          (l/dbg :hint "template file" :id id :state "present" :path (dm/str path))
          (l/dbg :hint "template file" :id id :state "absent"))))

    templates))

(defn- raise-download-error!
  [uri cause hint]
  (ex/raise :type :internal
            :code :unable-to-download-template
            :hint (str/ffmt "unable to download template from '%': %" uri hint)
            :cause cause))

(defn get-template-stream
  [cfg template-id]
  (when-let [template (d/seek #(= (:id %) template-id)
                              (::setup/templates cfg))]
    (let [dest (fs/join fs/*cwd* "builtin-templates")
          path (or (:path template) (fs/join dest template-id))
          uri  (:file-uri template)]

      (if (fs/exists? path)
        (io/input-stream path)
        ;; Single-file download only (never clone/snapshot a whole git repo).
        ;; :file-uri points at one kit binary (e.g. ModelScope resolve URL or a
        ;; static CDN). Shared HTTP client has follow-redirects disabled, so
        ;; follow 3xx explicitly for CDNs / object storage.
        (let [resp (try
                     (http/req-with-redirects cfg
                                              {:method :get
                                               :uri uri
                                               :timeout template-download-timeout-ms}
                                              {:response-type :input-stream
                                               :sync? true})
                     (catch java.net.ConnectException cause
                       (raise-download-error! uri cause "connection refused or host unreachable"))
                     (catch java.net.http.HttpConnectTimeoutException cause
                       (raise-download-error! uri cause "connection timeout"))
                     (catch java.net.http.HttpTimeoutException cause
                       (raise-download-error! uri cause "request timeout"))
                     (catch java.io.IOException cause
                       (raise-download-error! uri cause "I/O error")))]
          (when-not (= 200 (:status resp))
            (ex/raise :type :internal
                      :code :unexpected-status-code
                      :hint (str "unable to download template, recevied status " (:status resp)
                                 " from " uri)))

          (io/input-stream (:body resp)))))))
