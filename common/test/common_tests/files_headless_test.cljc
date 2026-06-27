;; This Source Code Form is subject to the terms of the Mozilla Public
;; License, v. 2.0. If a copy of the MPL was not distributed with this
;; file, You can obtain one at http://mozilla.org/MPL/2.0/.
;;
;; Copyright (c) KALEIDOS INC Sucursal en España SL

(ns common-tests.files-headless-test
  (:require
   [app.common.files.changes :as cpc]
   [app.common.files.headless :as headless]
   [app.common.geom.point :as gpt]
   [app.common.types.file :as ctf]
   [app.common.types.pages-list :as ctpl]
   [app.common.types.shape.interactions :as ctsi]
   [app.common.types.text :as cttx]
   [app.common.uuid :as uuid]
   [clojure.test :as t]))

(defn- legacy-interaction-identity
  [source-id index]
  {:kind :source-index
   :source-shape-id source-id
   :interaction-index index
   :unstable true})

(defn- stable-interaction-identity
  [interaction-id source-id index]
  {:kind :stable-id
   :interaction-id interaction-id
   :source-shape-id source-id
   :interaction-index index})

(t/deftest page-summaries-preserve-file-page-order
  (let [file-id (uuid/next)
        page-a  (uuid/next)
        page-b  (uuid/next)
        data    (-> (ctf/make-file-data file-id page-a)
                    (ctpl/add-page {:id page-b :name "Second page"}))]
    (t/is (= [{:id page-a :name "Page 1"}
              {:id page-b :name "Second page"}]
             (headless/page-summaries data)))))

(t/deftest create-page-request-trims-name-and-keeps-page-id
  (let [file-id (uuid/next)
        page-a  (uuid/next)
        page-b  (uuid/next)
        data    (ctf/make-file-data file-id page-a)
        result  (headless/create-page-request data {:page-id page-b
                                                    :name "  Prototype  "})]
    (t/is (= {:id page-b :name "Prototype"} (:page result)))
    (t/is (= [{:type :add-page
               :id page-b
               :name "Prototype"}]
             (:changes result)))))

(t/deftest create-page-request-generates-default-page-name
  (let [file-id (uuid/next)
        page-a  (uuid/next)
        data    (ctf/make-file-data file-id page-a)
        result  (headless/create-page-request data {:name "  "})]
    (t/is (= "Page 2" (get-in result [:page :name])))
    (t/is (uuid? (get-in result [:page :id])))))

(t/deftest rename-page-request-trims-name-and-updates-page
  (let [file-id (uuid/next)
        page-a  (uuid/next)
        data    (ctf/make-file-data file-id page-a)
        result  (headless/rename-page-request data {:page-id page-a
                                                    :name "  Renamed page  "})
        data'   (cpc/process-changes data (:changes result))]
    (t/is (= {:id page-a :name "Renamed page"} (:page result)))
    (t/is (= [{:type :mod-page
               :id page-a
               :name "Renamed page"}]
             (:changes result)))
    (t/is (= "Renamed page" (get-in data' [:pages-index page-a :name])))))

(t/deftest rename-page-request-rejects-blank-name
  (let [file-id (uuid/next)
        page-a  (uuid/next)
        data    (ctf/make-file-data file-id page-a)]
    (t/is (thrown? #?(:clj Exception :cljs :default)
                   (headless/rename-page-request data {:page-id page-a
                                                       :name "  "})))))

(t/deftest create-shape-request-adds-top-level-frame
  (let [file-id  (uuid/next)
        page-id  (uuid/next)
        shape-id (uuid/next)
        data     (ctf/make-file-data file-id page-id)
        result   (headless/create-shape-request data {:page-id page-id
                                                      :shape-id shape-id
                                                      :type :frame
                                                      :name "  Login  "
                                                      :x 10
                                                      :y 20
                                                      :width 320
                                                      :height 640})
        data'    (cpc/process-changes data (:changes result))
        shape    (get-in data' [:pages-index page-id :objects shape-id])]
    (t/is (= {:id shape-id
              :name "Login"
              :type :frame
              :page-id page-id
              :parent-id uuid/zero
              :frame-id uuid/zero
              :x 10
              :y 20
              :width 320
              :height 640}
             (:shape result)))
    (t/is (= shape-id (:id shape)))
    (t/is (= [shape-id] (get-in data' [:pages-index page-id :objects uuid/zero :shapes])))))

(t/deftest create-shape-request-adds-rect-inside-frame
  (let [file-id  (uuid/next)
        page-id  (uuid/next)
        frame-id (uuid/next)
        rect-id  (uuid/next)
        data     (ctf/make-file-data file-id page-id)
        frame    (headless/create-shape-request data {:page-id page-id
                                                      :shape-id frame-id
                                                      :type :frame
                                                      :x 0
                                                      :y 0
                                                      :width 320
                                                      :height 640})
        data     (cpc/process-changes data (:changes frame))
        rect     (headless/create-shape-request data {:page-id page-id
                                                     :shape-id rect-id
                                                     :parent-id frame-id
                                                     :type :rect
                                                     :name "CTA"
                                                     :x 24
                                                     :y 32
                                                     :width 120
                                                     :height 40
                                                     :fill {:color "#ff00aa"
                                                            :opacity 0.5}
                                                     :border-radius 8})
        data'    (cpc/process-changes data (:changes rect))
        shape    (get-in data' [:pages-index page-id :objects rect-id])]
    (t/is (= frame-id (:parent-id shape)))
    (t/is (= frame-id (:frame-id shape)))
    (t/is (= [{:fill-color "#ff00aa" :fill-opacity 0.5}] (:fills shape)))
    (t/is (= 8 (:r1 shape) (:r2 shape) (:r3 shape) (:r4 shape)))
    (t/is (= [rect-id] (get-in data' [:pages-index page-id :objects frame-id :shapes])))))

(t/deftest create-shape-request-adds-text-content
  (let [file-id  (uuid/next)
        page-id  (uuid/next)
        text-id  (uuid/next)
        data     (ctf/make-file-data file-id page-id)
        result   (headless/create-shape-request data {:page-id page-id
                                                      :shape-id text-id
                                                      :type :text
                                                      :x 10
                                                      :y 20
                                                      :width 200
                                                      :height 32
                                                      :content "Hello CLI"
                                                      :font-size 24
                                                      :fill {:color "#112233"}})
        data'    (cpc/process-changes data (:changes result))
        shape    (get-in data' [:pages-index page-id :objects text-id])]
    (t/is (= "Hello CLI" (cttx/content->text (:content shape))))
    (t/is (= "24" (get-in shape [:content :children 0 :children 0 :font-size])))
    (t/is (= [{:fill-color "#112233" :fill-opacity 1}]
             (get-in shape [:content :children 0 :children 0 :fills])))))

(t/deftest create-image-shape-request-adds-media-backed-rect
  (let [file-id   (uuid/next)
        page-id   (uuid/next)
        frame-id  (uuid/next)
        image-id  (uuid/next)
        media-id  (uuid/next)
        object-id (uuid/next)
        media     {:id media-id
                   :file-id file-id
                   :is-local true
                   :name "hero.png"
                   :width 400
                   :height 200
                   :mtype "image/png"
                   :media-id object-id}
        data      (ctf/make-file-data file-id page-id)
        frame     (headless/create-shape-request data {:page-id page-id
                                                       :shape-id frame-id
                                                       :type :frame
                                                       :x 0
                                                       :y 0
                                                       :width 320
                                                       :height 640})
        data      (cpc/process-changes data (:changes frame))
        result    (headless/create-image-shape-request data {:page-id page-id
                                                             :shape-id image-id
                                                             :parent-id frame-id
                                                             :name "  Hero image  "
                                                             :x 12
                                                             :y 24
                                                             :width 100
                                                             :media media})
        data'     (cpc/process-changes data (:changes result))
        shape     (get-in data' [:pages-index page-id :objects image-id])
        image-ref {:id media-id
                   :name "hero.png"
                   :width 400
                   :height 200
                   :mtype "image/png"}]
    (t/is (= {:id image-id
              :name "Hero image"
              :type :rect
              :page-id page-id
              :parent-id frame-id
              :frame-id frame-id
              :x 12
              :y 24
              :width 100
              :height 50}
             (:shape result)))
    (t/is (= [{:type :add-media :object media}
              {:type :add-obj
               :id image-id
               :page-id page-id
               :parent-id frame-id
               :frame-id frame-id
               :ignore-touched true
               :obj shape}]
             (:changes result)))
    (t/is (= media (get-in data' [:media media-id])))
    (t/is (= [{:fill-opacity 1 :fill-image image-ref}] (:fills shape)))
    (t/is (= image-ref (:metadata shape)))
    (t/is (= [image-id] (get-in data' [:pages-index page-id :objects frame-id :shapes])))))

(t/deftest create-prototype-flow-request-adds-page-flow
  (let [file-id  (uuid/next)
        page-id  (uuid/next)
        frame-id (uuid/next)
        flow-id  (uuid/next)
        data     (ctf/make-file-data file-id page-id)
        frame    (headless/create-shape-request data {:page-id page-id
                                                      :shape-id frame-id
                                                      :type :frame
                                                      :name "Checkout"
                                                      :x 0
                                                      :y 0
                                                      :width 320
                                                      :height 640})
        data     (cpc/process-changes data (:changes frame))
        result   (headless/create-prototype-flow-request data {:page-id page-id
                                                               :flow-id flow-id
                                                               :name "  Checkout flow  "
                                                               :starting-board-id frame-id})
        data'    (cpc/process-changes data (:changes result))
        flow     {:id flow-id
                  :name "Checkout flow"
                  :starting-frame frame-id}]
    (t/is (= {:id flow-id
              :name "Checkout flow"
              :page-id page-id
              :starting-board-id frame-id
              :starting-board-name "Checkout"}
             (:flow result)))
    (t/is (= [{:type :set-flow
               :page-id page-id
               :id flow-id
               :params flow}]
             (:changes result)))
    (t/is (= flow (get-in data' [:pages-index page-id :flows flow-id])))))

(t/deftest create-prototype-interaction-request-adds-navigate-interaction
  (let [file-id  (uuid/next)
        page-id  (uuid/next)
        frame-a  (uuid/next)
        frame-b  (uuid/next)
        rect-id  (uuid/next)
        data     (ctf/make-file-data file-id page-id)
        frame-a-result (headless/create-shape-request data {:page-id page-id
                                                            :shape-id frame-a
                                                            :type :frame
                                                            :name "Start"
                                                            :x 0
                                                            :y 0
                                                            :width 320
                                                            :height 640})
        data     (cpc/process-changes data (:changes frame-a-result))
        frame-b-result (headless/create-shape-request data {:page-id page-id
                                                            :shape-id frame-b
                                                            :type :frame
                                                            :name "Done"
                                                            :x 360
                                                            :y 0
                                                            :width 320
                                                            :height 640})
        data     (cpc/process-changes data (:changes frame-b-result))
        rect     (headless/create-shape-request data {:page-id page-id
                                                     :shape-id rect-id
                                                     :parent-id frame-a
                                                     :type :rect
                                                     :name "CTA"
                                                     :x 24
                                                     :y 32
                                                     :width 120
                                                     :height 40})
        data     (cpc/process-changes data (:changes rect))
        result   (headless/create-prototype-interaction-request
                  data
                  {:page-id page-id
                   :source-shape-id rect-id
                   :destination-board-id frame-b
                   :trigger "mouse-enter"
                   :preserve-scroll-position true
                   :animation {:type "slide"
                               :duration 250
                               :easing "ease-in-out"
                               :direction "right"
                               :way "in"
                               :offsetEffect true}})
        data'    (cpc/process-changes data (:changes result))
        interactions (get-in data' [:pages-index page-id :objects rect-id :interactions])
        interaction  (first interactions)]
    (t/is (= {:source-shape-id rect-id
              :source-shape-name "CTA"
              :index 0
              :identity (legacy-interaction-identity rect-id 0)
              :trigger :mouse-enter
              :delay nil
              :action-type :navigate-to
              :destination-board-id frame-b
              :destination-board-name "Done"}
             (:interaction result)))
    (t/is (= 1 (count interactions)))
    (t/is (= :mouse-enter (:event-type interaction)))
    (t/is (= :navigate (:action-type interaction)))
    (t/is (= frame-b (:destination interaction)))
    (t/is (= true (:preserve-scroll interaction)))
    (t/is (= {:animation-type :slide
              :duration 250
              :easing :ease-in-out
              :way :in
              :direction :right
              :offset-effect true}
             (:animation interaction)))))

(t/deftest prototype-interactions-summary-lists-flows-and-navigate-interactions
  (let [file-id  (uuid/next)
        page-id  (uuid/next)
        frame-a  (uuid/next)
        frame-b  (uuid/next)
        rect-id  (uuid/next)
        flow-id  (uuid/next)
        stable-interaction-id (uuid/next)
        data     (ctf/make-file-data file-id page-id)
        frame-a-result (headless/create-shape-request data {:page-id page-id
                                                            :shape-id frame-a
                                                            :type :frame
                                                            :name "Start"
                                                            :x 0
                                                            :y 0
                                                            :width 320
                                                            :height 640})
        data     (cpc/process-changes data (:changes frame-a-result))
        frame-b-result (headless/create-shape-request data {:page-id page-id
                                                            :shape-id frame-b
                                                            :type :frame
                                                            :name "Done"
                                                            :x 360
                                                            :y 0
                                                            :width 320
                                                            :height 640})
        data     (cpc/process-changes data (:changes frame-b-result))
        rect     (headless/create-shape-request data {:page-id page-id
                                                     :shape-id rect-id
                                                     :parent-id frame-a
                                                     :type :rect
                                                     :name "CTA"
                                                     :x 24
                                                     :y 32
                                                     :width 120
                                                     :height 40})
        data     (cpc/process-changes data (:changes rect))
        flow     (headless/create-prototype-flow-request data {:page-id page-id
                                                               :flow-id flow-id
                                                               :name "Checkout flow"
                                                               :starting-board-id frame-a})
        data     (cpc/process-changes data (:changes flow))
        interaction (headless/create-prototype-interaction-request
                     data
                     {:page-id page-id
                      :source-shape-id rect-id
                      :destination-board-id frame-b
                      :trigger :click})
        data     (cpc/process-changes data (:changes interaction))
        open-overlay {:id stable-interaction-id
                      :action-type :open-overlay
                      :event-type :mouse-enter
                      :destination frame-b
                      :position-relative-to rect-id
                      :overlay-pos-type :manual
                      :overlay-position (gpt/point 12 16)
                      :close-click-outside true
                      :background-overlay true
                      :animation {:animation-type :dissolve
                                  :duration 300
                                  :easing :linear}}
        toggle-overlay {:action-type :toggle-overlay
                        :event-type :mouse-leave
                        :destination frame-b
                        :overlay-pos-type :bottom-right
                        :overlay-position (gpt/point 0 0)
                        :close-click-outside false
                        :background-overlay false}
        close-overlay {:action-type :close-overlay
                       :event-type :click
                       :destination frame-b
                       :animation {:animation-type :slide
                                   :duration 250
                                   :easing :ease-in-out
                                   :way :in
                                   :direction :left
                                   :offset-effect false}}
        data     (cpc/process-changes
                  data
                  [{:type :mod-obj
                    :id rect-id
                    :page-id page-id
                    :operations [{:type :set
                                  :attr :interactions
                                  :val (-> (get-in data [:pages-index page-id :objects rect-id :interactions])
                                           (ctsi/add-interaction open-overlay)
                                           (ctsi/add-interaction toggle-overlay)
                                           (ctsi/add-interaction close-overlay))}]}])
        summary  (headless/prototype-interactions-summary data {:page-id page-id})
        filtered (headless/prototype-interactions-summary data {:page-id page-id
                                                               :flow-id flow-id
                                                               :source-shape-id rect-id})]
    (t/is (= [{:id flow-id
               :name "Checkout flow"
               :page-id page-id
               :starting-board-id frame-a
               :starting-board-name "Start"}]
             (:flows summary)))
    (t/is (= [{:source-shape-id rect-id
               :source-shape-name "CTA"
               :index 0
               :identity (legacy-interaction-identity rect-id 0)
               :trigger :click
               :delay nil
               :action-type :navigate-to
               :destination-board-id frame-b
               :destination-board-name "Done"}
              {:interaction-id stable-interaction-id
               :source-shape-id rect-id
               :source-shape-name "CTA"
               :index 1
               :identity (stable-interaction-identity stable-interaction-id rect-id 1)
               :trigger :mouse-enter
               :delay nil
               :action-type :open-overlay
               :destination-board-id frame-b
               :destination-board-name "Done"
               :relative-to-shape-id rect-id
               :relative-to-shape-name "CTA"
               :overlay-position-type :manual
               :overlay-position (gpt/point 12 16)
               :close-click-outside true
               :background-overlay true
               :animation {:animation-type :dissolve
                           :duration 300
                           :easing :linear}}
              {:source-shape-id rect-id
               :source-shape-name "CTA"
               :index 2
               :identity (legacy-interaction-identity rect-id 2)
               :trigger :mouse-leave
               :delay nil
               :action-type :toggle-overlay
               :destination-board-id frame-b
               :destination-board-name "Done"
               :overlay-position-type :bottom-right
               :overlay-position (gpt/point 0 0)
               :close-click-outside false
               :background-overlay false}
              {:source-shape-id rect-id
               :source-shape-name "CTA"
               :index 3
               :identity (legacy-interaction-identity rect-id 3)
               :trigger :click
               :delay nil
               :action-type :close-overlay
               :destination-board-id frame-b
               :destination-board-name "Done"
               :animation {:animation-type :slide
                           :duration 250
                           :easing :ease-in-out
                           :way :in
                           :direction :left
                           :offset-effect false}}]
             (:interactions summary)))
    (t/is (= summary filtered))
    (t/is (= {:flows [] :interactions []}
             (headless/prototype-interactions-summary data {:flow-id (uuid/next)
                                                            :source-shape-id (uuid/next)})))))

(t/deftest prototype-overlay-create-contract-defines-supported-payload
  (t/is (= #{:open-overlay :toggle-overlay :close-overlay}
           (:action-types headless/prototype-overlay-create-contract)))
  (t/is (= #{:file-id :page-id :source-shape-id :action-type}
           (get-in headless/prototype-overlay-create-contract [:required :all])))
  (t/is (= #{:destination-board-id}
           (get-in headless/prototype-overlay-create-contract [:required :open-overlay])))
  (t/is (= #{:destination-board-id}
           (get-in headless/prototype-overlay-create-contract [:required :toggle-overlay])))
  (t/is (= #{}
           (get-in headless/prototype-overlay-create-contract [:required :close-overlay])))
  (t/is (= {:trigger :click
            :overlay-position-type :center
            :close-click-outside false
            :background-overlay false}
           (:defaults headless/prototype-overlay-create-contract)))
  (t/is (= {:required-when {:overlay-position-type :manual}
            :shape #{:x :y}}
           (:manual-position headless/prototype-overlay-create-contract)))
  (t/is (= #{:push}
           (get-in headless/prototype-overlay-create-contract [:unsupported :animation-types]))))

(t/deftest create-prototype-overlay-request-adds-open-toggle-and-close-interactions
  (let [file-id  (uuid/next)
        page-id  (uuid/next)
        frame-a  (uuid/next)
        frame-b  (uuid/next)
        rect-id  (uuid/next)
        data     (ctf/make-file-data file-id page-id)
        frame-a-result (headless/create-shape-request data {:page-id page-id
                                                            :shape-id frame-a
                                                            :type :frame
                                                            :name "Start"
                                                            :x 0
                                                            :y 0
                                                            :width 320
                                                            :height 640})
        data     (cpc/process-changes data (:changes frame-a-result))
        frame-b-result (headless/create-shape-request data {:page-id page-id
                                                            :shape-id frame-b
                                                            :type :frame
                                                            :name "Overlay"
                                                            :x 360
                                                            :y 0
                                                            :width 200
                                                            :height 160})
        data     (cpc/process-changes data (:changes frame-b-result))
        rect     (headless/create-shape-request data {:page-id page-id
                                                     :shape-id rect-id
                                                     :parent-id frame-a
                                                     :type :rect
                                                     :name "CTA"
                                                     :x 24
                                                     :y 32
                                                     :width 120
                                                     :height 40})
        data     (cpc/process-changes data (:changes rect))
        open-result (headless/create-prototype-overlay-request
                     data
                     {:page-id page-id
                      :source-shape-id rect-id
                      :action-type :open-overlay
                      :destination-board-id frame-b})
        data     (cpc/process-changes data (:changes open-result))
        toggle-result (headless/create-prototype-overlay-request
                       data
                       {:page-id page-id
                        :source-shape-id rect-id
                        :action-type :toggle-overlay
                        :destination-board-id frame-b
                        :relative-to-shape-id rect-id
                        :overlay-position-type :manual
                        :manual-position {:x 12 :y 16}
                        :close-click-outside true
                        :background-overlay true
                        :trigger :mouse-enter
                        :animation {:type :dissolve
                                    :duration 300
                                    :easing :linear}})
        data     (cpc/process-changes data (:changes toggle-result))
        close-result (headless/create-prototype-overlay-request
                      data
                      {:page-id page-id
                       :source-shape-id rect-id
                       :action-type :close-overlay})
        data     (cpc/process-changes data (:changes close-result))
        delete-result (headless/delete-prototype-interaction-request
                       data
                       {:page-id page-id
                        :source-shape-id rect-id
                        :interaction-index 1})
        data     (cpc/process-changes data (:changes delete-result))]
    (t/is (= {:source-shape-id rect-id
              :source-shape-name "CTA"
              :index 0
              :identity (legacy-interaction-identity rect-id 0)
              :trigger :click
              :delay nil
              :action-type :open-overlay
              :destination-board-id frame-b
              :destination-board-name "Overlay"
              :overlay-position-type :center
              :overlay-position (gpt/point 0 0)
              :close-click-outside false
              :background-overlay false}
             (:interaction open-result)))
    (t/is (= {:source-shape-id rect-id
              :source-shape-name "CTA"
              :index 1
              :identity (legacy-interaction-identity rect-id 1)
              :trigger :mouse-enter
              :delay nil
              :action-type :toggle-overlay
              :destination-board-id frame-b
              :destination-board-name "Overlay"
              :relative-to-shape-id rect-id
              :relative-to-shape-name "CTA"
              :overlay-position-type :manual
              :overlay-position (gpt/point 12 16)
              :close-click-outside true
              :background-overlay true
              :animation {:animation-type :dissolve
                          :duration 300
                          :easing :linear}}
             (:interaction toggle-result)))
    (t/is (= {:source-shape-id rect-id
              :source-shape-name "CTA"
              :index 2
              :identity (legacy-interaction-identity rect-id 2)
              :trigger :click
              :delay nil
              :action-type :close-overlay}
             (:interaction close-result)))
    (t/is (= (:interaction toggle-result)
             (:interaction delete-result)))
    (t/is (= [:open-overlay :close-overlay]
             (mapv :action-type
                   (get-in data [:pages-index page-id :objects rect-id :interactions]))))))

(t/deftest create-prototype-overlay-request-rejects-unsupported-animation
  (let [file-id  (uuid/next)
        page-id  (uuid/next)
        frame-a  (uuid/next)
        frame-b  (uuid/next)
        rect-id  (uuid/next)
        data     (ctf/make-file-data file-id page-id)
        frame-a-result (headless/create-shape-request data {:page-id page-id
                                                            :shape-id frame-a
                                                            :type :frame
                                                            :name "Start"
                                                            :x 0
                                                            :y 0
                                                            :width 320
                                                            :height 640})
        data     (cpc/process-changes data (:changes frame-a-result))
        frame-b-result (headless/create-shape-request data {:page-id page-id
                                                            :shape-id frame-b
                                                            :type :frame
                                                            :name "Overlay"
                                                            :x 360
                                                            :y 0
                                                            :width 200
                                                            :height 160})
        data     (cpc/process-changes data (:changes frame-b-result))
        rect     (headless/create-shape-request data {:page-id page-id
                                                     :shape-id rect-id
                                                     :parent-id frame-a
                                                     :type :rect
                                                     :name "CTA"
                                                     :x 24
                                                     :y 32
                                                     :width 120
                                                     :height 40})
        data     (cpc/process-changes data (:changes rect))]
    (t/is (thrown? #?(:clj Exception :cljs :default)
                   (headless/create-prototype-overlay-request
                    data
                    {:page-id page-id
                     :source-shape-id rect-id
                     :action-type :open-overlay
                     :destination-board-id frame-b
                     :animation {:type :push
                                 :duration 300}})))))

(t/deftest delete-prototype-interaction-request-removes-interaction-by-index
  (let [file-id  (uuid/next)
        page-id  (uuid/next)
        frame-a  (uuid/next)
        frame-b  (uuid/next)
        frame-c  (uuid/next)
        rect-id  (uuid/next)
        data     (ctf/make-file-data file-id page-id)
        frame-a-result (headless/create-shape-request data {:page-id page-id
                                                            :shape-id frame-a
                                                            :type :frame
                                                            :name "Start"
                                                            :x 0
                                                            :y 0
                                                            :width 320
                                                            :height 640})
        data     (cpc/process-changes data (:changes frame-a-result))
        frame-b-result (headless/create-shape-request data {:page-id page-id
                                                            :shape-id frame-b
                                                            :type :frame
                                                            :name "Middle"
                                                            :x 360
                                                            :y 0
                                                            :width 320
                                                            :height 640})
        data     (cpc/process-changes data (:changes frame-b-result))
        frame-c-result (headless/create-shape-request data {:page-id page-id
                                                            :shape-id frame-c
                                                            :type :frame
                                                            :name "Done"
                                                            :x 720
                                                            :y 0
                                                            :width 320
                                                            :height 640})
        data     (cpc/process-changes data (:changes frame-c-result))
        rect     (headless/create-shape-request data {:page-id page-id
                                                     :shape-id rect-id
                                                     :parent-id frame-a
                                                     :type :rect
                                                     :name "CTA"
                                                     :x 24
                                                     :y 32
                                                     :width 120
                                                     :height 40})
        data     (cpc/process-changes data (:changes rect))
        first-interaction (headless/create-prototype-interaction-request
                           data
                           {:page-id page-id
                            :source-shape-id rect-id
                            :destination-board-id frame-b
                            :trigger :click})
        data     (cpc/process-changes data (:changes first-interaction))
        second-interaction (headless/create-prototype-interaction-request
                            data
                            {:page-id page-id
                             :source-shape-id rect-id
                             :destination-board-id frame-c
                             :trigger :mouse-enter})
        data     (cpc/process-changes data (:changes second-interaction))
        result   (headless/delete-prototype-interaction-request
                  data
                  {:page-id page-id
                   :source-shape-id rect-id
                   :interaction-index 0})
        data'    (cpc/process-changes data (:changes result))
        interactions (get-in data' [:pages-index page-id :objects rect-id :interactions])]
    (t/is (= {:source-shape-id rect-id
              :source-shape-name "CTA"
              :index 0
              :identity (legacy-interaction-identity rect-id 0)
              :trigger :click
              :delay nil
              :action-type :navigate-to
              :destination-board-id frame-b
              :destination-board-name "Middle"}
             (:interaction result)))
    (t/is (= [{:type :mod-obj
               :id rect-id
               :page-id page-id
               :operations [{:type :set
                             :attr :interactions
                             :val (get-in result [:changes 0 :operations 0 :val])}]}]
             (:changes result)))
    (t/is (= 1 (count interactions)))
    (t/is (= frame-c (:destination (first interactions))))))

(t/deftest delete-prototype-interaction-request-rejects-stale-index
  (let [file-id  (uuid/next)
        page-id  (uuid/next)
        frame-id (uuid/next)
        rect-id  (uuid/next)
        data     (ctf/make-file-data file-id page-id)
        frame    (headless/create-shape-request data {:page-id page-id
                                                      :shape-id frame-id
                                                      :type :frame
                                                      :name "Start"
                                                      :x 0
                                                      :y 0
                                                      :width 320
                                                      :height 640})
        data     (cpc/process-changes data (:changes frame))
        rect     (headless/create-shape-request data {:page-id page-id
                                                     :shape-id rect-id
                                                     :parent-id frame-id
                                                     :type :rect
                                                     :name "CTA"
                                                     :x 24
                                                     :y 32
                                                     :width 120
                                                     :height 40})
        data     (cpc/process-changes data (:changes rect))]
    (t/is (thrown? #?(:clj Exception :cljs :default)
                   (headless/delete-prototype-interaction-request
                    data
                    {:page-id page-id
                     :source-shape-id rect-id
                     :interaction-index 0})))))

(t/deftest delete-prototype-interaction-request-rejects-missing-source
  (let [file-id (uuid/next)
        page-id (uuid/next)
        data    (ctf/make-file-data file-id page-id)]
    (t/is (thrown? #?(:clj Exception :cljs :default)
                   (headless/delete-prototype-interaction-request
                    data
                    {:page-id page-id
                     :source-shape-id (uuid/next)
                     :interaction-index 0})))))

(t/deftest update-shape-request-updates-geometry-and-style
  (let [file-id  (uuid/next)
        page-id  (uuid/next)
        frame-id (uuid/next)
        rect-id  (uuid/next)
        data     (ctf/make-file-data file-id page-id)
        frame    (headless/create-shape-request data {:page-id page-id
                                                      :shape-id frame-id
                                                      :type :frame
                                                      :x 0
                                                      :y 0
                                                      :width 320
                                                      :height 640})
        data     (cpc/process-changes data (:changes frame))
        rect     (headless/create-shape-request data {:page-id page-id
                                                     :shape-id rect-id
                                                     :parent-id frame-id
                                                     :type :rect
                                                     :x 24
                                                     :y 32
                                                     :width 120
                                                     :height 40})
        data     (cpc/process-changes data (:changes rect))
        update   (headless/update-shape-request data {:shape-id rect-id
                                                      :name "  Primary CTA  "
                                                      :x 40
                                                      :y 56
                                                      :width 160
                                                      :height 48
                                                      :fill {:color "#abcdef"
                                                             :opacity 0.8}
                                                      :stroke {:color "#111111"
                                                               :opacity 0.4
                                                               :width 2
                                                               :style :dashed
                                                               :alignment :inner}
                                                      :border-radius 12})
        data'    (cpc/process-changes data (:changes update))
        shape    (get-in data' [:pages-index page-id :objects rect-id])]
    (t/is (= {:id rect-id
              :name "Primary CTA"
              :type :rect
              :page-id page-id
              :parent-id frame-id
              :frame-id frame-id
              :x 40
              :y 56
              :width 160
              :height 48}
             (:shape update)))
    (t/is (= 40 (:x (:selrect shape))))
    (t/is (= 56 (:y (:selrect shape))))
    (t/is (= 160 (:width (:selrect shape))))
    (t/is (= 48 (:height (:selrect shape))))
    (t/is (= [{:fill-color "#abcdef" :fill-opacity 0.8}] (:fills shape)))
    (t/is (= [{:stroke-color "#111111"
               :stroke-opacity 0.4
               :stroke-width 2
               :stroke-style :dashed
               :stroke-alignment :inner}]
             (:strokes shape)))
    (t/is (= 12 (:r1 shape) (:r2 shape) (:r3 shape) (:r4 shape)))))

(t/deftest update-shape-request-updates-rich-style-fields
  (let [file-id  (uuid/next)
        page-id  (uuid/next)
        frame-id (uuid/next)
        rect-id  (uuid/next)
        data     (ctf/make-file-data file-id page-id)
        frame    (headless/create-shape-request data {:page-id page-id
                                                      :shape-id frame-id
                                                      :type :frame
                                                      :x 0
                                                      :y 0
                                                      :width 320
                                                      :height 640})
        data     (cpc/process-changes data (:changes frame))
        rect     (headless/create-shape-request data {:page-id page-id
                                                     :shape-id rect-id
                                                     :parent-id frame-id
                                                     :type :rect
                                                     :x 24
                                                     :y 32
                                                     :width 120
                                                     :height 40})
        data     (cpc/process-changes data (:changes rect))
        update   (headless/update-shape-request data {:shape-id rect-id
                                                      :fills [{:color "#abcdef"
                                                               :opacity 0.8}
                                                              {:color "#112233"}]
                                                      :strokes [{:color "#111111"
                                                                 :width 2}
                                                                {:color "#222222"
                                                                 :opacity 0.5
                                                                 :style :dotted
                                                                 :alignment :outer}]
                                                      :border-radius 6
                                                      :r2 8
                                                      :r3 10
                                                      :r4 12})
        data'    (cpc/process-changes data (:changes update))
        shape    (get-in data' [:pages-index page-id :objects rect-id])]
    (t/is (= [{:fill-color "#abcdef" :fill-opacity 0.8}
              {:fill-color "#112233" :fill-opacity 1}]
             (:fills shape)))
    (t/is (= [{:stroke-color "#111111"
               :stroke-opacity 1
               :stroke-width 2
               :stroke-style :solid
               :stroke-alignment :center}
              {:stroke-color "#222222"
               :stroke-opacity 0.5
               :stroke-width 1
               :stroke-style :dotted
               :stroke-alignment :outer}]
             (:strokes shape)))
    (t/is (= 6 (:r1 shape)))
    (t/is (= 8 (:r2 shape)))
    (t/is (= 10 (:r3 shape)))
    (t/is (= 12 (:r4 shape)))))

(t/deftest update-shape-request-updates-frame-flex-layout
  (let [file-id      (uuid/next)
        page-id      (uuid/next)
        frame-id     (uuid/next)
        rect-id      (uuid/next)
        layout-attrs [:layout
                      :layout-flex-dir
                      :layout-gap
                      :layout-gap-type
                      :layout-wrap-type
                      :layout-padding-type
                      :layout-padding
                      :layout-justify-content
                      :layout-align-content
                      :layout-align-items]
        data         (ctf/make-file-data file-id page-id)
        frame        (headless/create-shape-request data {:page-id page-id
                                                          :shape-id frame-id
                                                          :type :frame
                                                          :x 0
                                                          :y 0
                                                          :width 320
                                                          :height 640})
        data         (cpc/process-changes data (:changes frame))
        rect         (headless/create-shape-request data {:page-id page-id
                                                         :shape-id rect-id
                                                         :parent-id frame-id
                                                         :type :rect
                                                         :x 24
                                                         :y 32
                                                         :width 120
                                                         :height 40})
        data         (cpc/process-changes data (:changes rect))
        update       (headless/update-shape-request data {:shape-id frame-id
                                                          :layout {:type "flex"
                                                                   :direction "column"
                                                                   :wrap "wrap"
                                                                   :alignItems "center"
                                                                   :justifyContent "space-between"
                                                                   :rowGap 12
                                                                   :columnGap 8
                                                                   :padding 16}})
        data'        (cpc/process-changes data (:changes update))
        frame'       (get-in data' [:pages-index page-id :objects frame-id])
        remove       (headless/update-shape-request data' {:shape-id frame-id
                                                           :layout {:type :none}})
        data''       (cpc/process-changes data' (:changes remove))
        frame''      (get-in data'' [:pages-index page-id :objects frame-id])]
    (t/is (= :flex (:layout frame')))
    (t/is (= :column (:layout-flex-dir frame')))
    (t/is (= :wrap (:layout-wrap-type frame')))
    (t/is (= :center (:layout-align-items frame')))
    (t/is (= :space-between (:layout-justify-content frame')))
    (t/is (= :stretch (:layout-align-content frame')))
    (t/is (= :multiple (:layout-gap-type frame')))
    (t/is (= {:row-gap 12 :column-gap 8} (:layout-gap frame')))
    (t/is (= :simple (:layout-padding-type frame')))
    (t/is (= {:p1 16 :p2 16 :p3 16 :p4 16} (:layout-padding frame')))
    (t/is (every? #(not (contains? frame'' %)) layout-attrs))
    (t/is (thrown? #?(:clj Exception :cljs :default)
                   (headless/update-shape-request data {:shape-id rect-id
                                                        :layout {:type :flex}})))))

(t/deftest update-shape-request-updates-frame-grid-layout-subset
  (let [file-id  (uuid/next)
        page-id  (uuid/next)
        frame-id (uuid/next)
        data     (ctf/make-file-data file-id page-id)
        frame    (headless/create-shape-request data {:page-id page-id
                                                      :shape-id frame-id
                                                      :type :frame
                                                      :x 0
                                                      :y 0
                                                      :width 320
                                                      :height 640})
        data     (cpc/process-changes data (:changes frame))
        update   (headless/update-shape-request data {:shape-id frame-id
                                                      :layout {:type "grid"
                                                               :direction "column"
                                                               :alignItems "center"
                                                               :justifyItems "stretch"
                                                               :alignContent "space-between"
                                                               :justifyContent "space-evenly"
                                                               :rowGap 20
                                                               :columnGap 12
                                                               :padding 24
                                                               :rows [{:type "fixed" :value 120}
                                                                      {:type "flex" :value 1}]
                                                               :columns [{:type "percent" :value 50}
                                                                         {:type "auto"}]}})
        data'    (cpc/process-changes data (:changes update))
        frame'   (get-in data' [:pages-index page-id :objects frame-id])]
    (t/is (= :grid (:layout frame')))
    (t/is (= :column (:layout-grid-dir frame')))
    (t/is (= :center (:layout-align-items frame')))
    (t/is (= :stretch (:layout-justify-items frame')))
    (t/is (= :space-between (:layout-align-content frame')))
    (t/is (= :space-evenly (:layout-justify-content frame')))
    (t/is (= :multiple (:layout-gap-type frame')))
    (t/is (= {:row-gap 20 :column-gap 12} (:layout-gap frame')))
    (t/is (= :simple (:layout-padding-type frame')))
    (t/is (= {:p1 24 :p2 24 :p3 24 :p4 24} (:layout-padding frame')))
    (t/is (= [{:type :fixed :value 120}
              {:type :flex :value 1}]
             (:layout-grid-rows frame')))
    (t/is (= [{:type :percent :value 50}
              {:type :auto}]
             (:layout-grid-columns frame')))
    (t/is (= {} (:layout-grid-cells frame')))))

(t/deftest update-shape-request-moves-shape-between-frames
  (let [file-id    (uuid/next)
        page-id    (uuid/next)
        frame-a-id (uuid/next)
        frame-b-id (uuid/next)
        rect-id    (uuid/next)
        data       (ctf/make-file-data file-id page-id)
        frame-a    (headless/create-shape-request data {:page-id page-id
                                                        :shape-id frame-a-id
                                                        :type :frame
                                                        :name "A"
                                                        :x 0
                                                        :y 0
                                                        :width 320
                                                        :height 640})
        data       (cpc/process-changes data (:changes frame-a))
        frame-b    (headless/create-shape-request data {:page-id page-id
                                                        :shape-id frame-b-id
                                                        :type :frame
                                                        :name "B"
                                                        :x 360
                                                        :y 0
                                                        :width 320
                                                        :height 640})
        data       (cpc/process-changes data (:changes frame-b))
        rect       (headless/create-shape-request data {:page-id page-id
                                                       :shape-id rect-id
                                                       :parent-id frame-a-id
                                                       :type :rect
                                                       :x 24
                                                       :y 32
                                                       :width 120
                                                       :height 40})
        data       (cpc/process-changes data (:changes rect))
        update     (headless/update-shape-request data {:shape-id rect-id
                                                        :parent-id frame-b-id
                                                        :index 0})
        data'      (cpc/process-changes data (:changes update))
        shape      (get-in data' [:pages-index page-id :objects rect-id])]
    (t/is (= frame-b-id (get-in update [:shape :parent-id])))
    (t/is (= frame-b-id (get-in update [:shape :frame-id])))
    (t/is (= [{:type :mov-objects
               :parent-id frame-b-id
               :shapes [rect-id]
               :ignore-touched true
               :index 0
               :page-id page-id}]
             (:changes update)))
    (t/is (= [] (get-in data' [:pages-index page-id :objects frame-a-id :shapes])))
    (t/is (= [rect-id] (get-in data' [:pages-index page-id :objects frame-b-id :shapes])))
    (t/is (= frame-b-id (:parent-id shape)))
    (t/is (= frame-b-id (:frame-id shape)))))

(t/deftest update-shape-request-rejects-frame-reparenting
  (let [file-id    (uuid/next)
        page-id    (uuid/next)
        frame-a-id (uuid/next)
        frame-b-id (uuid/next)
        data       (ctf/make-file-data file-id page-id)
        frame-a    (headless/create-shape-request data {:page-id page-id
                                                        :shape-id frame-a-id
                                                        :type :frame
                                                        :x 0
                                                        :y 0
                                                        :width 320
                                                        :height 640})
        data       (cpc/process-changes data (:changes frame-a))
        frame-b    (headless/create-shape-request data {:page-id page-id
                                                        :shape-id frame-b-id
                                                        :type :frame
                                                        :x 360
                                                        :y 0
                                                        :width 320
                                                        :height 640})
        data       (cpc/process-changes data (:changes frame-b))]
    (t/is (thrown? #?(:clj Exception :cljs :default)
                   (headless/update-shape-request data {:shape-id frame-a-id
                                                        :parent-id frame-b-id})))))

(t/deftest update-shape-request-updates-text-content
  (let [file-id (uuid/next)
        page-id (uuid/next)
        text-id (uuid/next)
        data    (ctf/make-file-data file-id page-id)
        text    (headless/create-shape-request data {:page-id page-id
                                                     :shape-id text-id
                                                     :type :text
                                                     :x 10
                                                     :y 20
                                                     :width 200
                                                     :height 32
                                                     :content "Hello CLI"
                                                     :font-size 24
                                                     :fill {:color "#112233"}})
        data    (cpc/process-changes data (:changes text))
        update  (headless/update-shape-request data {:page-id page-id
                                                     :shape-id text-id
                                                     :content "  Updated CLI  "
                                                     :font-size 30
                                                     :fill {:color "#445566"}})
        data'   (cpc/process-changes data (:changes update))
        shape   (get-in data' [:pages-index page-id :objects text-id])]
    (t/is (= text-id (get-in update [:shape :id])))
    (t/is (= "Updated CLI" (cttx/content->text (:content shape))))
    (t/is (= "30" (get-in shape [:content :children 0 :children 0 :font-size])))
    (t/is (= [{:fill-color "#445566" :fill-opacity 1}]
             (get-in shape [:content :children 0 :children 0 :fills])))))

(t/deftest delete-shape-request-removes-shape-from-parent
  (let [file-id  (uuid/next)
        page-id  (uuid/next)
        frame-id (uuid/next)
        rect-id  (uuid/next)
        data     (ctf/make-file-data file-id page-id)
        frame    (headless/create-shape-request data {:page-id page-id
                                                      :shape-id frame-id
                                                      :type :frame
                                                      :x 0
                                                      :y 0
                                                      :width 320
                                                      :height 640})
        data     (cpc/process-changes data (:changes frame))
        rect     (headless/create-shape-request data {:page-id page-id
                                                     :shape-id rect-id
                                                     :parent-id frame-id
                                                     :type :rect
                                                     :x 24
                                                     :y 32
                                                     :width 120
                                                     :height 40})
        data     (cpc/process-changes data (:changes rect))
        delete   (headless/delete-shape-request data {:shape-id rect-id})
        data'    (cpc/process-changes data (:changes delete))]
    (t/is (= rect-id (get-in delete [:shape :id])))
    (t/is (nil? (get-in data' [:pages-index page-id :objects rect-id])))
    (t/is (= [] (get-in data' [:pages-index page-id :objects frame-id :shapes])))))

(t/deftest create-shape-request-rejects-missing-parent
  (let [file-id (uuid/next)
        page-id (uuid/next)
        data    (ctf/make-file-data file-id page-id)]
    (t/is (thrown? #?(:clj Exception :cljs :default)
                   (headless/create-shape-request data {:page-id page-id
                                                       :parent-id (uuid/next)
                                                       :type :rect
                                                       :x 0
                                                       :y 0
                                                       :width 10
                                                       :height 10})))))
