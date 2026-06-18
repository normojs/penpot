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
   [app.common.geom.point :as gpt]
   [app.common.types.shape :as cts]
   [app.common.types.shape.interactions :as ctsi]
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

(defn prototype-flow-summary
  [flow page-id starting-board]
  {:id (:id flow)
   :name (:name flow)
   :page-id page-id
   :starting-board-id (:starting-frame flow)
   :starting-board-name (:name starting-board)})

(defn- optional-shape-summary
  [prefix shape]
  (when shape
    {(keyword (str prefix "-id")) (:id shape)
     (keyword (str prefix "-name")) (:name shape)}))

(defn prototype-interaction-summary
  [source interaction destination index]
  (let [action-type (:action-type interaction)
        action-type (if (= action-type :navigate) :navigate-to action-type)]
    (cond-> {:source-shape-id (:id source)
             :source-shape-name (:name source)
             :index index
             :trigger (:event-type interaction)
             :delay (:delay interaction)
             :action-type action-type}
      destination
      (merge (optional-shape-summary "destination-board" destination))

      (some? (:position-relative-to interaction))
      (assoc :relative-to-shape-id (:position-relative-to interaction))

      (#{:open-overlay :toggle-overlay} action-type)
      (assoc :overlay-position-type (:overlay-pos-type interaction)
             :overlay-position (:overlay-position interaction)
             :close-click-outside (:close-click-outside interaction)
             :background-overlay (:background-overlay interaction))

      (and (not= :navigate-to action-type)
           (some? (:animation interaction)))
      (assoc :animation (:animation interaction)))))

(def prototype-overlay-action-types
  #{:open-overlay
    :toggle-overlay
    :close-overlay})

(def prototype-overlay-create-contract
  {:action-types prototype-overlay-action-types
   :position-types ctsi/overlay-positioning-types
   :trigger-types #{:click :mouse-enter :mouse-leave :after-delay}
   :defaults {:trigger :click
              :overlay-position-type :center
              :close-click-outside false
              :background-overlay false}
   :required {:all #{:file-id :page-id :source-shape-id :action-type}
              :open-overlay #{:destination-board-id}
              :toggle-overlay #{:destination-board-id}
              :close-overlay #{}}
   :optional {:open-overlay #{:relative-to-shape-id
                              :overlay-position-type
                              :manual-position
                              :close-click-outside
                              :background-overlay
                              :animation
                              :trigger
                              :delay}
              :toggle-overlay #{:relative-to-shape-id
                                :overlay-position-type
                                :manual-position
                                :close-click-outside
                                :background-overlay
                                :animation
                                :trigger
                                :delay}
              :close-overlay #{:destination-board-id
                               :animation
                               :trigger
                               :delay}}
   :manual-position {:required-when {:overlay-position-type :manual}
                     :shape #{:x :y}}
   :unsupported {:animation-types #{:push}}})

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

(defn- require-prototype-shape
  [file-data page-id shape-id field-name]
  (let [[page-id page shape] (require-shape file-data page-id shape-id)]
    (when (= shape-id uuid/zero)
      (ex/raise :type :validation
                :code :unsupported-root-shape
                :hint "Headless prototype operations cannot target the root shape."
                :shape-id shape-id
                :field field-name))
    [page-id page shape]))

(defn- require-prototype-board
  [file-data page-id shape-id field-name]
  (let [[page-id page shape] (require-prototype-shape file-data page-id shape-id field-name)]
    (when-not (cfh/frame-shape? shape)
      (ex/raise :type :validation
                :code :unsupported-prototype-board
                :hint "Headless prototype flows and navigate interactions require board/frame shapes."
                :shape-id shape-id
                :shape-type (:type shape)
                :field field-name))
    [page-id page shape]))

(defn- prototype-page-ids
  [file-data page-id]
  (if page-id
    (let [[page-id _page] (require-page file-data page-id)]
      [page-id])
    (:pages file-data)))

(defn- shape-by-id
  [file-data shape-id]
  (some (fn [page-id]
          (dm/get-in file-data [:pages-index page-id :objects shape-id]))
        (:pages file-data)))

(defn- prototype-flow-summaries
  [file-data page-id flow-id]
  (->> (prototype-page-ids file-data page-id)
       (mapcat
        (fn [page-id]
          (let [flows (dm/get-in file-data [:pages-index page-id :flows])]
            (->> flows
                 vals
                 (filter #(or (nil? flow-id) (= flow-id (:id %))))
                 (keep (fn [flow]
                         (when-let [starting-board (shape-by-id file-data (:starting-frame flow))]
                           (prototype-flow-summary flow page-id starting-board))))))))
       (vec)))

(defn- prototype-interaction-summary*
  [file-data source interaction index]
  (let [action-type (:action-type interaction)
        destination (shape-by-id file-data (:destination interaction))]
    (case action-type
      :navigate
      (when destination
        (prototype-interaction-summary source interaction destination index))

      (:open-overlay :toggle-overlay)
      (when destination
        (let [relative-to (shape-by-id file-data (:position-relative-to interaction))]
          (cond-> (prototype-interaction-summary source interaction destination index)
            relative-to
            (merge (optional-shape-summary "relative-to-shape" relative-to)))))

      :close-overlay
      (prototype-interaction-summary source interaction destination index)

      nil)))

(defn- prototype-interaction-summaries
  [file-data page-id source-shape-id]
  (->> (prototype-page-ids file-data page-id)
       (mapcat
        (fn [page-id]
          (let [objects (dm/get-in file-data [:pages-index page-id :objects])]
            (->> objects
                 vals
                 (filter #(or (nil? source-shape-id) (= source-shape-id (:id %))))
                 (mapcat
                  (fn [source]
                    (->> (:interactions source)
                         (map-indexed
                         (fn [index interaction]
                            (prototype-interaction-summary* file-data source interaction index)))
                         (keep identity))))))))
       (vec)))

(defn prototype-interactions-summary
  [file-data {:keys [page-id flow-id source-shape-id]}]
  {:flows (prototype-flow-summaries file-data page-id flow-id)
   :interactions (prototype-interaction-summaries file-data page-id source-shape-id)})

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

(def ^:private grid-layout-defaults
  {:layout                 :grid
   :layout-grid-dir        :row
   :layout-gap-type        :multiple
   :layout-gap             {:row-gap 0 :column-gap 0}
   :layout-align-items     :start
   :layout-justify-items   :start
   :layout-align-content   :stretch
   :layout-justify-content :stretch
   :layout-padding-type    :simple
   :layout-padding         {:p1 0 :p2 0 :p3 0 :p4 0}
   :layout-grid-cells      {}
   :layout-grid-rows       [ctsl/default-track-value]
   :layout-grid-columns    [ctsl/default-track-value]})

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

(defn- layout-tracks
  [layout default keys]
  (let [value (apply layout-param layout keys)]
    (if (= missing-layout-value value)
      default
      (do
        (when-not (vector? value)
          (ex/raise :type :validation
                    :code :unsupported-grid-tracks
                    :hint "Headless grid layout tracks must be a vector."
                    :value value))
        (mapv
         (fn [track]
           (when-not (map? track)
             (ex/raise :type :validation
                       :code :unsupported-grid-track
                       :hint "Headless grid layout tracks must be maps."
                       :value track))
           (let [track-type (normalize-layout-keyword (:type track))
                 value      (:value track)]
             (when-not (contains? ctsl/grid-track-types track-type)
               (ex/raise :type :validation
                         :code :unsupported-grid-track-type
                         :hint "Unsupported grid layout track type."
                         :value track-type))
             (when (and (some? value) (not (number? value)))
               (ex/raise :type :validation
                         :code :unsupported-grid-track-value
                         :hint "Headless grid layout track values must be numbers."
                         :value value))
             (cond-> {:type track-type}
               (some? value) (assoc :value value))))
         value)))))

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

(defn- grid-layout-base
  [shape]
  (if (= :grid (:layout shape))
    (merge grid-layout-defaults (select-keys shape layout-container-attrs))
    grid-layout-defaults))

(defn- apply-grid-layout-update
  [shape layout]
  (let [base    (grid-layout-base shape)
        row-gap (layout-number layout
                               (get-in base [:layout-gap :row-gap])
                               [:row-gap :rowGap])
        col-gap (layout-number layout
                               (get-in base [:layout-gap :column-gap])
                               [:column-gap :columnGap])
        padding (layout-number layout (get-in base [:layout-padding :p1]) [:padding])
        updated (assoc base
                       :layout :grid
                       :layout-grid-dir
                       (layout-keyword layout (:layout-grid-dir base) ctsl/grid-direction-types
                                       :unsupported-grid-direction
                                       "Unsupported grid layout direction."
                                       [:grid-direction :gridDirection :direction])
                       :layout-align-items
                       (layout-keyword layout (:layout-align-items base) ctsl/align-items-types
                                       :unsupported-layout-align-items
                                       "Unsupported grid layout align-items value."
                                       [:align-items :alignItems])
                       :layout-justify-items
                       (layout-keyword layout (:layout-justify-items base) ctsl/justify-items-types
                                       :unsupported-layout-justify-items
                                       "Unsupported grid layout justify-items value."
                                       [:justify-items :justifyItems])
                       :layout-align-content
                       (layout-keyword layout (:layout-align-content base) ctsl/align-content-types
                                       :unsupported-layout-align-content
                                       "Unsupported grid layout align-content value."
                                       [:align-content :alignContent])
                       :layout-justify-content
                       (layout-keyword layout (:layout-justify-content base) ctsl/justify-content-types
                                       :unsupported-layout-justify-content
                                       "Unsupported grid layout justify-content value."
                                       [:justify-content :justifyContent])
                       :layout-gap-type :multiple
                       :layout-gap {:row-gap row-gap :column-gap col-gap}
                       :layout-padding-type :simple
                       :layout-padding {:p1 padding :p2 padding :p3 padding :p4 padding}
                       :layout-grid-rows
                       (layout-tracks layout (:layout-grid-rows base) [:rows :grid-rows :gridRows])
                       :layout-grid-columns
                       (layout-tracks layout (:layout-grid-columns base) [:columns :grid-columns :gridColumns])
                       :layout-grid-cells (:layout-grid-cells base))]
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

          :grid
          (apply-grid-layout-update shape layout)

          (ex/raise :type :validation
                    :code :unsupported-layout-type
                    :hint "Headless backend layout updates currently support none, flex, and the grid container track subset."
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

(defn- normalize-prototype-name
  [name]
  (let [name (some-> name str/trim)]
    (when-not (seq name)
      (ex/raise :type :validation
                :code :prototype-name-required
                :hint "Headless prototype flow creation requires a non-empty name."))
    name))

(defn create-prototype-flow-request
  [file-data {:keys [page-id flow-id name starting-board-id starting-frame] :as _params}]
  (let [starting-board-id (or starting-board-id starting-frame)
        [page-id _page starting-board] (require-prototype-board file-data page-id starting-board-id :starting-board-id)
        flow-id (or flow-id (uuid/next))
        flow {:id flow-id
              :name (normalize-prototype-name name)
              :starting-frame starting-board-id}]
    {:flow (prototype-flow-summary flow page-id starting-board)
     :changes [{:type :set-flow
                :page-id page-id
                :id flow-id
                :params flow}]}))

(defn- normalize-prototype-trigger
  [trigger]
  (let [trigger (normalize-layout-keyword (or trigger :click))]
    (when-not (contains? ctsi/event-types trigger)
      (ex/raise :type :validation
                :code :unsupported-prototype-trigger
                :hint "Headless prototype interactions support click, mouse-enter, mouse-leave, and after-delay triggers."
                :trigger trigger))
    trigger))

(defn- ensure-after-delay-source!
  [source trigger]
  (when (and (= trigger :after-delay)
             (not (cfh/frame-shape? source)))
    (ex/raise :type :validation
              :code :unsupported-prototype-trigger
              :hint "Headless after-delay prototype interactions require a board/frame source shape."
              :shape-id (:id source)
              :shape-type (:type source)
              :trigger trigger)))

(defn- animation-type
  [animation]
  (when (map? animation)
    (normalize-layout-keyword (or (get animation :type)
                                  (get animation :animation-type)
                                  (get animation :animationType)))))

(defn- apply-prototype-animation
  [interaction animation]
  (if-not (some? animation)
    interaction
    (do
      (when-not (map? animation)
        (ex/raise :type :validation
                  :code :prototype-animation-required
                  :hint "Headless prototype interaction animation must be a map."))
      (let [animation-type (animation-type animation)
            duration (layout-number animation nil [:duration])
            easing (layout-param animation :easing)
            direction (layout-param animation :direction)
            way (layout-param animation :way)
            offset-effect (layout-param animation :offset-effect :offsetEffect)]
        (when-not (contains? ctsi/animation-types animation-type)
          (ex/raise :type :validation
                    :code :unsupported-prototype-animation
                    :hint "Headless prototype interactions support dissolve, slide, and push animations."
                    :animation-type animation-type))
        (-> interaction
            (ctsi/set-animation-type animation-type)
            (cond-> (some? duration)
              (ctsi/set-duration duration)

              (not= missing-layout-value easing)
              (ctsi/set-easing (normalize-layout-keyword easing))

              (not= missing-layout-value way)
              (ctsi/set-way (normalize-layout-keyword way))

              (not= missing-layout-value direction)
              (ctsi/set-direction (normalize-layout-keyword direction))

              (not= missing-layout-value offset-effect)
              (ctsi/set-offset-effect offset-effect)))))))

(defn- prototype-overlay-param
  [params & keys]
  (some (fn [key]
          (when (contains? params key)
            (get params key)))
        keys))

(defn- normalize-prototype-overlay-action
  [action-type]
  (let [action-type (normalize-layout-keyword action-type)]
    (when-not (contains? prototype-overlay-action-types action-type)
      (ex/raise :type :validation
                :code :unsupported-prototype-overlay-action
                :hint "Headless prototype overlay creation supports open-overlay, toggle-overlay, and close-overlay actions."
                :action-type action-type))
    action-type))

(defn- normalize-prototype-overlay-position-type
  [position-type]
  (let [position-type (normalize-layout-keyword (or position-type :center))]
    (when-not (contains? ctsi/overlay-positioning-types position-type)
      (ex/raise :type :validation
                :code :unsupported-prototype-overlay-position
                :hint "Headless prototype overlay creation received an unsupported overlay position type."
                :overlay-position-type position-type))
    position-type))

(defn- point-coordinate
  [point key]
  (or (get point key)
      (get point (name key))))

(defn- normalize-prototype-overlay-manual-position
  [position-type manual-position]
  (if (= position-type :manual)
    (let [x (point-coordinate manual-position :x)
          y (point-coordinate manual-position :y)]
      (when-not (and (number? x) (number? y))
        (ex/raise :type :validation
                  :code :prototype-overlay-manual-position-required
                  :hint "Headless manual overlay positioning requires manual-position with numeric x and y."
                  :manual-position manual-position))
      (gpt/point x y))
    (gpt/point 0 0)))

(defn- ensure-overlay-animation!
  [action-type animation]
  (when (= :push (animation-type animation))
    (ex/raise :type :validation
              :code :unsupported-prototype-animation
              :hint "Headless prototype overlay creation does not support push animation."
              :action-type action-type
              :animation-type :push)))

(defn- normalize-overlay-animation
  [action-type animation]
  (ensure-overlay-animation! action-type animation)
  (cond-> animation
    (map? animation)
    (dissoc :way :offset-effect :offsetEffect
            "way" "offset-effect" "offsetEffect")))

(defn- create-overlay-interaction
  [file-data page-id source {:keys [delay animation] :as params}]
  (let [action-type (normalize-prototype-overlay-action
                     (prototype-overlay-param params :action-type :actionType))
        trigger (normalize-prototype-trigger (:trigger params))
        _ (ensure-after-delay-source! source trigger)
        _ (when (and (some? delay)
                     (not= trigger :after-delay))
            (ex/raise :type :validation
                      :code :prototype-delay-trigger-required
                      :hint "Headless prototype overlay delay requires trigger after-delay."
                      :trigger trigger))
        destination-board-id (prototype-overlay-param params
                                                      :destination-board-id
                                                      :destinationBoardId)
        relative-to-shape-id (prototype-overlay-param params
                                                      :relative-to-shape-id
                                                      :relativeToShapeId)
        [_destination-page-id _destination-page destination]
        (if (#{:open-overlay :toggle-overlay} action-type)
          (do
            (when-not destination-board-id
              (ex/raise :type :validation
                        :code :prototype-overlay-destination-required
                        :hint "Headless open-overlay and toggle-overlay interactions require destination-board-id."
                        :action-type action-type))
            (require-prototype-board file-data page-id destination-board-id :destination-board-id))
          (when destination-board-id
            (require-prototype-board file-data page-id destination-board-id :destination-board-id)))
        [_relative-page _relative-page-data _relative-shape]
        (when relative-to-shape-id
          (require-prototype-shape file-data page-id relative-to-shape-id :relative-to-shape-id))
        overlay-position-type (normalize-prototype-overlay-position-type
                               (prototype-overlay-param params
                                                        :overlay-position-type
                                                        :overlayPositionType))
        manual-position (prototype-overlay-param params :manual-position :manualPosition)
        overlay-position (normalize-prototype-overlay-manual-position overlay-position-type manual-position)
        close-click-outside (boolean (or (prototype-overlay-param params
                                                                  :close-click-outside
                                                                  :closeClickOutside)
                                         false))
        background-overlay (boolean (or (prototype-overlay-param params
                                                                :background-overlay
                                                                :backgroundOverlay)
                                       false))]
    (-> ctsi/default-interaction
        (ctsi/set-event-type trigger source)
        (ctsi/set-action-type action-type)
        (cond-> destination
          (ctsi/set-destination (:id destination))

          (some? delay)
          (ctsi/set-delay delay)

          (#{:open-overlay :toggle-overlay} action-type)
          (assoc :overlay-pos-type overlay-position-type
                 :overlay-position overlay-position
                 :close-click-outside close-click-outside
                 :background-overlay background-overlay)

          (and (#{:open-overlay :toggle-overlay} action-type)
               relative-to-shape-id)
          (ctsi/set-position-relative-to relative-to-shape-id))
        (apply-prototype-animation (normalize-overlay-animation action-type animation)))))

(defn- create-navigate-interaction
  [source destination {:keys [trigger delay animation] :as params}]
  (let [trigger (normalize-prototype-trigger trigger)]
    (ensure-after-delay-source! source trigger)
    (-> ctsi/default-interaction
        (ctsi/set-event-type trigger source)
        (ctsi/set-action-type :navigate)
        (ctsi/set-destination (:id destination))
        (ctsi/set-preserve-scroll (boolean (or (:preserve-scroll-position params)
                                               (:preserveScrollPosition params))))
        (cond-> (some? delay)
          (ctsi/set-delay delay))
        (apply-prototype-animation animation))))

(defn create-prototype-interaction-request
  [file-data {:keys [page-id source-shape-id destination-board-id] :as params}]
  (let [[page-id _page source] (require-prototype-shape file-data page-id source-shape-id :source-shape-id)
        [_page-id _page destination] (require-prototype-board file-data page-id destination-board-id :destination-board-id)
        interaction (create-navigate-interaction source destination params)
        interactions (ctsi/add-interaction (:interactions source) interaction)
        index (dec (count interactions))]
    {:interaction (prototype-interaction-summary source interaction destination index)
     :changes [{:type :mod-obj
                :id source-shape-id
                :page-id page-id
                :operations [{:type :set
                              :attr :interactions
                              :val interactions}]}]}))

(defn create-prototype-overlay-request
  [file-data {:keys [page-id source-shape-id] :as params}]
  (let [[page-id _page source] (require-prototype-shape file-data page-id source-shape-id :source-shape-id)
        interaction (create-overlay-interaction file-data page-id source params)
        interactions (ctsi/add-interaction (:interactions source) interaction)
        index (dec (count interactions))]
    {:interaction (prototype-interaction-summary* file-data source interaction index)
     :changes [{:type :mod-obj
                :id source-shape-id
                :page-id page-id
                :operations [{:type :set
                              :attr :interactions
                              :val interactions}]}]}))

(defn delete-prototype-interaction-request
  [file-data {:keys [page-id source-shape-id interaction-index]}]
  (let [[page-id _page source] (require-prototype-shape file-data page-id source-shape-id :source-shape-id)
        interactions (vec (or (:interactions source) []))]
    (when-not (and (int? interaction-index)
                   (<= 0 interaction-index)
                   (< interaction-index (count interactions)))
      (ex/raise :type :validation
                :code :prototype-interaction-not-found
                :hint "The target prototype interaction index does not exist on the source shape."
                :page-id page-id
                :source-shape-id source-shape-id
                :interaction-index interaction-index))
    (let [interaction (nth interactions interaction-index)
          summary (prototype-interaction-summary* file-data source interaction interaction-index)]
      (when-not summary
        (ex/raise :type :validation
                  :code :unsupported-prototype-interaction
                  :hint "Headless prototype interaction deletion only supports summarized navigate and overlay interactions."
                  :page-id page-id
                  :source-shape-id source-shape-id
                  :interaction-index interaction-index))
      {:interaction summary
       :changes [{:type :mod-obj
                  :id source-shape-id
                  :page-id page-id
                  :operations [{:type :set
                                :attr :interactions
                                :val (ctsi/remove-interaction interactions interaction-index)}]}]})))

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
