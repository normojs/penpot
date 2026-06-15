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

(defn normalize-shape-name
  [type name]
  (let [name (some-> name str/trim)]
    (if (seq name)
      name
      (default-shape-name type))))

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

(def ^:private operation-attrs
  [:name
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
   :content])

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
   :font-size])

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

(defn- apply-shape-update
  [shape {:keys [name] :as params}]
  (-> shape
      (cond-> (contains? params :name)
        (assoc :name (normalize-updated-shape-name name)))
      (apply-geometry-update params)
      (apply-shape-style-update params)
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
