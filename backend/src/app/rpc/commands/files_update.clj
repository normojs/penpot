;; This Source Code Form is subject to the terms of the Mozilla Public
;; License, v. 2.0. If a copy of the MPL was not distributed with this
;; file, You can obtain one at http://mozilla.org/MPL/2.0/.
;;
;; Copyright (c) KALEIDOS INC Sucursal en España SL

(ns app.rpc.commands.files-update
  (:require
   [app.binfile.common :as bfc]
   [app.common.data :as d]
   [app.common.exceptions :as ex]
   [app.common.features :as cfeat]
   [app.common.files.changes :as cpc]
   [app.common.files.headless :as headless]
   [app.common.files.migrations :as fmg]
   [app.common.files.validate :as val]
   [app.common.logging :as l]
   [app.common.schema :as sm]
   [app.common.time :as ct]
   [app.common.types.color :as ctc]
   [app.common.types.file :as ctf]
   [app.common.uuid :as uuid]
   [app.config :as cf]
   [app.db :as db]
   [app.features.fdata :as fdata]
   [app.features.file-snapshots :as fsnap]
   [app.features.logical-deletion :as ldel]
   [app.http.errors :as errors]
   [app.loggers.audit :as audit]
   [app.loggers.webhooks :as webhooks]
   [app.metrics :as mtx]
   [app.media :as media]
   [app.msgbus :as mbus]
   [app.redis :as rds]
   [app.rpc :as-alias rpc]
   [app.rpc.climit :as climit]
   [app.rpc.commands.files :as files]
   [app.rpc.commands.media :as media-cmd]
   [app.rpc.commands.teams :as teams]
   [app.rpc.doc :as-alias doc]
   [app.rpc.helpers :as rph]
   [app.storage.tmp :as tmp]
   [app.util.blob :as blob]
   [app.util.pointer-map :as pmap]
   [app.util.services :as sv]
   [clojure.set :as set]
   [clojure.string :as str]
   [datoteka.io :as io])
  (:import
   java.util.Base64))

(declare ^:private get-lagged-changes)
(declare ^:private send-notifications!)
(declare ^:private update-file)
(declare ^:private update-file*)
(declare ^:private process-changes-and-validate)
(declare ^:private take-snapshot?)
(declare ^:private invalidate-caches!)

;; PUBLIC API; intended to be used outside of this module
(declare update-file!)
(declare update-file-data!)
(declare persist-file!)
(declare get-file)

;; --- SCHEMA

(def ^:private
  schema:update-file
  [:map {:title "update-file"}
   [:id ::sm/uuid]
   [:session-id ::sm/uuid]
   [:revn {:min 0} ::sm/int]
   [:vern {:min 0} ::sm/int]
   [:features {:optional true} ::cfeat/features]
   [:changes {:optional true} [:vector cpc/schema:change]]
   [:changes-with-metadata {:optional true}
    [:vector [:map
              [:changes [:vector cpc/schema:change]]
              [:hint-origin {:optional true} :keyword]
              [:hint-events {:optional true} [:vector [:string {:max 250}]]]]]]
   [:skip-validate {:optional true} ::sm/boolean]])

(def ^:private
  schema:update-file-result
  [:vector {:title "update-file-result"}
   [:map
    [:changes [:vector cpc/schema:change]]
    [:file-id ::sm/uuid]
    [:id ::sm/uuid]
    [:revn {:min 0} ::sm/int]
    [:session-id ::sm/uuid]]])

(def ^:private
  schema:create-file-page
  [:map {:title "create-file-page"}
   [:id ::sm/uuid]
   [:page-id {:optional true} ::sm/uuid]
   [:name {:optional true} [:string {:max 250}]]
   [:session-id {:optional true} ::sm/uuid]
   [:features {:optional true} ::cfeat/features]])

(def ^:private
  schema:rename-file-page
  [:map {:title "rename-file-page"}
   [:id ::sm/uuid]
   [:page-id ::sm/uuid]
   [:name [:string {:max 250}]]
   [:session-id {:optional true} ::sm/uuid]
   [:features {:optional true} ::cfeat/features]])

(def ^:private
  schema:page-summary
  [:map {:title "PageSummary"}
   [:id ::sm/uuid]
   [:name [:string {:max 250}]]])

(def ^:private
  schema:create-file-page-result
  [:map {:title "create-file-page-result"}
   [:file-id ::sm/uuid]
   [:page schema:page-summary]
   [:revn {:min 0} ::sm/int]
   [:vern {:min 0} ::sm/int]])

(def ^:private
  schema:rename-file-page-result
  [:map {:title "rename-file-page-result"}
   [:file-id ::sm/uuid]
   [:page schema:page-summary]
   [:revn {:min 0} ::sm/int]
   [:vern {:min 0} ::sm/int]])

(def ^:private
  schema:solid-fill
  [:map {:title "HeadlessSolidFill"}
   [:color ctc/schema:hex-color]
   [:opacity {:optional true} [::sm/number {:min 0 :max 1}]]])

(def ^:private
  schema:solid-stroke
  [:map {:title "HeadlessSolidStroke"}
   [:color ctc/schema:hex-color]
   [:opacity {:optional true} [::sm/number {:min 0 :max 1}]]
   [:width {:optional true} [::sm/number {:min 0.01 :max 1000}]]
   [:style {:optional true} [::sm/one-of #{:solid :dotted :dashed}]]
   [:alignment {:optional true} [::sm/one-of #{:center :inner :outer}]]])

(def ^:private
  schema:headless-layout
  [:map {:title "HeadlessShapeLayout"}
   [:type [::sm/one-of #{:none :flex}]]
   [:direction {:optional true} [::sm/one-of #{:row :row-reverse :column :column-reverse}]]
   [:wrap {:optional true} [::sm/one-of #{:wrap :nowrap}]]
   [:align-items {:optional true} [::sm/one-of #{:start :end :center :stretch}]]
   [:justify-content {:optional true}
    [::sm/one-of #{:start :center :end :space-between :space-around :space-evenly :stretch}]]
   [:row-gap {:optional true} [::sm/number {:min 0 :max 10000}]]
   [:column-gap {:optional true} [::sm/number {:min 0 :max 10000}]]
   [:padding {:optional true} [::sm/number {:min 0 :max 10000}]]])

(def ^:private
  schema:create-file-shape
  [:map {:title "create-file-shape"}
   [:id ::sm/uuid]
   [:page-id {:optional true} ::sm/uuid]
   [:shape-id {:optional true} ::sm/uuid]
   [:parent-id {:optional true} ::sm/uuid]
   [:type [::sm/one-of headless/supported-shape-types]]
   [:name {:optional true} [:string {:max 250}]]
   [:x [::sm/number {:min -100000 :max 100000}]]
   [:y [::sm/number {:min -100000 :max 100000}]]
   [:width [::sm/number {:min 0.01 :max 100000}]]
   [:height [::sm/number {:min 0.01 :max 100000}]]
   [:content {:optional true} [:string {:max 10000}]]
   [:fill {:optional true} schema:solid-fill]
   [:stroke {:optional true} schema:solid-stroke]
   [:border-radius {:optional true} [::sm/number {:min 0 :max 10000}]]
   [:font-size {:optional true} [::sm/number {:min 0.01 :max 512}]]
   [:session-id {:optional true} ::sm/uuid]
   [:features {:optional true} ::cfeat/features]])

(def ^:private
  schema:shape-summary
  [:map {:title "HeadlessShapeSummary"}
   [:id ::sm/uuid]
   [:name [:string {:max 250}]]
   [:type [::sm/one-of headless/supported-shape-types]]
   [:page-id ::sm/uuid]
   [:parent-id ::sm/uuid]
   [:frame-id ::sm/uuid]
   [:x ::sm/safe-number]
   [:y ::sm/safe-number]
   [:width ::sm/safe-number]
   [:height ::sm/safe-number]])

(def ^:private
  schema:create-file-shape-result
  [:map {:title "create-file-shape-result"}
   [:file-id ::sm/uuid]
   [:shape schema:shape-summary]
   [:revn {:min 0} ::sm/int]
   [:vern {:min 0} ::sm/int]])

(def ^:private
  schema:create-file-image-shape
  [:map {:title "create-file-image-shape"}
   [:id ::sm/uuid]
   [:page-id {:optional true} ::sm/uuid]
   [:shape-id {:optional true} ::sm/uuid]
   [:parent-id {:optional true} ::sm/uuid]
   [:name {:optional true} [:string {:max 250}]]
   [:x [::sm/number {:min -100000 :max 100000}]]
   [:y [::sm/number {:min -100000 :max 100000}]]
   [:width {:optional true} [::sm/number {:min 0.01 :max 100000}]]
   [:height {:optional true} [::sm/number {:min 0.01 :max 100000}]]
   [:image-base64 [:string {:min 1 :max 20000000}]]
   [:mime-type [:string {:max 120}]]
   [:session-id {:optional true} ::sm/uuid]
   [:features {:optional true} ::cfeat/features]])

(def ^:private
  schema:create-file-image-shape-result
  [:map {:title "create-file-image-shape-result"}
   [:file-id ::sm/uuid]
   [:shape schema:shape-summary]
   [:media ctf/schema:media]
   [:revn {:min 0} ::sm/int]
   [:vern {:min 0} ::sm/int]])

(def ^:private
  schema:update-file-shape
  [:map {:title "update-file-shape"}
   [:id ::sm/uuid]
   [:page-id {:optional true} ::sm/uuid]
   [:shape-id ::sm/uuid]
   [:parent-id {:optional true} ::sm/uuid]
   [:index {:optional true} [::sm/int {:min 0}]]
   [:name {:optional true} [:string {:max 250}]]
   [:x {:optional true} [::sm/number {:min -100000 :max 100000}]]
   [:y {:optional true} [::sm/number {:min -100000 :max 100000}]]
   [:width {:optional true} [::sm/number {:min 0.01 :max 100000}]]
   [:height {:optional true} [::sm/number {:min 0.01 :max 100000}]]
   [:content {:optional true} [:string {:max 10000}]]
   [:fill {:optional true} schema:solid-fill]
   [:fills {:optional true} [:vector schema:solid-fill]]
   [:stroke {:optional true} schema:solid-stroke]
   [:strokes {:optional true} [:vector schema:solid-stroke]]
   [:border-radius {:optional true} [::sm/number {:min 0 :max 10000}]]
   [:r1 {:optional true} [::sm/number {:min 0 :max 10000}]]
   [:r2 {:optional true} [::sm/number {:min 0 :max 10000}]]
   [:r3 {:optional true} [::sm/number {:min 0 :max 10000}]]
   [:r4 {:optional true} [::sm/number {:min 0 :max 10000}]]
   [:font-size {:optional true} [::sm/number {:min 0.01 :max 512}]]
   [:layout {:optional true} schema:headless-layout]
   [:session-id {:optional true} ::sm/uuid]
   [:features {:optional true} ::cfeat/features]])

(def ^:private
  schema:update-file-shape-result
  [:map {:title "update-file-shape-result"}
   [:file-id ::sm/uuid]
   [:shape schema:shape-summary]
   [:revn {:min 0} ::sm/int]
   [:vern {:min 0} ::sm/int]])

(def ^:private
  schema:delete-file-shape
  [:map {:title "delete-file-shape"}
   [:id ::sm/uuid]
   [:page-id {:optional true} ::sm/uuid]
   [:shape-id ::sm/uuid]
   [:session-id {:optional true} ::sm/uuid]
   [:features {:optional true} ::cfeat/features]])

(def ^:private
  schema:delete-file-shape-result
  [:map {:title "delete-file-shape-result"}
   [:file-id ::sm/uuid]
   [:shape schema:shape-summary]
   [:revn {:min 0} ::sm/int]
   [:vern {:min 0} ::sm/int]])

;; --- HELPERS

;; File changes that affect to the library, and must be notified
;; to all clients using it.

(def ^:private library-change-types
  #{:add-color
    :mod-color
    :del-color
    :add-media
    :mod-media
    :del-media
    :add-component
    :mod-component
    :del-component
    :restore-component
    :add-typography
    :mod-typography
    :del-typography})

(def ^:private file-change-types
  #{:add-obj
    :mod-obj
    :del-obj
    :reg-objects
    :mov-objects})

(defn- library-change?
  [{:keys [type] :as change}]
  (or (contains? library-change-types type)
      (contains? file-change-types type)))

(defn- normalize-image-name
  [name]
  (let [name (some-> name str/trim)]
    (if (seq name)
      name
      "Image")))

(defn- strip-base64-data-url
  [image-base64]
  (let [image-base64 (str/trim image-base64)]
    (if (str/starts-with? image-base64 "data:")
      (if-let [idx (str/index-of image-base64 ",")]
        (subs image-base64 (inc idx))
        "")
      image-base64)))

(defn- decode-image-base64
  [image-base64]
  (let [image-base64 (-> image-base64
                         (strip-base64-data-url)
                         (str/replace #"\s+" ""))]
    (when-not (seq image-base64)
      (ex/raise :type :validation
                :code :invalid-image-data
                :hint "Headless image shape creation requires non-empty base64 image data."))
    (try
      (.decode (Base64/getDecoder) ^String image-base64)
      (catch IllegalArgumentException _
        (ex/raise :type :validation
                  :code :invalid-image-data
                  :hint "Headless image shape creation received invalid base64 image data.")))))

(defn- prepare-headless-image-upload
  [{:keys [image-base64 mime-type name]}]
  (let [bytes (decode-image-base64 image-base64)
        path  (tmp/tempfile :prefix "penpot.headless.image.")]
    (io/write* path bytes)
    (-> {:filename (normalize-image-name name)
         :path path
         :mtype mime-type
         :size (alength ^bytes bytes)}
        (media/validate-media-type!)
        (media/validate-media-size!))))

;; If features are specified from params and the final feature
;; set is different than the persisted one, update it on the
;; database.

(sv/defmethod ::update-file
  {::climit/id [[:update-file/by-profile ::rpc/profile-id]
                [:update-file/global]]

   ::webhooks/event? true
   ::webhooks/batch-timeout (ct/duration "2m")
   ::webhooks/batch-key (webhooks/key-fn ::rpc/profile-id :id)

   ::sm/params schema:update-file
   ::sm/result schema:update-file-result
   ::doc/module :files
   ::doc/added "1.17"
   ::db/transaction true}
  [{:keys [::mtx/metrics ::db/conn] :as cfg}
   {:keys [::rpc/profile-id id changes changes-with-metadata] :as params}]

  (files/check-edition-permissions! conn profile-id id)
  (db/xact-lock! conn id)

  (let [file     (get-file cfg id)
        team     (teams/get-team conn
                                 :profile-id profile-id
                                 :team-id (:team-id file))

        features (-> (cfeat/get-team-enabled-features cf/flags team)
                     (cfeat/check-client-features! (:features params))
                     (cfeat/check-file-features! (:features file)))

        changes  (if changes-with-metadata
                   (->> changes-with-metadata (mapcat :changes) vec)
                   (vec changes))

        params   (-> params
                     (assoc :profile-id profile-id)
                     (assoc :features (set/difference features cfeat/frontend-only-features))
                     (assoc :team team)
                     (assoc :file file)
                     (assoc :changes changes))

        cfg      (assoc cfg ::timestamp (ct/now))

        tpoint   (ct/tpoint)]

    (when (not= (:vern params)
                (:vern file))
      (ex/raise :type :validation
                :code :vern-conflict
                :hint "A different version has been restored for the file."
                :context {:incoming-revn (:revn params)
                          :stored-revn (:revn file)}))

    (when (> (:revn params)
             (:revn file))
      (ex/raise :type :validation
                :code :revn-conflict
                :hint "The incoming revision number is greater that stored version."
                :context {:incoming-revn (:revn params)
                          :stored-revn (:revn file)}))

    ;; When newly computed features does not match exactly with the
    ;; features defined on team row, we update it
    (when-let [features (-> features
                            (set/difference (:features team))
                            (set/difference cfeat/no-team-inheritable-features)
                            (not-empty))]
      (let [features (-> features
                         (set/union (:features team))
                         (set/difference cfeat/no-team-inheritable-features)
                         (into-array))]
        (db/update! conn :team
                    {:features features}
                    {:id (:id team)}
                    {::db/return-keys false})))


    (mtx/run! metrics {:id :update-file-changes :inc (count changes)})

    (binding [l/*context* (some-> (meta params)
                                  (get :app.http/request)
                                  (errors/request->context))]
      (-> (update-file* cfg params)
          (rph/with-defer #(let [elapsed (tpoint)]
                             (l/trace :hint "update-file" :time (ct/format-duration elapsed))))))))

(sv/defmethod ::create-file-page
  {::climit/id [[:update-file/by-profile ::rpc/profile-id]
                [:update-file/global]]

   ::webhooks/event? true
   ::webhooks/batch-timeout (ct/duration "2m")
   ::webhooks/batch-key (webhooks/key-fn ::rpc/profile-id :id)

   ::sm/params schema:create-file-page
   ::sm/result schema:create-file-page-result
   ::doc/module :files
   ::doc/added "2.15.4"
   ::db/transaction true}
  [{:keys [::mtx/metrics ::db/conn] :as cfg}
   {:keys [::rpc/profile-id id session-id] :as params}]

  (files/check-edition-permissions! conn profile-id id)
  (db/xact-lock! conn id)

  (let [file         (get-file cfg id)
        team         (teams/get-team conn
                                     :profile-id profile-id
                                     :team-id (:team-id file))
        features     (-> (cfeat/get-team-enabled-features cf/flags team)
                         (cfeat/check-client-features! (:features params))
                         (cfeat/check-file-features! (:features file)))
        page-request (headless/create-page-request (blob/decode (:data file)) params)
        changes      (:changes page-request)
        session-id   (or session-id (uuid/next))
        cfg          (assoc cfg ::timestamp (ct/now))
        update-args  {:id id
                      :revn (:revn file)
                      :vern (:vern file)
                      :file file
                      :team team
                      :features (set/difference features cfeat/frontend-only-features)
                      :changes changes
                      :session-id session-id
                      :profile-id profile-id}]

    (mtx/run! metrics {:id :update-file-changes :inc (count changes)})
    (update-file* cfg update-args)

    (with-meta {:file-id id
                :page (:page page-request)
                :revn (inc (:revn file))
                :vern (:vern file)}
      {::audit/replace-props
       {:id         (:id file)
        :name       (:name file)
        :features   (:features file)
        :project-id (:project-id file)
        :team-id    (:team-id file)}})))

(sv/defmethod ::rename-file-page
  {::climit/id [[:update-file/by-profile ::rpc/profile-id]
                [:update-file/global]]

   ::webhooks/event? true
   ::webhooks/batch-timeout (ct/duration "2m")
   ::webhooks/batch-key (webhooks/key-fn ::rpc/profile-id :id)

   ::sm/params schema:rename-file-page
   ::sm/result schema:rename-file-page-result
   ::doc/module :files
   ::doc/added "2.15.4"
   ::db/transaction true}
  [{:keys [::mtx/metrics ::db/conn] :as cfg}
   {:keys [::rpc/profile-id id session-id] :as params}]

  (files/check-edition-permissions! conn profile-id id)
  (db/xact-lock! conn id)

  (let [file         (get-file cfg id)
        team         (teams/get-team conn
                                     :profile-id profile-id
                                     :team-id (:team-id file))
        features     (-> (cfeat/get-team-enabled-features cf/flags team)
                         (cfeat/check-client-features! (:features params))
                         (cfeat/check-file-features! (:features file)))
        page-request (headless/rename-page-request (blob/decode (:data file)) params)
        changes      (:changes page-request)
        session-id   (or session-id (uuid/next))
        cfg          (assoc cfg ::timestamp (ct/now))
        update-args  {:id id
                      :revn (:revn file)
                      :vern (:vern file)
                      :file file
                      :team team
                      :features (set/difference features cfeat/frontend-only-features)
                      :changes changes
                      :session-id session-id
                      :profile-id profile-id}]

    (mtx/run! metrics {:id :update-file-changes :inc (count changes)})
    (update-file* cfg update-args)

    (with-meta {:file-id id
                :page (:page page-request)
                :revn (inc (:revn file))
                :vern (:vern file)}
      {::audit/replace-props
       {:id         (:id file)
        :name       (:name file)
        :features   (:features file)
        :project-id (:project-id file)
        :team-id    (:team-id file)}})))

(sv/defmethod ::create-file-shape
  {::climit/id [[:update-file/by-profile ::rpc/profile-id]
                [:update-file/global]]

   ::webhooks/event? true
   ::webhooks/batch-timeout (ct/duration "2m")
   ::webhooks/batch-key (webhooks/key-fn ::rpc/profile-id :id)

   ::sm/params schema:create-file-shape
   ::sm/result schema:create-file-shape-result
   ::doc/module :files
   ::doc/added "2.15.4"
   ::db/transaction true}
  [{:keys [::mtx/metrics ::db/conn] :as cfg}
   {:keys [::rpc/profile-id id session-id] :as params}]

  (files/check-edition-permissions! conn profile-id id)
  (db/xact-lock! conn id)

  (let [file          (get-file cfg id)
        team          (teams/get-team conn
                                      :profile-id profile-id
                                      :team-id (:team-id file))
        features      (-> (cfeat/get-team-enabled-features cf/flags team)
                          (cfeat/check-client-features! (:features params))
                          (cfeat/check-file-features! (:features file)))
        shape-request (headless/create-shape-request (blob/decode (:data file)) params)
        changes       (:changes shape-request)
        session-id    (or session-id (uuid/next))
        cfg           (assoc cfg ::timestamp (ct/now))
        update-args   {:id id
                       :revn (:revn file)
                       :vern (:vern file)
                       :file file
                       :team team
                       :features (set/difference features cfeat/frontend-only-features)
                       :changes changes
                       :session-id session-id
                       :profile-id profile-id}]

    (mtx/run! metrics {:id :update-file-changes :inc (count changes)})
    (update-file* cfg update-args)

    (with-meta {:file-id id
                :shape (:shape shape-request)
                :revn (inc (:revn file))
                :vern (:vern file)}
      {::audit/replace-props
       {:id         (:id file)
        :name       (:name file)
        :features   (:features file)
        :project-id (:project-id file)
        :team-id    (:team-id file)}})))

(sv/defmethod ::create-file-image-shape
  {::climit/id [[:update-file/by-profile ::rpc/profile-id]
                [:update-file/global]]

   ::webhooks/event? true
   ::webhooks/batch-timeout (ct/duration "2m")
   ::webhooks/batch-key (webhooks/key-fn ::rpc/profile-id :id)

   ::sm/params schema:create-file-image-shape
   ::sm/result schema:create-file-image-shape-result
   ::doc/module :files
   ::doc/added "2.15.4"
   ::db/transaction true}
  [{:keys [::mtx/metrics ::db/conn] :as cfg}
   {:keys [::rpc/profile-id id session-id] :as params}]

  (files/check-edition-permissions! conn profile-id id)
  (db/xact-lock! conn id)

  (let [file          (get-file cfg id)
        team          (teams/get-team conn
                                      :profile-id profile-id
                                      :team-id (:team-id file))
        features      (-> (cfeat/get-team-enabled-features cf/flags team)
                          (cfeat/check-client-features! (:features params))
                          (cfeat/check-file-features! (:features file)))
        content       (prepare-headless-image-upload params)
        media-object  (media-cmd/create-file-media-object
                       cfg
                       {:file-id id
                        :is-local true
                        :name (normalize-image-name (:name params))
                        :content content})
        shape-request (headless/create-image-shape-request
                       (blob/decode (:data file))
                       (assoc params :media media-object))
        changes       (:changes shape-request)
        session-id    (or session-id (uuid/next))
        cfg           (assoc cfg ::timestamp (ct/now))
        update-args   {:id id
                       :revn (:revn file)
                       :vern (:vern file)
                       :file file
                       :team team
                       :features (set/difference features cfeat/frontend-only-features)
                       :changes changes
                       :session-id session-id
                       :profile-id profile-id}]

    (mtx/run! metrics {:id :update-file-changes :inc (count changes)})
    (update-file* cfg update-args)

    (with-meta {:file-id id
                :shape (:shape shape-request)
                :media (:media shape-request)
                :revn (inc (:revn file))
                :vern (:vern file)}
      {::audit/replace-props
       {:id         (:id file)
        :name       (:name file)
        :features   (:features file)
        :project-id (:project-id file)
        :team-id    (:team-id file)}})))

(sv/defmethod ::update-file-shape
  {::climit/id [[:update-file/by-profile ::rpc/profile-id]
                [:update-file/global]]

   ::webhooks/event? true
   ::webhooks/batch-timeout (ct/duration "2m")
   ::webhooks/batch-key (webhooks/key-fn ::rpc/profile-id :id)

   ::sm/params schema:update-file-shape
   ::sm/result schema:update-file-shape-result
   ::doc/module :files
   ::doc/added "2.15.4"
   ::db/transaction true}
  [{:keys [::mtx/metrics ::db/conn] :as cfg}
   {:keys [::rpc/profile-id id session-id] :as params}]

  (files/check-edition-permissions! conn profile-id id)
  (db/xact-lock! conn id)

  (let [file          (get-file cfg id)
        team          (teams/get-team conn
                                      :profile-id profile-id
                                      :team-id (:team-id file))
        features      (-> (cfeat/get-team-enabled-features cf/flags team)
                          (cfeat/check-client-features! (:features params))
                          (cfeat/check-file-features! (:features file)))
        shape-request (headless/update-shape-request (blob/decode (:data file)) params)
        changes       (:changes shape-request)
        session-id    (or session-id (uuid/next))
        cfg           (assoc cfg ::timestamp (ct/now))
        update-args   {:id id
                       :revn (:revn file)
                       :vern (:vern file)
                       :file file
                       :team team
                       :features (set/difference features cfeat/frontend-only-features)
                       :changes changes
                       :session-id session-id
                       :profile-id profile-id}]

    (when (seq changes)
      (mtx/run! metrics {:id :update-file-changes :inc (count changes)})
      (update-file* cfg update-args))

    (with-meta {:file-id id
                :shape (:shape shape-request)
                :revn (cond-> (:revn file) (seq changes) inc)
                :vern (:vern file)}
      {::audit/replace-props
       {:id         (:id file)
        :name       (:name file)
        :features   (:features file)
        :project-id (:project-id file)
        :team-id    (:team-id file)}})))

(sv/defmethod ::delete-file-shape
  {::climit/id [[:update-file/by-profile ::rpc/profile-id]
                [:update-file/global]]

   ::webhooks/event? true
   ::webhooks/batch-timeout (ct/duration "2m")
   ::webhooks/batch-key (webhooks/key-fn ::rpc/profile-id :id)

   ::sm/params schema:delete-file-shape
   ::sm/result schema:delete-file-shape-result
   ::doc/module :files
   ::doc/added "2.15.4"
   ::db/transaction true}
  [{:keys [::mtx/metrics ::db/conn] :as cfg}
   {:keys [::rpc/profile-id id session-id] :as params}]

  (files/check-edition-permissions! conn profile-id id)
  (db/xact-lock! conn id)

  (let [file          (get-file cfg id)
        team          (teams/get-team conn
                                      :profile-id profile-id
                                      :team-id (:team-id file))
        features      (-> (cfeat/get-team-enabled-features cf/flags team)
                          (cfeat/check-client-features! (:features params))
                          (cfeat/check-file-features! (:features file)))
        shape-request (headless/delete-shape-request (blob/decode (:data file)) params)
        changes       (:changes shape-request)
        session-id    (or session-id (uuid/next))
        cfg           (assoc cfg ::timestamp (ct/now))
        update-args   {:id id
                       :revn (:revn file)
                       :vern (:vern file)
                       :file file
                       :team team
                       :features (set/difference features cfeat/frontend-only-features)
                       :changes changes
                       :session-id session-id
                       :profile-id profile-id}]

    (mtx/run! metrics {:id :update-file-changes :inc (count changes)})
    (update-file* cfg update-args)

    (with-meta {:file-id id
                :shape (:shape shape-request)
                :revn (inc (:revn file))
                :vern (:vern file)}
      {::audit/replace-props
       {:id         (:id file)
        :name       (:name file)
        :features   (:features file)
        :project-id (:project-id file)
        :team-id    (:team-id file)}})))

(defn- update-file*
  "Internal function, part of the update-file process, that encapsulates
  the changes application offload to a separated thread and emit all
  corresponding notifications.

  Follow the inner implementation to `update-file-data!` function.

  Only intended for internal use on this module."
  [{:keys [::db/conn ::timestamp] :as cfg}
   {:keys [profile-id file team features changes session-id skip-validate] :as params}]

  (binding [pmap/*tracked* (pmap/create-tracked)
            pmap/*load-fn* (partial fdata/load-pointer cfg (:id file))]

    (let [file (assoc file :features
                      (-> features
                          (set/difference cfeat/frontend-only-features)
                          (set/union (:features file))))

          ;; We need to preserve the original revn for the response
          revn
          (get file :revn)

          file
          (binding [cfeat/*current*  features
                    cfeat/*previous* (:features file)]
            (update-file-data! cfg file
                               process-changes-and-validate
                               changes skip-validate))

          deleted-at
          (ct/plus timestamp (ct/duration {:hours 1}))]

      (when-let [file (::snapshot file)]
        (let [deleted-at (ct/plus timestamp (ldel/get-deletion-delay team))
              label      (str "internal/snapshot/" revn)]

          (fsnap/create! cfg file
                         {:label label
                          :created-by "system"
                          :deleted-at deleted-at
                          :profile-id profile-id
                          :session-id session-id})))

      ;; Insert change (xlog) with deleted_at in a future data for
      ;; make them automatically eleggible for GC once they expires
      (db/insert! conn :file-change
                  {:id (uuid/next)
                   :session-id session-id
                   :profile-id profile-id
                   :created-at timestamp
                   :updated-at timestamp
                   :deleted-at deleted-at
                   :file-id (:id file)
                   :revn (:revn file)
                   :version (:version file)
                   :features (into-array (:features file))
                   :changes (blob/encode changes)}
                  {::db/return-keys false})

      (persist-file! cfg file)

      (when (contains? cf/flags :redis-cache)
        (invalidate-caches! cfg file))

      ;; Send asynchronous notifications
      (send-notifications! cfg params file)

      (with-meta {:revn revn :lagged (get-lagged-changes conn params)}
        {::audit/replace-props
         {:id         (:id file)
          :name       (:name file)
          :features   (:features file)
          :project-id (:project-id file)
          :team-id    (:team-id file)}}))))

(defn get-file
  "Get not-decoded file, only decodes the features set."
  [cfg id]
  (bfc/get-file cfg id :decode? false :lock-for-share? true))

(defn persist-file!
  "Function responsible of persisting already encoded file. Should be
  used together with `get-file` and `update-file-data!`.

  It also updates the project modified-at attr."
  [{:keys [::db/conn ::timestamp] :as cfg} file]
  (let [;; The timestamp can be nil because this function is also
        ;; intended to be used outside of this module
        modified-at
        (or timestamp (ct/now))

        file
        (-> file
            (dissoc ::snapshot)
            (assoc :modified-at modified-at)
            (assoc :has-media-trimmed false))]

    (db/update! conn :project
                {:modified-at modified-at}
                {:id (:project-id file)}
                {::db/return-keys false})

    (bfc/update-file! cfg file)))

(defn- invalidate-caches!
  [cfg {:keys [id] :as file}]
  (rds/run! cfg (fn [{:keys [::rds/conn]}]
                  (let [key (str files/file-summary-cache-key-prefix id)]
                    (rds/del conn key)))))

(defn- attach-snapshot
  "Attach snapshot data to the file. This should be called before the
  upcoming file operations are applied to the file."
  [cfg migrated? file]
  (let [snapshot (if migrated? file (fdata/realize cfg file))]
    (assoc file ::snapshot snapshot)))

(defn- update-file-data!
  "Perform a file data transformation in with all update context setup.

  This function expected not-decoded file and transformation function. Returns
  an encoded file.

  This function is not responsible of saving the file. It only saves
  fdata/pointer-map modified fragments."

  [cfg {:keys [id] :as file} update-fn & args]
  (let [file (update file :data (fn [data]
                                  (-> data
                                      (blob/decode)
                                      (assoc :id id))))
        libs (delay (bfc/get-resolved-file-libraries cfg file))

        need-migration?
        (fmg/need-migration? file)

        take-snapshot?
        (take-snapshot? file)

        ;; For avoid unnecesary overhead of creating multiple
        ;; pointers and handly internally with objects map in their
        ;; worst case (when probably all shapes and all pointers
        ;; will be readed in any case), we just realize/resolve them
        ;; before applying the migration to the file
        file
        (cond-> file
          ;; need-migration?
          ;; (->> (fdata/realize cfg))

          need-migration?
          (fmg/migrate-file libs)

          take-snapshot?
          (->> (attach-snapshot cfg need-migration?)))]

    (apply update-fn cfg file args)))

(defn- soft-validate-file-schema!
  [file]
  (try
    (val/validate-file-schema! file)
    (catch Throwable cause
      (l/error :hint "file schema validation error" :cause cause))))

(defn- soft-validate-file!
  [file libs]
  (try
    (val/validate-file! file libs)
    (catch Throwable cause
      (l/error :hint "file validation error"
               :cause cause))))


(defn- process-changes-and-validate
  [cfg file changes skip-validate]
  (let [;; WARNING: this ruins performance; maybe we need to find
        ;; some other way to do general validation
        libs
        (when (and (or (contains? cf/flags :file-validation)
                       (contains? cf/flags :soft-file-validation))
                   (not skip-validate))
          (bfc/get-resolved-file-libraries cfg file))

        ;; The main purpose of this atom is provide a contextual state
        ;; for the changes subsystem where optionally some hints can
        ;; be provided for the changes processing. Right now we are
        ;; using it for notify about the existence of media refs when
        ;; a new shape is added.
        state
        (atom {})

        file
        (binding [cpc/*state* state]
          (-> (files/check-version! file)
              (update :revn inc)
              (update :data cpc/process-changes changes)
              (update :data d/without-nils)))

        file
        (if-let [media-refs (-> @state :media-refs not-empty)]
          (bfc/update-media-references! cfg file media-refs)
          file)]

    (binding [pmap/*tracked* nil]
      (when (contains? cf/flags :soft-file-validation)
        (soft-validate-file! file libs))

      (when (contains? cf/flags :soft-file-schema-validation)
        (soft-validate-file-schema! file))

      (when (and (contains? cf/flags :file-validation)
                 (not skip-validate))
        (val/validate-file! file libs))

      (when (and (contains? cf/flags :file-schema-validation)
                 (not skip-validate))
        (val/validate-file-schema! file)))

    file))

(defn- take-snapshot?
  "Defines the rule when file `data` snapshot should be saved."
  [{:keys [revn modified-at] :as file}]
  (when (contains? cf/flags :auto-file-snapshot)
    (let [freq    (or (cf/get :auto-file-snapshot-every) 20)
          timeout (or (cf/get :auto-file-snapshot-timeout)
                      (ct/duration {:hours 1}))]

      (or (= 1 freq)
          (zero? (mod revn freq))
          (> (inst-ms (ct/diff modified-at (ct/now)))
             (inst-ms timeout))))))

(def ^:private sql:lagged-changes
  "select s.id, s.revn, s.file_id,
          s.session_id, s.changes
     from file_change as s
    where s.file_id = ?
      and s.revn > ?
    order by s.created_at asc")

(defn- get-lagged-changes
  [conn {:keys [id revn] :as params}]
  (->> (db/exec! conn [sql:lagged-changes id revn])
       (filter :changes)
       (mapv (fn [row]
               (update row :changes blob/decode)))))

(defn- send-notifications!
  [cfg {:keys [team changes session-id] :as params} file]
  (let [lchanges (filter library-change? changes)
        msgbus   (::mbus/msgbus cfg)]

    (mbus/pub! msgbus
               :topic (:id file)
               :message {:type :file-change
                         :profile-id (:profile-id params)
                         :file-id (:id file)
                         :session-id (:session-id params)
                         :revn (:revn file)
                         :vern (:vern file)
                         :changes changes})

    (when (and (:is-shared file) (seq lchanges))
      (mbus/pub! msgbus
                 :topic (:id team)
                 :message {:type :library-change
                           :profile-id (:profile-id params)
                           :file-id (:id file)
                           :session-id session-id
                           :revn (:revn file)
                           :modified-at (ct/now)
                           :changes lchanges}))))
