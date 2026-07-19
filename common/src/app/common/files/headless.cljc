;; This Source Code Form is subject to the terms of the Mozilla Public
;; License, v. 2.0. If a copy of the MPL was not distributed with this
;; file, You can obtain one at http://mozilla.org/MPL/2.0/.
;;
;; Copyright (c) KALEIDOS INC Sucursal en España SL

(ns app.common.files.headless
  (:require
   [app.common.data :as d]
   [app.common.data.macros :as dm]
   [app.common.exceptions :as ex]
   [app.common.files.helpers :as cfh]
   [app.common.geom.point :as gpt]
   [app.common.geom.shapes :as gsh]
   [app.common.path-names :as cpn]
   [app.common.types.component :as ctk]
   [app.common.types.components-list :as ctkl]
   [app.common.types.container :as ctn]
   [app.common.types.shape :as cts]
   [app.common.types.shape.interactions :as ctsi]
   [app.common.types.shape.layout :as ctsl]
   [app.common.types.text :as cttx]
   [app.common.types.token :as cto]
   [app.common.types.tokens-lib :as ctob]
   [app.common.uuid :as uuid]
   [clojure.set :as set]
   [cuerdas.core :as str]))

(def supported-shape-types
  #{:frame :rect :text})

(def summarized-shape-types
  "Shape types that can appear in headless summaries (includes groups)."
  #{:frame :rect :text :group})

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

(defn- prototype-interaction-identity
  [source interaction index]
  (let [source-shape-id (:id source)
        interaction-id  (:id interaction)]
    (if interaction-id
      {:interaction-id interaction-id
       :identity {:kind :stable-id
                  :interaction-id interaction-id
                  :source-shape-id source-shape-id
                  :interaction-index index}}
      {:identity {:kind :source-index
                  :source-shape-id source-shape-id
                  :interaction-index index
                  :unstable true}})))

(defn prototype-interaction-summary
  [source interaction destination index]
  (let [action-type (:action-type interaction)
        action-type (if (= action-type :navigate) :navigate-to action-type)]
    (cond-> (merge {:source-shape-id (:id source)
                    :source-shape-name (:name source)
                    :index index
                    :trigger (:event-type interaction)
                    :delay (:delay interaction)
                    :action-type action-type}
                   (prototype-interaction-identity source interaction index))
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

(defn- layout-cells
  "Normalize optional headless grid cell placements.

  Payload (vector of maps):
  - row / column: 1-indexed safe ints
  - row-span / column-span (optional, default 1)
  - shapes (optional vector of child shape uuids)
  - position (optional :auto|:manual|:area)
  - align-self / justify-self (optional)
  - id / area-name (optional)

  When omitted, existing cells are preserved. When provided as [], cells are
  cleared. When provided as a vector, only those placements are set (map keyed by
  cell id). Full layout-engine auto-assignment remains a later/with-objects slice."
  [layout default]
  (let [value (apply layout-param layout [:cells :grid-cells :gridCells :layout-grid-cells :layoutGridCells])]
    (if (= missing-layout-value value)
      default
      (cond
        (and (map? value) (empty? value))
        {}

        (map? value)
        ;; already id->cell map; shallow-validate values
        (do
          (doseq [[cell-id cell] value]
            (when-not (uuid? cell-id)
              (ex/raise :type :validation
                        :code :unsupported-grid-cell-id
                        :hint "Headless grid cell map keys must be uuids."
                        :value cell-id))
            (when-not (map? cell)
              (ex/raise :type :validation
                        :code :unsupported-grid-cell
                        :hint "Headless grid cells must be maps."
                        :value cell)))
          value)

        (vector? value)
        (let [cells
              (mapv
               (fn [cell]
                 (when-not (map? cell)
                   (ex/raise :type :validation
                             :code :unsupported-grid-cell
                             :hint "Headless grid cells must be maps."
                             :value cell))
                 (let [row    (or (get cell :row) (get cell :row-index) (get cell :rowIndex))
                       column (or (get cell :column) (get cell :column-index) (get cell :columnIndex))
                       row-span (or (get cell :row-span) (get cell :rowSpan) 1)
                       column-span (or (get cell :column-span) (get cell :columnSpan) 1)
                       shapes (or (get cell :shapes) (get cell :shape-ids) (get cell :shapeIds) [])
                       position (or (get cell :position) :manual)
                       align-self (get cell :align-self (get cell :alignSelf :auto))
                       justify-self (get cell :justify-self (get cell :justifySelf :auto))
                       cell-id (or (get cell :id) (uuid/next))
                       area-name (or (get cell :area-name) (get cell :areaName))]
                   (when-not (int? row)
                     (ex/raise :type :validation
                               :code :unsupported-grid-cell-row
                               :hint "Headless grid cells require an integer :row (1-indexed)."
                               :value row))
                   (when-not (int? column)
                     (ex/raise :type :validation
                               :code :unsupported-grid-cell-column
                               :hint "Headless grid cells require an integer :column (1-indexed)."
                               :value column))
                   (when-not (and (int? row-span) (pos? row-span))
                     (ex/raise :type :validation
                               :code :unsupported-grid-cell-row-span
                               :hint "Headless grid cell :row-span must be a positive integer."
                               :value row-span))
                   (when-not (and (int? column-span) (pos? column-span))
                     (ex/raise :type :validation
                               :code :unsupported-grid-cell-column-span
                               :hint "Headless grid cell :column-span must be a positive integer."
                               :value column-span))
                   (when-not (vector? shapes)
                     (ex/raise :type :validation
                               :code :unsupported-grid-cell-shapes
                               :hint "Headless grid cell :shapes must be a vector of shape uuids."
                               :value shapes))
                   (doseq [shape-id shapes]
                     (when-not (uuid? shape-id)
                       (ex/raise :type :validation
                                 :code :unsupported-grid-cell-shape-id
                                 :hint "Headless grid cell shapes must be uuids."
                                 :value shape-id)))
                   (let [position (normalize-layout-keyword position)
                         align-self (normalize-layout-keyword align-self)
                         justify-self (normalize-layout-keyword justify-self)]
                     (when-not (contains? ctsl/grid-position-types position)
                       (ex/raise :type :validation
                                 :code :unsupported-grid-cell-position
                                 :hint "Unsupported grid cell position."
                                 :value position))
                     (when-not (contains? ctsl/grid-cell-align-self-types align-self)
                       (ex/raise :type :validation
                                 :code :unsupported-grid-cell-align-self
                                 :hint "Unsupported grid cell align-self."
                                 :value align-self))
                     (when-not (contains? ctsl/grid-cell-justify-self-types justify-self)
                       (ex/raise :type :validation
                                 :code :unsupported-grid-cell-justify-self
                                 :hint "Unsupported grid cell justify-self."
                                 :value justify-self))
                     (cond-> {:id cell-id
                              :row row
                              :row-span row-span
                              :column column
                              :column-span column-span
                              :position position
                              :align-self align-self
                              :justify-self justify-self
                              :shapes shapes}
                       (some? area-name) (assoc :area-name area-name)))))
               value)]
          (into {} (map (juxt :id identity) cells)))

        :else
        (ex/raise :type :validation
                  :code :unsupported-grid-cells
                  :hint "Headless grid cells must be a vector of placements or an id->cell map."
                  :value value)))))

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
        cells   (layout-cells layout (:layout-grid-cells base))
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
                       :layout-grid-cells cells)]
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
                    :hint "Headless backend layout updates currently support none, flex, and grid container tracks plus optional cell placements."
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

(defn- prototype-param-present?
  [params & keys]
  (boolean (some #(contains? params %) keys)))

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

(defn- assign-prototype-interaction-id
  [interaction]
  (ctsi/regenerate-interaction-id interaction))

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
        (apply-prototype-animation (normalize-overlay-animation action-type animation))
        (assign-prototype-interaction-id))))

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
        (apply-prototype-animation animation)
        (assign-prototype-interaction-id))))

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

(defn- raise-prototype-interaction-not-found
  [{:keys [page-id source-shape-id interaction-index interaction-id hint]}]
  (ex/raise :type :validation
            :code :prototype-interaction-not-found
            :hint hint
            :page-id page-id
            :source-shape-id source-shape-id
            :interaction-index interaction-index
            :interaction-id interaction-id))

(defn- raise-stale-prototype-interaction-target
  [{:keys [page-id source-shape-id interaction-index interaction-id hint]}]
  (ex/raise :type :validation
            :code :prototype-interaction-target-stale
            :hint hint
            :page-id page-id
            :source-shape-id source-shape-id
            :interaction-index interaction-index
            :interaction-id interaction-id))

(defn- stable-prototype-interaction-matches
  [file-data page-id interaction-id]
  (->> (prototype-page-ids file-data page-id)
       (mapcat
        (fn [page-id]
          (let [objects (dm/get-in file-data [:pages-index page-id :objects])]
            (->> objects
                 vals
                 (mapcat
                  (fn [source]
                    (->> (:interactions source)
                         (map-indexed
                          (fn [index interaction]
                            (when (= interaction-id (:id interaction))
                              {:page-id page-id
                               :source source
                               :interaction interaction
                               :interaction-index index})))
                         (keep identity))))))))
       (vec)))

(defn- resolve-stable-prototype-interaction
  [file-data {:keys [page-id source-shape-id interaction-index interaction-id]}]
  (let [matches (stable-prototype-interaction-matches file-data page-id interaction-id)
        match-count (count matches)
        requested-index interaction-index]
    (cond
      (zero? match-count)
      (raise-prototype-interaction-not-found
       {:page-id page-id
        :source-shape-id source-shape-id
        :interaction-index interaction-index
        :interaction-id interaction-id
        :hint "The target prototype interaction id does not exist."})

      (< 1 match-count)
      (ex/raise :type :validation
                :code :prototype-interaction-id-conflict
                :hint "More than one prototype interaction carries the target stable id."
                :page-id page-id
                :source-shape-id source-shape-id
                :interaction-index interaction-index
                :interaction-id interaction-id)

      :else
      (let [{matched-page-id :page-id
             :keys [source interaction]
             matched-index :interaction-index} (first matches)]
        (when (and source-shape-id
                   (not= source-shape-id (:id source)))
          (raise-stale-prototype-interaction-target
           {:page-id matched-page-id
            :source-shape-id source-shape-id
            :interaction-index requested-index
            :interaction-id interaction-id
            :hint "The stable prototype interaction id belongs to a different source shape."}))
        (when (and (some? requested-index)
                   (not= requested-index matched-index))
          (raise-stale-prototype-interaction-target
           {:page-id matched-page-id
            :source-shape-id (:id source)
            :interaction-index requested-index
            :interaction-id interaction-id
            :hint "The stable prototype interaction id no longer matches the requested source index."}))
        {:page-id matched-page-id
         :source source
         :interaction interaction
         :interaction-index matched-index}))))

(defn- resolve-index-prototype-interaction
  [file-data {:keys [page-id source-shape-id interaction-index]}]
  (when-not source-shape-id
    (ex/raise :type :validation
              :code :prototype-source-shape-required
              :hint "Headless prototype interaction deletion requires source-shape-id when interaction-id is not supplied."
              :page-id page-id
              :interaction-index interaction-index))
  (let [[page-id _page source] (require-prototype-shape file-data page-id source-shape-id :source-shape-id)
        interactions (vec (or (:interactions source) []))]
    (when-not (and (int? interaction-index)
                   (<= 0 interaction-index)
                   (< interaction-index (count interactions)))
      (raise-prototype-interaction-not-found
       {:page-id page-id
        :source-shape-id source-shape-id
        :interaction-index interaction-index
        :hint "The target prototype interaction index does not exist on the source shape."}))
    {:page-id page-id
     :source source
     :interaction (nth interactions interaction-index)
     :interaction-index interaction-index}))

(defn- resolve-prototype-interaction-delete-target
  [file-data {:keys [interaction-id] :as params}]
  (if interaction-id
    (resolve-stable-prototype-interaction file-data params)
    (resolve-index-prototype-interaction file-data params)))

(defn- ensure-supported-prototype-interaction!
  [file-data page-id source interaction interaction-index operation]
  (let [summary (prototype-interaction-summary* file-data source interaction interaction-index)]
    (when-not summary
      (ex/raise :type :validation
                :code :unsupported-prototype-interaction
                :hint (str "Headless prototype interaction " operation " only supports summarized navigate and overlay interactions.")
                :page-id page-id
                :source-shape-id (:id source)
                :interaction-index interaction-index))
    summary))

(defn- resolve-prototype-interaction-target
  [file-data {:keys [interaction-id] :as params}]
  (if interaction-id
    (resolve-stable-prototype-interaction file-data params)
    (resolve-index-prototype-interaction file-data params)))

(defn- prototype-interactions-change
  [page-id source-shape-id interactions]
  {:type :mod-obj
   :id source-shape-id
   :page-id page-id
   :operations [{:type :set
                 :attr :interactions
                 :val interactions}]})

(defn- normalize-prototype-update-params
  [params]
  (merge (:patch params) params))

(defn- ensure-prototype-action-immutable!
  [interaction params]
  (when (prototype-param-present? params :action-type :actionType)
    (let [action-type (normalize-layout-keyword
                       (prototype-overlay-param params :action-type :actionType))
          action-type (if (= :navigate-to action-type) :navigate action-type)]
      (when (not= action-type (:action-type interaction))
        (ex/raise :type :validation
                  :code :prototype-interaction-action-immutable
                  :hint "Headless prototype interaction update cannot change action type."
                  :action-type action-type
                  :current-action-type (:action-type interaction))))))

(defn- ensure-prototype-update-field!
  [interaction field allowed-action-types]
  (when-not (contains? allowed-action-types (:action-type interaction))
    (ex/raise :type :validation
              :code :unsupported-prototype-interaction-update
              :hint "The requested field is not supported for this prototype interaction action type."
              :field field
              :action-type (:action-type interaction))))

(defn- normalize-prototype-update-trigger
  [interaction source params]
  (if (prototype-param-present? params :trigger)
    (let [trigger (normalize-prototype-trigger (:trigger params))]
      (ensure-after-delay-source! source trigger)
      (cond-> (ctsi/set-event-type interaction trigger source)
        (not= trigger :after-delay)
        (dissoc :delay)))
    interaction))

(defn- apply-prototype-update-delay
  [interaction params]
  (if (prototype-param-present? params :delay)
    (let [delay (:delay params)]
      (if (nil? delay)
        (dissoc interaction :delay)
        (do
          (when-not (= :after-delay (:event-type interaction))
            (ex/raise :type :validation
                      :code :prototype-delay-trigger-required
                      :hint "Headless prototype interaction delay requires trigger after-delay."
                      :trigger (:event-type interaction)))
          (ctsi/set-delay interaction delay))))
    interaction))

(defn- apply-prototype-update-destination
  [interaction file-data page-id params]
  (if (prototype-param-present? params :destination-board-id :destinationBoardId)
    (let [destination-board-id (prototype-overlay-param params
                                                        :destination-board-id
                                                        :destinationBoardId)]
      (when (and (nil? destination-board-id)
                 (not= :close-overlay (:action-type interaction)))
        (ex/raise :type :validation
                  :code :prototype-destination-required
                  :hint "Headless prototype interaction update requires destination-board-id for this action type."
                  :action-type (:action-type interaction)))
      (when destination-board-id
        (require-prototype-board file-data page-id destination-board-id :destination-board-id))
      (ctsi/set-destination interaction destination-board-id))
    interaction))

(defn- apply-prototype-update-preserve-scroll
  [interaction params]
  (if (prototype-param-present? params :preserve-scroll-position :preserveScrollPosition)
    (do
      (ensure-prototype-update-field! interaction :preserve-scroll-position #{:navigate})
      (ctsi/set-preserve-scroll interaction
                                (boolean (prototype-overlay-param params
                                                                  :preserve-scroll-position
                                                                  :preserveScrollPosition))))
    interaction))

(defn- apply-prototype-update-relative-to
  [interaction file-data page-id params]
  (if (prototype-param-present? params :relative-to-shape-id :relativeToShapeId)
    (let [relative-to-shape-id (prototype-overlay-param params
                                                        :relative-to-shape-id
                                                        :relativeToShapeId)]
      (ensure-prototype-update-field! interaction :relative-to-shape-id #{:open-overlay :toggle-overlay})
      (when relative-to-shape-id
        (require-prototype-shape file-data page-id relative-to-shape-id :relative-to-shape-id))
      (ctsi/set-position-relative-to interaction relative-to-shape-id))
    interaction))

(defn- apply-prototype-update-overlay-position
  [interaction file-data page-id source params]
  (let [position-type-present? (prototype-param-present? params
                                                         :overlay-position-type
                                                         :overlayPositionType)
        manual-position-present? (prototype-param-present? params
                                                           :manual-position
                                                           :manualPosition)]
    (cond-> interaction
      (or position-type-present? manual-position-present?)
      (as-> interaction
            (do
              (ensure-prototype-update-field! interaction :overlay-position #{:open-overlay :toggle-overlay})
              interaction))

      position-type-present?
      (as-> interaction
            (let [position-type (normalize-prototype-overlay-position-type
                                 (prototype-overlay-param params
                                                          :overlay-position-type
                                                          :overlayPositionType))]
              (when (and (= :manual position-type)
                         (not manual-position-present?))
                (ex/raise :type :validation
                          :code :prototype-overlay-manual-position-required
                          :hint "Headless manual overlay positioning requires manual-position with numeric x and y."))
              (ctsi/set-overlay-pos-type
               interaction
               position-type
               source
               (dm/get-in file-data [:pages-index page-id :objects]))))

      manual-position-present?
      (as-> interaction
            (let [position-type (when position-type-present?
                                  (normalize-prototype-overlay-position-type
                                   (prototype-overlay-param params
                                                            :overlay-position-type
                                                            :overlayPositionType)))]
              (when (and position-type
                         (not= :manual position-type))
                (ex/raise :type :validation
                          :code :prototype-overlay-manual-position-conflict
                          :hint "Headless manual overlay position can only be used with manual overlay positioning."
                          :overlay-position-type position-type))
              (ctsi/set-overlay-position
               interaction
               (normalize-prototype-overlay-manual-position
                :manual
                (prototype-overlay-param params :manual-position :manualPosition))))))))

(defn- apply-prototype-update-overlay-booleans
  [interaction params]
  (cond-> interaction
    (prototype-param-present? params :close-click-outside :closeClickOutside)
    (as-> interaction
          (do
            (ensure-prototype-update-field! interaction :close-click-outside #{:open-overlay :toggle-overlay})
            (ctsi/set-close-click-outside
             interaction
             (boolean (prototype-overlay-param params :close-click-outside :closeClickOutside)))))

    (prototype-param-present? params :background-overlay :backgroundOverlay)
    (as-> interaction
          (do
            (ensure-prototype-update-field! interaction :background-overlay #{:open-overlay :toggle-overlay})
            (ctsi/set-background-overlay
             interaction
             (boolean (prototype-overlay-param params :background-overlay :backgroundOverlay)))))))

(defn- apply-prototype-update-animation
  [interaction params]
  (if (prototype-param-present? params :animation)
    (let [animation (:animation params)]
      (if (nil? animation)
        (dissoc interaction :animation)
        (apply-prototype-animation
         interaction
         (if (#{:open-overlay :toggle-overlay :close-overlay} (:action-type interaction))
           (normalize-overlay-animation (:action-type interaction) animation)
           animation))))
    interaction))

(defn- update-prototype-interaction
  [file-data page-id source interaction params]
  (let [params (normalize-prototype-update-params params)]
    (ensure-prototype-action-immutable! interaction params)
    (-> interaction
        (normalize-prototype-update-trigger source params)
        (apply-prototype-update-delay params)
        (apply-prototype-update-destination file-data page-id params)
        (apply-prototype-update-preserve-scroll params)
        (apply-prototype-update-relative-to file-data page-id params)
        (apply-prototype-update-overlay-position file-data page-id source params)
        (apply-prototype-update-overlay-booleans params)
        (apply-prototype-update-animation params))))

(defn update-prototype-interaction-request
  [file-data params]
  (let [{:keys [page-id source interaction interaction-index]}
        (resolve-prototype-interaction-target file-data params)
        source-shape-id (:id source)
        interactions (vec (or (:interactions source) []))
        _ (ensure-supported-prototype-interaction!
           file-data page-id source interaction interaction-index "update")
        updated-interaction (update-prototype-interaction file-data page-id source interaction params)
        interactions (assoc interactions interaction-index updated-interaction)
        summary (ensure-supported-prototype-interaction!
                 file-data page-id source updated-interaction interaction-index "update")]
    {:interaction summary
     :changes [(prototype-interactions-change page-id source-shape-id interactions)]}))

(defn- insert-vector
  [items index item]
  (into (conj (subvec items 0 index) item)
        (subvec items index)))

(defn- require-interaction-insertion-index
  [index count hint]
  (when-not (and (int? index)
                 (<= 0 index)
                 (<= index count))
    (ex/raise :type :validation
              :code :prototype-interaction-index-invalid
              :hint hint
              :interaction-index index
              :interaction-count count))
  index)

(defn reorder-prototype-interaction-request
  [file-data {:keys [to-index toIndex] :as params}]
  (let [{:keys [page-id source interaction interaction-index]}
        (resolve-prototype-interaction-target file-data params)
        source-shape-id (:id source)
        interactions (vec (or (:interactions source) []))
        count (count interactions)
        to-index (or to-index toIndex)
        _ (ensure-supported-prototype-interaction!
           file-data page-id source interaction interaction-index "reorder")
        _ (require-interaction-insertion-index
           to-index
           (dec count)
           "Headless prototype interaction reorder requires to-index within the source interaction list.")
        interactions (-> interactions
                         (ctsi/remove-interaction interaction-index)
                         (insert-vector to-index interaction))
        summary (ensure-supported-prototype-interaction!
                 file-data page-id source interaction to-index "reorder")]
    {:interaction summary
     :changes [(prototype-interactions-change page-id source-shape-id interactions)]}))

(defn duplicate-prototype-interaction-request
  [file-data {:keys [insertion-index insertionIndex] :as params}]
  (let [{:keys [page-id source interaction interaction-index]}
        (resolve-prototype-interaction-target file-data params)
        source-shape-id (:id source)
        interactions (vec (or (:interactions source) []))
        _ (ensure-supported-prototype-interaction!
           file-data page-id source interaction interaction-index "duplicate")
        insertion-index (or insertion-index insertionIndex (inc interaction-index))
        insertion-index (require-interaction-insertion-index
                         insertion-index
                         (count interactions)
                         "Headless prototype interaction duplicate requires insertion-index within the source interaction list.")
        duplicated-interaction (ctsi/regenerate-interaction-id interaction)
        interactions (insert-vector interactions insertion-index duplicated-interaction)
        summary (ensure-supported-prototype-interaction!
                 file-data page-id source duplicated-interaction insertion-index "duplicate")]
    {:interaction summary
     :changes [(prototype-interactions-change page-id source-shape-id interactions)]}))

(defn delete-prototype-interaction-request
  [file-data params]
  (let [{:keys [page-id source interaction interaction-index]}
        (resolve-prototype-interaction-delete-target file-data params)
        source-shape-id (:id source)
        interactions (vec (or (:interactions source) []))
        summary (ensure-supported-prototype-interaction!
                 file-data page-id source interaction interaction-index "deletion")]
    {:interaction summary
     :changes [(prototype-interactions-change
                page-id
                source-shape-id
                (ctsi/remove-interaction interactions interaction-index))]}))

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

(defn- token-summary
  [token set-id include-values?]
  (cond-> {:id (ctob/get-id token)
           :name (ctob/get-name token)
           :type (:type token)
           :set-id set-id
           :description (or (ctob/get-description token) "")}
    include-values?
    (assoc :value (:value token))))

(defn- token-set-summary
  [token-set include-values?]
  (let [set-id (ctob/get-id token-set)
        tokens (->> (vals (ctob/get-tokens- token-set))
                    (map #(token-summary % set-id include-values?))
                    (sort-by :name)
                    (vec))]
    {:id set-id
     :name (ctob/get-name token-set)
     :description (or (ctob/get-description token-set) "")
     :token-count (count tokens)
     :tokens tokens}))

(defn- token-theme-summary
  [theme]
  {:id (ctob/get-id theme)
   :name (ctob/get-name theme)
   :group (or (:group theme) "")
   :description (or (ctob/get-description theme) "")
   :path (ctob/get-theme-path theme)
   :sets (vec (sort (or (:sets theme) #{})))
   :is-source (boolean (:is-source theme))
   :hidden? (boolean (ctob/hidden-theme? theme))})

(defn tokens-summary
  "Return a headless read-only summary of the file tokens library.

  Params:
  - `:set-id` optional token set filter
  - `:include-values` when true, include raw stored token values (default false)"
  [file-data {:keys [set-id include-values]}]
  (let [include-values? (boolean include-values)
        tokens-lib (:tokens-lib file-data)
        present? (some? tokens-lib)
        empty? (or (not present?) (ctob/empty-lib? tokens-lib))
        all-sets (if empty?
                   []
                   (->> (ctob/get-sets tokens-lib)
                        (map #(token-set-summary % include-values?))
                        (sort-by :name)
                        (vec)))
        sets (if (some? set-id)
               (let [matched (filterv #(= set-id (:id %)) all-sets)]
                 (when (and present? (not empty?) (empty? matched))
                   (ex/raise :type :not-found
                             :code :token-set-not-found
                             :hint "The requested token set does not exist in this file."
                             :set-id set-id))
                 matched)
               all-sets)
        themes (if empty?
                 []
                 (->> (ctob/get-themes tokens-lib)
                      (remove ctob/hidden-theme?)
                      (map token-theme-summary)
                      (sort-by (juxt :group :name))
                      (vec)))
        active-theme-paths (if empty?
                             []
                             (->> (ctob/get-active-theme-paths tokens-lib)
                                  (remove #(= % ctob/hidden-theme-path))
                                  (sort)
                                  (vec)))
        tokens (->> sets (mapcat :tokens) (sort-by (juxt :set-id :name)) (vec))]
    {:present present?
     :empty empty?
     :include-values include-values?
     :set-count (count sets)
     :token-count (count tokens)
     :theme-count (count themes)
     :active-theme-paths active-theme-paths
     :sets sets
     :tokens tokens
     :themes themes}))

(defn- component-summary
  [component root page-id]
  {:id (:id component)
   :name (:name component)
   :path (or (:path component) "")
   :main-instance-id (:main-instance-id component)
   :main-instance-page (:main-instance-page component)
   :root-shape-id (:id root)
   :root-shape-name (:name root)
   :page-id page-id})

(defn- shape-bounds
  [shape]
  (or (try
        (gsh/shapes->rect [shape])
        (catch #?(:clj Throwable :cljs :default) _ nil))
      (let [x (or (:x shape) 0)
            y (or (:y shape) 0)
            w (or (:width shape) 0)
            h (or (:height shape) 0)]
        {:x x :y y :width w :height h
         :x1 x :y1 y :x2 (+ x w) :y2 (+ y h)})))

(defn- bounds-union
  [shapes]
  (let [rects (map shape-bounds shapes)
        x1 (apply min (map :x1 rects))
        y1 (apply min (map :y1 rects))
        x2 (apply max (map :x2 rects))
        y2 (apply max (map :y2 rects))]
    {:x x1
     :y y1
     :width (max 1 (- x2 x1))
     :height (max 1 (- y2 y1))}))

(defn- component-from-root
  [file-id page-id objects root component-name]
  (let [[path final-name] (cpn/split-group-name component-name)
        [root-shape updated-shapes] (ctn/convert-shape-in-component root objects file-id)
        component-id (:id root-shape)
        main-instance-id (:id root)
        main-root (first updated-shapes)
        shape-mod-changes
        (mapv (fn [shape]
                {:type :mod-obj
                 :page-id page-id
                 :id (:id shape)
                 :operations [{:type :set :attr :component-id :val (:component-id shape)}
                              {:type :set :attr :component-file :val (:component-file shape)}
                              {:type :set :attr :component-root :val (:component-root shape)}
                              {:type :set :attr :main-instance :val (:main-instance shape)}
                              {:type :set :attr :shape-ref :val (:shape-ref shape)}
                              {:type :set :attr :touched :val (:touched shape)}]})
              updated-shapes)
        component {:id component-id
                   :name final-name
                   :path path
                   :main-instance-id main-instance-id
                   :main-instance-page page-id}
        changes (into [{:type :add-component
                        :id component-id
                        :path path
                        :name final-name
                        :main-instance-id main-instance-id
                        :main-instance-page page-id}]
                      shape-mod-changes)]
    {:component (component-summary component main-root page-id)
     :shape (shape-summary (or main-root root) page-id)
     :changes changes}))

(defn create-component-request
  "Create a local-file component from one non-component frame, or wrap multiple
  shapes in a new frame and convert that frame into a component.

  Params:
  - `:file-id` owning file id (local library only)
  - `:page-id` page that contains the source shapes
  - `:shape-id` or `:shape-ids` one or more shape ids
  - `:name` optional component name override"
  [file-data {:keys [file-id page-id shape-id shape-ids name]}]
  (let [shape-ids (cond
                    (some? shape-id) [shape-id]
                    (sequential? shape-ids) (vec shape-ids)
                    :else [])
        _ (when (empty? shape-ids)
            (ex/raise :type :validation
                      :code :component-root-required
                      :hint "Headless component.create requires at least one shape id."))
        _ (when (> (count shape-ids) 100)
            (ex/raise :type :validation
                      :code :too-many-component-shapes
                      :hint "Headless component.create supports at most 100 source shapes."
                      :count (count shape-ids)))
        file-id (or file-id (:id file-data))]
    (when-not file-id
      (ex/raise :type :validation
                :code :file-id-required
                :hint "Headless component.create requires an explicit file id."))
    (when (some #(= % uuid/zero) shape-ids)
      (ex/raise :type :validation
                :code :unsupported-root-shape
                :hint "Headless component.create cannot target the page root frame."))
    (if (= 1 (count shape-ids))
      (let [root-shape-id (first shape-ids)
            [page-id page root] (require-shape file-data page-id root-shape-id)
            objects (:objects page)]
        (when-not (cfh/frame-shape? root)
          (ex/raise :type :validation
                    :code :unsupported-component-root-type
                    :hint "Single-shape component.create requires a frame root. Pass multiple shapes to wrap them in a new frame."
                    :shape-type (:type root)
                    :shape-id root-shape-id))
        (when (ctk/instance-head? root)
          (ex/raise :type :validation
                    :code :shape-already-component
                    :hint "The target frame is already a component instance head."
                    :shape-id root-shape-id
                    :component-id (:component-id root)))
        (let [component-name (let [raw (some-> name str/trim)]
                               (if (seq raw) raw (:name root)))]
          (component-from-root file-id page-id objects root component-name)))
      ;; Multi-shape wrap: create a board frame around the selection, reparent, convert.
      (let [resolved (mapv #(require-shape file-data page-id %) shape-ids)
            page-id (ffirst resolved)
            page (second (first resolved))
            shapes (mapv #(nth % 2) resolved)
            objects (:objects page)
            _ (when (some ctk/instance-head? shapes)
                (ex/raise :type :validation
                          :code :shape-already-component
                          :hint "Multi-shape component.create cannot include existing component instance heads."))
            bounds (bounds-union shapes)
            parent-id (or (:parent-id (first shapes)) uuid/zero)
            wrap-id (uuid/next)
            wrap-name (let [raw (some-> name str/trim)]
                        (if (seq raw) raw "Component 1"))
            wrap-frame (cts/check-shape
                        (cts/setup-shape
                         {:id wrap-id
                          :type :frame
                          :parent-id parent-id
                          :frame-id (if (= parent-id uuid/zero) uuid/zero parent-id)
                          :name wrap-name
                          :x (:x bounds)
                          :y (:y bounds)
                          :width (:width bounds)
                          :height (:height bounds)
                          :shapes []}))
            add-wrap {:type :add-obj
                      :id wrap-id
                      :page-id page-id
                      :parent-id parent-id
                      :frame-id (:frame-id wrap-frame)
                      :ignore-touched true
                      :obj wrap-frame}
            reparent-changes
            (mapv (fn [shape]
                    {:type :mov-objects
                     :page-id page-id
                     :parent-id wrap-id
                     :shapes [(:id shape)]
                     :ignore-touched true})
                  shapes)
            objects' (-> objects
                         (assoc wrap-id (assoc wrap-frame :shapes (mapv :id shapes)))
                         (as-> $
                           (reduce (fn [objs shape]
                                     (-> objs
                                         (assoc-in [(:id shape) :parent-id] wrap-id)
                                         (assoc-in [(:id shape) :frame-id] wrap-id)
                                         (assoc-in [(:id shape) :constraints-h] :scale)
                                         (assoc-in [(:id shape) :constraints-v] :scale)))
                                   $
                                   shapes)))
            wrap-root (get objects' wrap-id)
            created (component-from-root file-id page-id objects' wrap-root wrap-name)
            constraint-ops
            (mapcat (fn [shape]
                      [{:type :mod-obj
                        :page-id page-id
                        :id (:id shape)
                        :operations [{:type :set :attr :constraints-h :val :scale}
                                     {:type :set :attr :constraints-v :val :scale}]}])
                    shapes)]
        (assoc created
               :changes (into [add-wrap]
                              (concat reparent-changes
                                      constraint-ops
                                      (:changes created)))
               :wrapped true
               :source-shape-ids (mapv :id shapes))))))

(defn instantiate-component-request
  "Create a component instance copy at an explicit position.

  Params:
  - `:file-id` destination file id
  - `:page-id` destination page
  - `:component-id` component id
  - `:component-file-id` optional library file id; defaults to `:file-id`
  - `:libraries` optional map of library-id -> library (`{:id :data}`) for remote components
  - `:x` / `:y` placement point
  - `:parent-id` optional frame parent; defaults to page root
  - `:shape-id` optional forced id for the instance root"
  [file-data {:keys [file-id page-id component-id component-file-id libraries x y parent-id shape-id]}]
  (let [file-id (or file-id (:id file-data))
        component-file-id (or component-file-id file-id)
        libraries (or libraries {})]
    (when-not file-id
      (ex/raise :type :validation
                :code :file-id-required
                :hint "Headless component.instantiate requires an explicit file id."))
    (when-not component-id
      (ex/raise :type :validation
                :code :component-id-required
                :hint "Headless component.instantiate requires component-id."))
    (when (or (nil? x) (nil? y))
      (ex/raise :type :validation
                :code :component-position-required
                :hint "Headless component.instantiate requires explicit x and y coordinates."))
    (let [local? (= component-file-id file-id)
          library (if local?
                    {:id file-id :data (assoc file-data :id file-id)}
                    (get libraries component-file-id))
          library-data (if local?
                         (:data library)
                         (or (:data library) library))
          component (if local?
                      (ctkl/get-component file-data component-id)
                      (ctkl/get-component library-data component-id))]
      (when-not local?
        (when-not library
          (ex/raise :type :not-found
                    :code :component-library-not-found
                    :hint "Remote component library data was not provided or not found."
                    :component-file-id component-file-id
                    :component-id component-id)))
      (when-not component
        (ex/raise :type :not-found
                  :code :component-not-found
                  :hint "The requested component does not exist in the target library."
                  :component-id component-id
                  :component-file-id component-file-id))
      (when (:deleted component)
        (ex/raise :type :validation
                  :code :component-deleted
                  :hint "Cannot instantiate a deleted component."
                  :component-id component-id))
      (let [[page-id page] (require-page file-data page-id)
            objects (:objects page)
            parent-id (or parent-id uuid/zero)
            parent (get objects parent-id)]
        (when-not parent
          (ex/raise :type :validation
                    :code :parent-shape-not-found
                    :hint "The target parent shape does not exist."
                    :parent-id parent-id))
        (when-not (cfh/frame-shape? parent)
          (ex/raise :type :validation
                    :code :unsupported-parent-shape
                    :hint "Headless component.instantiate currently supports frame parents only."
                    :parent-id parent-id
                    :parent-type (:type parent)))
        (let [frame-id (if (cfh/frame-shape? parent)
                         (:id parent)
                         (:frame-id parent))
              library-data' (assoc library-data :id component-file-id)
              position (gpt/point x y)
              opts (cond-> {:force-frame-id frame-id
                            :force-parent-id parent-id}
                     (some? shape-id)
                     (assoc :force-id shape-id))
              [instance-root instance-shapes]
              (ctn/make-component-instance page component library-data' position opts)
              instance-root (cond-> instance-root
                              (some? parent-id)
                              (assoc :parent-id parent-id)

                              (some? frame-id)
                              (assoc :frame-id frame-id)

                              (and (some? parent) (ctn/in-any-component? objects parent))
                              (dissoc :component-root)

                              :always
                              (assoc :component-file component-file-id))
              instance-shapes (into [instance-root] (rest instance-shapes))
              changes
              (mapv (fn [shape]
                      {:type :add-obj
                       :id (:id shape)
                       :page-id page-id
                       :parent-id (or (:parent-id shape) parent-id)
                       :frame-id (or (:frame-id shape) frame-id)
                       :ignore-touched true
                       :obj shape})
                    instance-shapes)]
          {:component (assoc (component-summary component instance-root page-id)
                             :component-file-id component-file-id
                             :remote? (not local?))
           :shape (shape-summary instance-root page-id)
           :shapes (mapv #(shape-summary % page-id) instance-shapes)
           :changes changes})))))

(def ^:private headless-token-apply-attrs
  "Token attributes supported by headless tokens.apply."
  #{:fill :stroke-color :width :height :opacity
    :r1 :r2 :r3 :r4 :rotation :stroke-width
    ;; spacing
    :row-gap :column-gap :p1 :p2 :p3 :p4 :m1 :m2 :m3 :m4
    ;; typography
    :font-size :font-weight :letter-spacing :line-height :font-family
    :text-case :text-decoration :typography})

(defn- normalize-token-attrs
  [attributes]
  (let [attrs (->> attributes
                   (map (fn [attr]
                          (cond
                            (keyword? attr) attr
                            (string? attr) (keyword attr)
                            :else nil)))
                   (remove nil?)
                   (into []))]
    (when (empty? attrs)
      (ex/raise :type :validation
                :code :token-attributes-required
                :hint "Headless tokens.apply requires at least one token attribute (for example fill or width)."))
    (when-let [invalid (seq (remove headless-token-apply-attrs attrs))]
      (ex/raise :type :validation
                :code :unsupported-token-attributes
                :hint "Headless tokens.apply currently supports only a fixed attribute subset."
                :attributes (vec invalid)
                :supported (vec (sort headless-token-apply-attrs))))
    (when-let [unknown (seq (remove cto/token-attr? attrs))]
      (ex/raise :type :validation
                :code :invalid-token-attributes
                :hint "One or more token attributes are not valid Penpot token attributes."
                :attributes (vec unknown)))
    (set attrs)))

(defn- resolve-apply-token
  [tokens-lib {:keys [token-id token-name set-id set-name]}]
  (cond
    (and token-id set-id)
    (or (ctob/get-token tokens-lib set-id token-id)
        (ex/raise :type :not-found
                  :code :token-not-found
                  :hint "The requested token does not exist in the given set."
                  :set-id set-id
                  :token-id token-id))

    (and token-name set-id)
    (let [set (ctob/get-set tokens-lib set-id)]
      (or (and set (ctob/get-token-by-name- set token-name))
          (ex/raise :type :not-found
                    :code :token-not-found
                    :hint "The requested token name does not exist in the given set."
                    :set-id set-id
                    :token-name token-name)))

    (and token-name set-name)
    (or (ctob/get-token-by-name tokens-lib set-name token-name)
        (ex/raise :type :not-found
                  :code :token-not-found
                  :hint "The requested token name does not exist in the given set name."
                  :set-name set-name
                  :token-name token-name))

    token-name
    (or (get (ctob/get-all-tokens-map tokens-lib) token-name)
        (ex/raise :type :not-found
                  :code :token-not-found
                  :hint "The requested token name does not exist in this file."
                  :token-name token-name))

    :else
    (ex/raise :type :validation
              :code :token-identity-required
              :hint "Headless tokens.apply requires tokenName, or setId+tokenId, or setName+tokenName.")))

(defn- find-token-set-id
  [tokens-lib token]
  (some (fn [token-set]
          (when (some #(= (ctob/get-id %) (ctob/get-id token))
                      (vals (ctob/get-tokens- token-set)))
            (ctob/get-id token-set)))
        (ctob/get-sets tokens-lib)))

(defn- resolve-token-value*
  "Best-effort resolve of token values including simple {name} references.
  Composite map/vector values are returned as-is after recursive resolve.
  Unresolved/cyclic refs return nil."
  [tokens-lib token visited]
  (let [name (ctob/get-name token)]
    (if (contains? visited name)
      nil
      (let [visited (conj visited name)
            value (:value token)
            resolve-ref
            (fn [ref-name]
              (when-let [ref-token (get (ctob/get-all-tokens-map tokens-lib) ref-name)]
                (resolve-token-value* tokens-lib ref-token visited)))]
        (cond
          (nil? value) nil

          (string? value)
          (if-let [refs (seq (cto/find-token-value-references value))]
            (if (and (= 1 (count refs))
                     (re-matches #"^\s*\{[^}]+\}\s*$" value))
              (resolve-ref (first refs))
              ;; partial/mixed refs: leave unresolved for materialization
              value)
            value)

          (map? value)
          (into {}
                (map (fn [[k v]]
                       [k (if (string? v)
                            (if-let [refs (seq (cto/find-token-value-references v))]
                              (if (and (= 1 (count refs))
                                       (re-matches #"^\s*\{[^}]+\}\s*$" v))
                                (or (resolve-ref (first refs)) v)
                                v)
                              v)
                            v)]))
                value)

          :else value)))))

(defn- resolve-token-value
  [tokens-lib token]
  (resolve-token-value* tokens-lib token #{}))

(defn- parse-token-number
  [value]
  (cond
    (number? value) (double value)
    (string? value)
    (let [trimmed (str/trim value)
          ;; strip common unit suffixes for spacing/typography
          cleaned (str/replace trimmed #"(?i)(px|pt|em|rem)$" "")]
      (d/parse-double cleaned))
    :else nil))

(defn- ensure-layout-map
  [shape attr]
  (update shape attr #(if (map? %) % {})))

(defn- apply-resolved-token-value
  "Materialize resolved token values onto shape attrs."
  [shape attributes token resolved]
  (let [type (:type token)]
    (if (nil? resolved)
      shape
      (reduce
       (fn [shape attr]
         (case attr
           :fill
           (if (and (or (= type :color) (string? resolved))
                    (string? resolved)
                    (seq (str/trim resolved))
                    (not (cto/find-token-value-references resolved)))
             (let [fills (if (seq (:fills shape))
                           (:fills shape)
                           [{:fill-color "#000000" :fill-opacity 1}])]
               (assoc shape :fills (update fills 0 assoc :fill-color (str/trim resolved))))
             shape)

           :stroke-color
           (if (and (string? resolved)
                    (seq (str/trim resolved))
                    (not (cto/find-token-value-references resolved)))
             (let [strokes (if (seq (:strokes shape))
                             (:strokes shape)
                             [{:stroke-style :solid
                               :stroke-alignment :inner
                               :stroke-width 1
                               :stroke-color "#000000"
                               :stroke-opacity 1}])]
               (assoc shape :strokes (update strokes 0 assoc :stroke-color (str/trim resolved))))
             shape)

           :stroke-width
           (if-let [n (parse-token-number resolved)]
             (let [strokes (if (seq (:strokes shape))
                             (:strokes shape)
                             [{:stroke-style :solid
                               :stroke-alignment :inner
                               :stroke-width 1
                               :stroke-color "#000000"
                               :stroke-opacity 1}])]
               (assoc shape :strokes (update strokes 0 assoc :stroke-width (max 0 n))))
             shape)

           (:width :height :opacity :rotation :r1 :r2 :r3 :r4)
           (if-let [n (parse-token-number resolved)]
             (case attr
               :opacity (assoc shape :opacity (min 1 (max 0 n)))
               :rotation (assoc shape :rotation n)
               (assoc shape attr (max 0 n)))
             shape)

           (:row-gap :column-gap)
           (if-let [n (parse-token-number resolved)]
             (-> shape
                 (ensure-layout-map :layout-gap)
                 (assoc-in [:layout-gap (if (= attr :row-gap) :row-gap :column-gap)] (max 0 n)))
             shape)

           (:p1 :p2 :p3 :p4)
           (if-let [n (parse-token-number resolved)]
             (-> shape
                 (ensure-layout-map :layout-padding)
                 (assoc-in [:layout-padding attr] n))
             shape)

           (:m1 :m2 :m3 :m4)
           (if-let [n (parse-token-number resolved)]
             (-> shape
                 (ensure-layout-map :layout-item-margin)
                 (assoc-in [:layout-item-margin attr] n))
             shape)

           (:font-size :letter-spacing :line-height)
           (if-let [n (parse-token-number resolved)]
             (assoc shape attr n)
             (if (and (string? resolved) (not (cto/find-token-value-references resolved)))
               (assoc shape attr resolved)
               shape))

           (:font-weight :font-family :text-case :text-decoration)
           (if (and (or (string? resolved) (number? resolved))
                    (not (and (string? resolved) (cto/find-token-value-references resolved))))
             (assoc shape attr resolved)
             shape)

           ;; composite typography map applied via :typography attr
           :typography
           (if (map? resolved)
             (reduce (fn [shape [k v]]
                       (let [attr' (keyword k)]
                         (if (contains? #{:font-size :font-weight :letter-spacing :line-height
                                          :font-family :text-case :text-decoration}
                                        attr')
                           (apply-resolved-token-value shape #{attr'} token v)
                           shape)))
                     shape
                     resolved)
             shape)

           shape))
       shape
       attributes))))

(defn- shape-attr-operations
  [before after attrs]
  (->> attrs
       (keep (fn [attr]
               (let [b (get before attr)
                     a (get after attr)]
                 (when (not= b a)
                   {:type :set
                    :attr attr
                    :val a
                    :ignore-touched true}))))
       (vec)))

(defn- apply-token-to-one-shape
  [file-data page-id shape-id attributes token tokens-lib resolved]
  (when (= shape-id uuid/zero)
    (ex/raise :type :validation
              :code :unsupported-root-shape
              :hint "Headless tokens.apply cannot target the page root shape."
              :shape-id shape-id))
  (let [[page-id _page shape] (require-shape file-data page-id shape-id)
        tokenized (into {} (map (fn [attr] [attr (ctob/get-name token)]) attributes))
        shape' (-> shape
                   (update :applied-tokens #(merge (or % {}) tokenized))
                   (apply-resolved-token-value attributes token resolved))
        shape-attrs (cond-> #{:applied-tokens}
                      (contains? attributes :fill) (conj :fills)
                      (or (contains? attributes :stroke-color)
                          (contains? attributes :stroke-width)) (conj :strokes)
                      (contains? attributes :width) (conj :width)
                      (contains? attributes :height) (conj :height)
                      (contains? attributes :opacity) (conj :opacity)
                      (contains? attributes :rotation) (conj :rotation)
                      (contains? attributes :r1) (conj :r1)
                      (contains? attributes :r2) (conj :r2)
                      (contains? attributes :r3) (conj :r3)
                      (contains? attributes :r4) (conj :r4)
                      (or (contains? attributes :row-gap)
                          (contains? attributes :column-gap)) (conj :layout-gap)
                      (some attributes [:p1 :p2 :p3 :p4]) (conj :layout-padding)
                      (some attributes [:m1 :m2 :m3 :m4]) (conj :layout-item-margin)
                      (contains? attributes :font-size) (conj :font-size)
                      (contains? attributes :font-weight) (conj :font-weight)
                      (contains? attributes :letter-spacing) (conj :letter-spacing)
                      (contains? attributes :line-height) (conj :line-height)
                      (contains? attributes :font-family) (conj :font-family)
                      (contains? attributes :text-case) (conj :text-case)
                      (contains? attributes :text-decoration) (conj :text-decoration)
                      (contains? attributes :typography)
                      (into #{:font-size :font-weight :letter-spacing :line-height
                              :font-family :text-case :text-decoration}))
        operations (shape-attr-operations shape shape' shape-attrs)]
    (when (empty? operations)
      (ex/raise :type :validation
                :code :empty-token-apply
                :hint "Token apply produced no shape changes for at least one shape."
                :shape-id shape-id))
    {:shape (shape-summary shape' page-id)
     :applied-tokens (:applied-tokens shape')
     :materialized (boolean (some #(not= (:attr %) :applied-tokens) operations))
     :change {:type :mod-obj
              :page-id page-id
              :id (:id shape)
              :operations operations}}))

(defn apply-token-request
  "Apply a design token to one or more shapes for explicit token attributes.

  Params:
  - `:page-id` optional page that contains the shapes
  - `:shape-id` or `:shape-ids` one or more shape ids (max 100)
  - `:attributes` required non-empty list of token attributes
  - token identity via `:token-name`, or `:set-id` + `:token-id`, or `:set-name` + `:token-name`

  Updates `:applied-tokens` and best-effort materializes plain and simply-resolved
  color/number/spacing/typography values. Unresolved references stay bound-only."
  [file-data {:keys [page-id shape-id shape-ids attributes] :as params}]
  (let [shape-ids (cond
                    (some? shape-id) [shape-id]
                    (sequential? shape-ids) (vec shape-ids)
                    :else [])
        _ (when (empty? shape-ids)
            (ex/raise :type :validation
                      :code :token-shape-required
                      :hint "Headless tokens.apply requires at least one shape id."))
        _ (when (> (count shape-ids) 100)
            (ex/raise :type :validation
                      :code :too-many-token-shapes
                      :hint "Headless tokens.apply supports at most 100 shapes."
                      :count (count shape-ids)))
        attributes (normalize-token-attrs attributes)
        tokens-lib (:tokens-lib file-data)
        _ (when (or (nil? tokens-lib) (ctob/empty-lib? tokens-lib))
            (ex/raise :type :validation
                      :code :tokens-lib-empty
                      :hint "This file has no design tokens library to apply."))
        token (resolve-apply-token tokens-lib params)
        resolved (resolve-token-value tokens-lib token)
        results (mapv #(apply-token-to-one-shape file-data page-id % attributes token tokens-lib resolved)
                      shape-ids)
        set-id (or (:set-id params)
                   (find-token-set-id tokens-lib token))]
    {:shape (:shape (first results))
     :shapes (mapv :shape results)
     :token {:id (ctob/get-id token)
             :name (ctob/get-name token)
             :type (:type token)
             :set-id set-id
             :description (or (ctob/get-description token) "")
             :resolved-value resolved}
     :attributes (vec (sort attributes))
     :applied-tokens (:applied-tokens (first results))
     :materialized (boolean (some :materialized results))
     :changes (mapv :change results)}))

(defn- empty-groups-after-group-creation
  [objects parent-id shapes]
  (let [ids (cfh/clean-loops objects (into #{} (map :id) shapes))
        parents (into #{} (map #(cfh/get-parent-id objects %)) ids)]
    (loop [current-id (first parents)
           to-check (rest parents)
           removed-id? ids
           result #{}]
      (if-not current-id
        result
        (let [group (get objects current-id)]
          (if (and (not= :frame (:type group))
                   (not= current-id parent-id)
                   (empty? (remove removed-id? (:shapes group))))
            (let [to-check (concat to-check [(cfh/get-parent-id objects current-id)])]
              (recur (first to-check)
                     (rest to-check)
                     (conj removed-id? current-id)
                     (conj result current-id)))
            (recur (first to-check)
                   (rest to-check)
                   removed-id?
                   result)))))))

(defn group-shapes-request
  "Group one or more shapes under a new group shape.

  Params:
  - `:page-id` optional page id
  - `:shape-ids` required non-empty vector of shape ids (max 100)
  - `:name` optional group name (default \"Group\")
  - `:group-id` optional forced group id"
  [file-data {:keys [page-id shape-ids name group-id]}]
  (let [shape-ids (vec (or shape-ids []))
        _ (when (empty? shape-ids)
            (ex/raise :type :validation
                      :code :group-shapes-required
                      :hint "Headless shape.group requires at least one shape id."))
        _ (when (> (count shape-ids) 100)
            (ex/raise :type :validation
                      :code :too-many-group-shapes
                      :hint "Headless shape.group supports at most 100 shapes."
                      :count (count shape-ids)))
        _ (when (some #(= % uuid/zero) shape-ids)
            (ex/raise :type :validation
                      :code :unsupported-root-shape
                      :hint "Headless shape.group cannot include the page root shape."))
        resolved (mapv #(require-shape file-data page-id %) shape-ids)
        page-id (ffirst resolved)
        page (second (first resolved))
        objects (:objects page)
        ordered-ids (->> shape-ids
                         (cfh/clean-loops objects)
                         (cfh/order-by-indexed-shapes objects)
                         reverse
                         vec)
        shapes (->> ordered-ids
                    (map #(get objects %))
                    (remove nil?)
                    (remove ctk/is-variant?)
                    (remove #(ctn/has-any-copy-parent? objects %))
                    vec)
        _ (when (empty? shapes)
            (ex/raise :type :validation
                      :code :group-shapes-empty
                      :hint "No groupable shapes remained after filtering component-copy children and variants."))
        parent-ids (into #{} (map :parent-id) shapes)
        _ (when-not (= 1 (count parent-ids))
            (ex/raise :type :validation
                      :code :group-shapes-different-parents
                      :hint "Headless shape.group currently requires all shapes to share the same parent."
                      :parent-ids (vec parent-ids)))
        frame-ids (into #{} (map :frame-id) shapes)
        _ (when-not (= 1 (count frame-ids))
            (ex/raise :type :validation
                      :code :group-shapes-different-frames
                      :hint "Headless shape.group currently requires all shapes to share the same frame."
                      :frame-ids (vec frame-ids)))
        parent-id (first parent-ids)
        frame-id (first frame-ids)
        group-id (or group-id (uuid/next))
        group-name (let [raw (some-> name str/trim)]
                     (if (seq raw) raw "Group"))
        bounds (bounds-union shapes)
        group-idx (->> shapes
                       last
                       :id
                       (cfh/get-position-on-parent objects)
                       inc)
        group (cts/check-shape
               (cts/setup-shape
                {:id group-id
                 :type :group
                 :name group-name
                 :shapes (mapv :id shapes)
                 :x (:x bounds)
                 :y (:y bounds)
                 :width (:width bounds)
                 :height (:height bounds)
                 :parent-id parent-id
                 :frame-id frame-id}))
        ids-to-delete (empty-groups-after-group-creation objects parent-id shapes)
        add-group {:type :add-obj
                   :id group-id
                   :page-id page-id
                   :parent-id parent-id
                   :frame-id frame-id
                   :index group-idx
                   :ignore-touched true
                   :obj group}
        child-ops
        (mapv (fn [shape]
                {:type :mod-obj
                 :page-id page-id
                 :id (:id shape)
                 :operations [{:type :set :attr :constraints-h :val :scale}
                              {:type :set :attr :constraints-v :val :scale}]})
              shapes)
        reparent {:type :mov-objects
                  :page-id page-id
                  :parent-id group-id
                  :shapes (->> shapes reverse (mapv :id))
                  :ignore-touched true}
        deletes (mapv (fn [id]
                        {:type :del-obj
                         :page-id page-id
                         :id id
                         :ignore-touched true})
                      ids-to-delete)
        changes (into [add-group] (concat child-ops [reparent] deletes))]
    {:shape (shape-summary group page-id)
     :children (mapv #(shape-summary % page-id) shapes)
     :deleted-ids (vec ids-to-delete)
     :changes changes}))

(defn ungroup-shapes-request
  "Ungroup one or more group shapes, reparenting children to the group parent.

  Params:
  - `:page-id` optional page id
  - `:shape-id` or `:shape-ids` group ids to ungroup (max 100)"
  [file-data {:keys [page-id shape-id shape-ids]}]
  (let [shape-ids (cond
                    (some? shape-id) [shape-id]
                    (sequential? shape-ids) (vec shape-ids)
                    :else [])
        _ (when (empty? shape-ids)
            (ex/raise :type :validation
                      :code :ungroup-shapes-required
                      :hint "Headless shape.ungroup requires at least one group shape id."))
        _ (when (> (count shape-ids) 100)
            (ex/raise :type :validation
                      :code :too-many-ungroup-shapes
                      :hint "Headless shape.ungroup supports at most 100 groups."
                      :count (count shape-ids)))
        results
        (mapv
         (fn [group-id]
           (let [[page-id page group] (require-shape file-data page-id group-id)
                 objects (:objects page)]
             (when-not (cfh/group-shape? group)
               (ex/raise :type :validation
                         :code :unsupported-ungroup-target
                         :hint "Headless shape.ungroup currently supports group shapes only."
                         :shape-id group-id
                         :shape-type (:type group)))
             (when (ctk/instance-head? group)
               (ex/raise :type :validation
                         :code :component-cannot-ungroup
                         :hint "Component instance heads cannot be ungrouped."
                         :shape-id group-id))
             (when (ctn/has-any-copy-parent? objects group)
               (ex/raise :type :validation
                         :code :nested-copy-cannot-ungroup
                         :hint "Shapes nested under component copies cannot be ungrouped."
                         :shape-id group-id))
             (let [children (->> (:shapes group)
                                 (cfh/order-by-indexed-shapes objects)
                                 (mapv #(get objects %))
                                 (remove nil?)
                                 vec)
                   parent-id (:parent-id group)
                   parent (get objects parent-id)
                   index-in-parent
                   (->> (:shapes parent)
                        (map-indexed vector)
                        (filter #(= group-id (second %)))
                        (ffirst)
                        (some-> inc))
                   reparent {:type :mov-objects
                             :page-id page-id
                             :parent-id parent-id
                             :shapes (mapv :id children)
                             :ignore-touched true}
                   reparent (cond-> reparent
                              (some? index-in-parent)
                              (assoc :index index-in-parent))
                   delete {:type :del-obj
                           :page-id page-id
                           :id group-id
                           :ignore-touched true}]
               {:group (shape-summary group page-id)
                :children (mapv #(shape-summary % page-id) children)
                :changes [reparent delete]})))
         shape-ids)]
    {:groups (mapv :group results)
     :children (vec (mapcat :children results))
     :changes (vec (mapcat :changes results))}))
