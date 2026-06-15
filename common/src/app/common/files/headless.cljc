;; This Source Code Form is subject to the terms of the Mozilla Public
;; License, v. 2.0. If a copy of the MPL was not distributed with this
;; file, You can obtain one at http://mozilla.org/MPL/2.0/.
;;
;; Copyright (c) KALEIDOS INC Sucursal en España SL

(ns app.common.files.headless
  (:require
   [app.common.data.macros :as dm]
   [app.common.exceptions :as ex]
   [app.common.files.helpers :as cfh]
   [app.common.types.shape :as cts]
   [app.common.types.shape.layout :as ctsl]
   [app.common.types.text :as cttx]
   [app.common.uuid :as uuid]
   [cuerdas.core :as str]))

(def supported-shape-types
  #{:frame :rect :text})

(defn page-summary
  [file-data page-id]
  (when-let [page (dm/get-in file-data [:pages-index page-id])]
    {:id (:id page)
     :name (:name page)}))

(defn page-summaries
  [file-data]
  (->> (:pages file-data)
       (keep #(page-summary file-data %))
       (vec)))

(defn next-page-name
  [file-data]
  (str "Page " (inc (count (:pages file-data)))))

(defn normalize-page-name
  [file-data name]
  (let [name (some-> name str/trim)]
    (if (seq name)
      name
      (next-page-name file-data))))

(defn- normalize-updated-page-name
  [name]
  (let [name (some-> name str/trim)]
    (when-not (seq name)
      (ex/raise :type :validation
                :code :page-name-required
                :hint "Headless page rename requires a non-empty name."))
    name))

(defn create-page-request
  [file-data {:keys [page-id name]}]
  (let [page-id (or page-id (uuid/next))
        name    (normalize-page-name file-data name)
        page    {:id page-id :name name}]
    {:page page
     :changes [{:type :add-page
                :id page-id
                :name name}]}))

(defn shape-summary
  [shape page-id]
  {:id (:id shape)
   :name (:name shape)
   :type (:type shape)
   :page-id page-id
   :parent-id (:parent-id shape)
   :frame-id (:frame-id shape)
   :x (:x shape)
   :y (:y shape)
   :width (:width shape)
   :height (:height shape)})

(defn- default-shape-name
  [type]
  (case type
    :frame "Board"
    :rect "Rectangle"
    :text "Text"))

(def ^:private default-image-shape-name
  "Image")

(defn normalize-shape-name
  [type name]
  (let [name (some-> name str/trim)]
    (if (seq name)
      name
      (default-shape-name type))))

(defn- normalize-image-shape-name
  [name]
  (let [name (some-> name str/trim)]
    (if (seq name)
      name
      default-image-shape-name)))

(defn- normalize-updated-shape-name
  [name]
  (let [name (some-> name str/trim)]
    (when-not (seq name)
      (ex/raise :type :validation
                :code :shape-name-required
                :hint "Headless shape updates require a non-empty name."))
    name))

(defn- require-page
  [file-data page-id]
  (let [page-id (or page-id (first (:pages file-data)))
        page    (dm/get-in file-data [:pages-index page-id])]
    (when-not page
      (ex/raise :type :validation
                :code :page-not-found
                :hint "The target page does not exist."
                :page-id page-id))
    [page-id page]))

(defn rename-page-request
  [file-data {:keys [page-id name]}]
  (let [[page-id _page] (require-page file-data page-id)
        name            (normalize-updated-page-name name)]
    {:page {:id page-id :name name}
     :changes [{:type :mod-page
                :id page-id
                :name name}]}))

(defn- require-shape
  [file-data page-id shape-id]
  (letfn [(shape-entry [page-id]
            (when-let [page (dm/get-in file-data [:pages-index page-id])]
              (when-let [shape (dm/get-in page [:objects shape-id])]
                [page-id page shape])))]
    (let [entry (if page-id
                  (let [[page-id page] (require-page file-data page-id)]
                    (when-let [shape (dm/get-in page [:objects shape-id])]
                      [page-id page shape]))
                  (some shape-entry (:pages file-data)))]
      (when-not entry
        (ex/raise :type :validation
                  :code :shape-not-found
                  :hint "The target shape does not exist."
                  :page-id page-id
                  :shape-id shape-id))
      entry)))

(defn- require-supported-shape
  [file-data page-id shape-id]
  (let [[page-id page shape] (require-shape file-data page-id shape-id)]
    (when (= shape-id uuid/zero)
      (ex/raise :type :validation
                :code :unsupported-root-shape
                :hint "Headless shape operations cannot target the root shape."
                :shape-id shape-id))
    (when-not (contains? supported-shape-types (:type shape))
      (ex/raise :type :validation
                :code :unsupported-shape-type
                :hint "Headless shape operations support frame, rect, and text shapes."
                :shape-type (:type shape)
                :shape-id shape-id))
    [page-id page shape]))

(defn- require-frame-parent
  [objects type parent-id]
  (let [parent-id (or parent-id uuid/zero)
        parent    (get objects parent-id)]
    (when-not parent
      (ex/raise :type :validation
                :code :parent-shape-not-found
                :hint "The target parent shape does not exist."
                :parent-id parent-id))
    (when-not (cfh/frame-shape? parent)
      (ex/raise :type :validation
                :code :unsupported-parent-shape
                :hint "Headless shape creation currently supports frame parents only."
                :parent-id parent-id
                :parent-type (:type parent)))
    (when (and (= type :frame)
               (not= parent-id uuid/zero))
      (ex/raise :type :validation
                :code :unsupported-frame-parent
                :hint "Headless frame creation currently supports top-level frames only."
                :parent-id parent-id))
    parent-id))

(defn- solid-fill
  [{:keys [color opacity]}]
  {:fill-color color
   :fill-opacity (or opacity 1)})

(defn- solid-stroke
  [{:keys [color opacity width style alignment]}]
  {:stroke-color color
   :stroke-opacity (or opacity 1)
   :stroke-width (or width 1)
   :stroke-style (or style :solid)
   :stroke-alignment (or alignment :center)})

(defn- solid-fills
  [fills]
  (mapv solid-fill fills))

(defn- solid-strokes
  [strokes]
  (mapv solid-stroke strokes))

(defn- apply-border-radius
  [shape border-radius]
  (cond-> shape
    (some? border-radius)
    (assoc :r1 border-radius
           :r2 border-radius
           :r3 border-radius
           :r4 border-radius)))

(def ^:private radius-attrs
  [:r1 :r2 :r3 :r4])

(defn- apply-corner-radii
  [shape params]
  (reduce (fn [shape attr]
            (cond-> shape
              (contains? params attr)
              (assoc attr (get params attr))))
          shape
          radius-attrs))

(defn- apply-text-content
  [shape {:keys [content font-size fill]}]
  (let [content (some-> content str/trim)]
    (when-not (seq content)
      (ex/raise :type :validation
                :code :text-content-required
                :hint "Headless text shape creation requires non-empty content."))
    (let [styles (cond-> {}
                   (some? font-size)
                   (assoc :font-size (str font-size))

                   (some? fill)
                   (assoc :fills [(solid-fill fill)]))]
      (assoc shape :content (apply cttx/change-text (:content shape) content (mapcat identity styles))))))

(def ^:private geometry-attrs
  [:x :y :width :height])

(def ^:private layout-container-attrs
  [:layout
   :layout-flex-dir
   :layout-gap
   :layout-gap-type
   :layout-wrap-type
   :layout-padding-type
   :layout-padding
   :layout-justify-content
   :layout-justify-items
   :layout-align-content
   :layout-align-items
   :layout-grid-dir
   :layout-grid-rows
   :layout-grid-columns
   :layout-grid-cells])

(def ^:private flex-layout-defaults
  {:layout                 :flex
   :layout-flex-dir        :row
   :layout-gap-type        :multiple
   :layout-gap             {:row-gap 0 :column-gap 0}
   :layout-align-items     :start
   :layout-justify-content :start
   :layout-align-content   :stretch
   :layout-wrap-type       :nowrap
   :layout-padding-type    :simple
   :layout-padding         {:p1 0 :p2 0 :p3 0 :p4 0}})

(def ^:private operation-attrs
  (into [:name
         :x
         :y
         :width
         :height
         :selrect
         :points
         :fills
         :strokes
         :r1
         :r2
         :r3
         :r4
         :content]
        layout-container-attrs))

(def ^:private update-attrs
  [:name
   :x
   :y
   :width
   :height
   :fill
   :fills
   :stroke
   :strokes
   :border-radius
   :r1
   :r2
   :r3
   :r4
   :parent-id
   :content
   :font-size
   :layout])

(defn- requested?
  [params attrs]
  (some #(contains? params %) attrs))

(defn- apply-geometry-update
  [shape params]
  (if-not (requested? params geometry-attrs)
    shape
    (let [shape (reduce (fn [shape attr]
                          (cond-> shape
                            (contains? params attr)
                            (assoc attr (get params attr))))
                        shape
                        geometry-attrs)]
      (-> shape
          (dissoc :selrect :points)
          (cts/setup-shape)))))

(defn- apply-text-update
  [shape {:keys [content font-size fill fills] :as params}]
  (if (= :text (:type shape))
    (if-not (requested? params [:content :font-size :fill :fills])
      shape
      (let [content (if (contains? params :content)
                      (some-> content str/trim)
                      (cttx/content->text (:content shape)))]
        (when-not (seq content)
          (ex/raise :type :validation
                    :code :text-content-required
                    :hint "Headless text shape updates require non-empty content."))
        (let [styles (cond-> {}
                       (some? font-size)
                       (assoc :font-size (str font-size))

                       (contains? params :fills)
                       (assoc :fills (solid-fills fills))

                       (and (not (contains? params :fills)) (some? fill))
                       (assoc :fills [(solid-fill fill)]))]
          (assoc shape :content (apply cttx/change-text (:content shape) content (mapcat identity styles))))))
    (do
      (when (requested? params [:content :font-size])
        (ex/raise :type :validation
                  :code :unsupported-text-update
                  :hint "Only text shapes support content and font-size updates."
                  :shape-id (:id shape)
                  :shape-type (:type shape)))
      shape)))

(defn- apply-shape-style-update
  [shape {:keys [fill fills stroke strokes border-radius] :as params}]
  (cond-> shape
    (and (contains? params :fills) (not= (:type shape) :text))
    (assoc :fills (solid-fills fills))

    (and (not (contains? params :fills)) (some? fill) (not= (:type shape) :text))
    (assoc :fills [(solid-fill fill)])

    (contains? params :strokes)
    (assoc :strokes (solid-strokes strokes))

    (and (not (contains? params :strokes)) (some? stroke))
    (assoc :strokes [(solid-stroke stroke)])

    (some? border-radius)
    (apply-border-radius border-radius)

    (requested? params radius-attrs)
    (apply-corner-radii params)))

(def ^:private missing-layout-value ::missing-layout-value)

(defn- normalize-layout-keyword
  [value]
  (cond
    (keyword? value) value
    (string? value) (keyword value)
    :else value))

(defn- layout-param
  [layout & keys]
  (reduce (fn [value key]
            (if (contains? layout key)
              (reduced (get layout key))
              value))
          missing-layout-value
          keys))

(defn- layout-keyword
  [layout default allowed code hint keys]
  (let [value (apply layout-param layout keys)]
    (if (= missing-layout-value value)
      default
      (let [value (normalize-layout-keyword value)]
        (when-not (contains? allowed value)
          (ex/raise :type :validation
                    :code code
                    :hint hint
                    :value value))
        value))))

(defn- layout-number
  [layout default keys]
  (let [value (apply layout-param layout keys)]
    (if (= missing-layout-value value)
      default
      value)))

(defn- remove-layout-container-data
  [shape]
  (reduce dissoc shape layout-container-attrs))

(defn- require-layout-frame
  [shape]
  (when-not (cfh/frame-shape? shape)
    (ex/raise :type :validation
              :code :unsupported-layout-shape
              :hint "Headless layout updates currently support frame shapes only."
              :shape-id (:id shape)
              :shape-type (:type shape))))

(defn- flex-layout-base
  [shape]
  (if (= :flex (:layout shape))
    (merge flex-layout-defaults (select-keys shape layout-container-attrs))
    flex-layout-defaults))

(defn- apply-flex-layout-update
  [shape layout]
  (let [base    (flex-layout-base shape)
        row-gap (layout-number layout
                               (get-in base [:layout-gap :row-gap])
                               [:row-gap :rowGap])
        col-gap (layout-number layout
                               (get-in base [:layout-gap :column-gap])
                               [:column-gap :columnGap])
        padding (layout-number layout (get-in base [:layout-padding :p1]) [:padding])
        updated (assoc base
                       :layout :flex
                       :layout-flex-dir
                       (layout-keyword layout (:layout-flex-dir base) ctsl/flex-direction-types
                                       :unsupported-layout-direction
                                       "Unsupported flex layout direction."
                                       [:direction])
                       :layout-wrap-type
                       (layout-keyword layout (:layout-wrap-type base) ctsl/wrap-types
                                       :unsupported-layout-wrap
                                       "Unsupported flex layout wrap value."
                                       [:wrap])
                       :layout-align-items
                       (layout-keyword layout (:layout-align-items base) ctsl/align-items-types
                                       :unsupported-layout-align-items
                                       "Unsupported flex layout align-items value."
                                       [:align-items :alignItems])
                       :layout-justify-content
                       (layout-keyword layout (:layout-justify-content base) ctsl/justify-content-types
                                       :unsupported-layout-justify-content
                                       "Unsupported flex layout justify-content value."
                                       [:justify-content :justifyContent])
                       :layout-align-content (:layout-align-content base)
                       :layout-gap-type :multiple
                       :layout-gap {:row-gap row-gap :column-gap col-gap}
                       :layout-padding-type :simple
                       :layout-padding {:p1 padding :p2 padding :p3 padding :p4 padding})]
    (merge (remove-layout-container-data shape) updated)))

(defn- apply-layout-update
  [shape {:keys [layout] :as params}]
  (if-not (contains? params :layout)
    shape
    (do
      (when-not (map? layout)
        (ex/raise :type :validation
                  :code :layout-required
                  :hint "Headless layout updates require a layout map."))
      (require-layout-frame shape)
      (let [layout-type (normalize-layout-keyword (:type layout))]
        (case layout-type
          :none
          (remove-layout-container-data shape)

          :flex
          (apply-flex-layout-update shape layout)

          (ex/raise :type :validation
                    :code :unsupported-layout-type
                    :hint "Headless backend layout updates currently support none and flex only."
                    :layout-type layout-type
                    :shape-id (:id shape)))))))

(defn- apply-shape-update
  [shape {:keys [name] :as params}]
  (-> shape
      (cond-> (contains? params :name)
        (assoc :name (normalize-updated-shape-name name)))
      (apply-geometry-update params)
      (apply-shape-style-update params)
      (apply-layout-update params)
      (apply-text-update params)
      (cts/check-shape)))

(defn- shape-update-operations
  [shape updated-shape]
  (into []
        (keep (fn [attr]
                (let [old-val (get shape attr)
                      new-val (get updated-shape attr)]
                  (when (not= old-val new-val)
                    {:type :set
                     :attr attr
                     :val new-val}))))
        operation-attrs))

(defn- descendant-of?
  [objects root-id target-id]
  (some (fn [child-id]
          (or (= child-id target-id)
              (descendant-of? objects child-id target-id)))
        (get-in objects [root-id :shapes])))

(defn- require-move-parent
  [objects shape parent-id]
  (let [parent-id (or parent-id uuid/zero)
        parent    (get objects parent-id)]
    (when-not parent
      (ex/raise :type :validation
                :code :parent-shape-not-found
                :hint "The target parent shape does not exist."
                :parent-id parent-id))
    (when-not (cfh/frame-shape? parent)
      (ex/raise :type :validation
                :code :unsupported-parent-shape
                :hint "Headless shape updates currently support frame parents only."
                :parent-id parent-id
                :parent-type (:type parent)))
    (when (and (= :frame (:type shape))
               (not= parent-id uuid/zero))
      (ex/raise :type :validation
                :code :unsupported-frame-parent
                :hint "Headless frame updates currently support top-level frames only."
                :parent-id parent-id))
    (when (or (= (:id shape) parent-id)
              (descendant-of? objects (:id shape) parent-id))
      (ex/raise :type :validation
                :code :invalid-parent-shape
                :hint "A shape cannot be moved into itself or one of its descendants."
                :shape-id (:id shape)
                :parent-id parent-id))
    parent))

(defn- frame-id-for-parent
  [parent]
  (if (cfh/frame-shape? parent)
    (:id parent)
    (:frame-id parent)))

(defn- shape-move-change
  [objects shape {:keys [parent-id index] :as params}]
  (when (and (contains? params :index)
             (not (contains? params :parent-id)))
    (ex/raise :type :validation
              :code :parent-id-required
              :hint "Headless shape hierarchy updates require parent-id when index is provided."
              :shape-id (:id shape)))
  (when (contains? params :parent-id)
    (let [parent    (require-move-parent objects shape parent-id)
          parent-id (:id parent)]
      (when (not= (:parent-id shape) parent-id)
        (cond-> {:type :mov-objects
                 :parent-id parent-id
                 :shapes [(:id shape)]
                 :ignore-touched true}
          (contains? params :index)
          (assoc :index index))))))

(defn- frame-id-for
  [type parent-id]
  (if (= type :frame)
    uuid/zero
    parent-id))

(defn- create-shape
  [{:keys [type shape-id parent-id name x y width height fill stroke border-radius] :as params}]
  (let [frame-id (frame-id-for type parent-id)
        shape    (cond-> (cts/setup-shape
                          {:id (or shape-id (uuid/next))
                           :type type
                           :parent-id parent-id
                           :frame-id frame-id
                           :name (normalize-shape-name type name)
                           :x x
                           :y y
                           :width width
                           :height height})
                   (and (some? fill) (not= type :text))
                   (assoc :fills [(solid-fill fill)])

                   (some? stroke)
                   (assoc :strokes [(solid-stroke stroke)])

                   (some? border-radius)
                   (apply-border-radius border-radius)

                   (= type :text)
                   (apply-text-content params))]
    (cts/check-shape shape)))

(defn- media-image-metadata
  [media]
  {:id (:id media)
   :name (:name media)
   :width (:width media)
   :height (:height media)
   :mtype (:mtype media)})

(defn- require-image-media
  [media]
  (when-not (map? media)
    (ex/raise :type :validation
              :code :image-media-required
              :hint "Headless image shape creation requires a media object."))
  (doseq [attr [:id :width :height :mtype :media-id]]
    (when-not (contains? media attr)
      (ex/raise :type :validation
                :code :invalid-image-media
                :hint "Headless image shape creation received an incomplete media object."
                :attr attr)))
  (let [width  (:width media)
        height (:height media)]
    (when-not (and (number? width)
                   (number? height)
                   (pos? width)
                   (pos? height))
      (ex/raise :type :validation
                :code :invalid-image-dimensions
                :hint "Headless image shape creation requires positive media dimensions."
                :media-id (:id media)
                :width width
                :height height)))
  media)

(defn- scale-dimension
  [value source target]
  (let [value (/ (* value target) source)]
    (if (integer? value)
      value
      (double value))))

(defn- infer-image-size
  [{media-width :width media-height :height} width height]
  (cond
    (and (some? width) (some? height))
    [width height]

    (some? width)
    [width (scale-dimension width media-width media-height)]

    (some? height)
    [(scale-dimension height media-height media-width) height]

    :else
    [media-width media-height]))

(defn create-shape-request
  [file-data {:keys [page-id parent-id type] :as params}]
  (when-not (contains? supported-shape-types type)
    (ex/raise :type :validation
              :code :unsupported-shape-type
              :hint "Headless shape creation supports frame, rect, and text shapes."
              :shape-type type))
  (let [[page-id page] (require-page file-data page-id)
        objects        (:objects page)
        parent-id      (require-frame-parent objects type parent-id)
        params         (assoc params
                              :page-id page-id
                              :parent-id parent-id)
        shape          (create-shape params)]
    {:shape (shape-summary shape page-id)
     :changes [{:type :add-obj
                :id (:id shape)
                :page-id page-id
                :parent-id parent-id
                :frame-id (:frame-id shape)
                :ignore-touched true
                :obj shape}]}))

(defn create-image-shape-request
  [file-data {:keys [page-id parent-id media width height name] :as params}]
  (let [media           (require-image-media media)
        [page-id page]  (require-page file-data page-id)
        objects         (:objects page)
        parent-id       (require-frame-parent objects :rect parent-id)
        [width height]  (infer-image-size media width height)
        image-metadata  (media-image-metadata media)
        params          (assoc params
                               :page-id page-id
                               :parent-id parent-id
                               :type :rect
                               :name (normalize-image-shape-name name)
                               :width width
                               :height height)
        shape           (-> (create-shape params)
                            (assoc :fills [{:fill-opacity 1
                                            :fill-image image-metadata}])
                            (assoc :metadata image-metadata)
                            (cts/check-shape))]
    {:shape (shape-summary shape page-id)
     :media media
     :changes [{:type :add-media
                :object media}
               {:type :add-obj
                :id (:id shape)
                :page-id page-id
                :parent-id parent-id
                :frame-id (:frame-id shape)
                :ignore-touched true
                :obj shape}]}))

(defn update-shape-request
  [file-data {:keys [page-id shape-id] :as params}]
  (when-not (requested? params update-attrs)
    (ex/raise :type :validation
              :code :empty-shape-update
              :hint "Headless shape updates require at least one supported field."))
  (let [[page-id page shape] (require-supported-shape file-data page-id shape-id)
        objects              (:objects page)
        updated-shape        (apply-shape-update shape params)
        operations           (shape-update-operations shape updated-shape)
        move-change          (shape-move-change objects updated-shape params)
        summary-shape        (if move-change
                               (let [parent (get objects (:parent-id move-change))]
                                 (assoc updated-shape
                                        :parent-id (:id parent)
                                        :frame-id (frame-id-for-parent parent)))
                               updated-shape)]
    {:shape (shape-summary summary-shape page-id)
     :changes (cond-> []
                (seq operations)
                (conj {:type :mod-obj
                       :id shape-id
                       :page-id page-id
                       :operations operations})

                move-change
                (conj (assoc move-change :page-id page-id)))}))

(defn delete-shape-request
  [file-data {:keys [page-id shape-id]}]
  (let [[page-id _page shape] (require-supported-shape file-data page-id shape-id)]
    {:shape (shape-summary shape page-id)
     :changes [{:type :del-obj
                :id shape-id
                :page-id page-id
                :ignore-touched true}]}))
