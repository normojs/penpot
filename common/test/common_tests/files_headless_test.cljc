;; This Source Code Form is subject to the terms of the Mozilla Public
;; License, v. 2.0. If a copy of the MPL was not distributed with this
;; file, You can obtain one at http://mozilla.org/MPL/2.0/.
;;
;; Copyright (c) KALEIDOS INC Sucursal en España SL

(ns common-tests.files-headless-test
  (:require
   [app.common.files.changes :as cpc]
   [app.common.files.headless :as headless]
   [app.common.types.file :as ctf]
   [app.common.types.pages-list :as ctpl]
   [app.common.types.text :as cttx]
   [app.common.uuid :as uuid]
   [clojure.test :as t]))

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
