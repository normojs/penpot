;; This Source Code Form is subject to the terms of the Mozilla Public
;; License, v. 2.0. If a copy of the MPL was not distributed with this
;; file, You can obtain one at http://mozilla.org/MPL/2.0/.
;;
;; Copyright (c) KALEIDOS INC Sucursal en España SL

(ns backend-tests.rpc-headless-commands-test
  (:require
   [app.common.features :as cfeat]
   [app.common.geom.point :as gpt]
   [app.common.types.text :as cttx]
   [app.common.uuid :as uuid]
   [app.rpc :as-alias rpc]
   [app.rpc.climit :as-alias climit]
   [app.rpc.commands.files-create :as files.create]
   [backend-tests.helpers :as th]
   [clojure.test :as t]
   [datoteka.io :as io])
  (:import
   java.util.Base64))

(t/use-fixtures :once th/state-init)
(t/use-fixtures :each th/database-reset)

(t/deftest create-file-command-has-concurrency-limit
  (t/is (= [[:create-file/by-profile ::rpc/profile-id]
            [:create-file/global]]
           (::climit/id (meta #'files.create/sm$create-file)))))

(t/deftest get-file-pages-and-create-file-page
  (let [profile (th/create-profile* 1 {:is-active true})
        file    (th/create-file* 1 {:profile-id (:id profile)
                                    :project-id (:default-project-id profile)
                                    :is-shared false})
        page-id (uuid/next)]

    (t/testing "list current file pages"
      (let [out {::th/type :get-file-pages
                 ::rpc/profile-id (:id profile)
                 :id (:id file)}
            out (th/command! out)]
        (t/is (nil? (:error out)))
        (t/is (= {:file-id (:id file)
                  :pages [{:id (get-in file [:data :pages 0])
                           :name "Page 1"}]}
                 (:result out)))))

    (t/testing "create a new page through the headless backend command"
      (let [out {::th/type :create-file-page
                 ::rpc/profile-id (:id profile)
                 :id (:id file)
                 :page-id page-id
                 :name "  Prototype  "
                 :features cfeat/supported-features}
            out (th/command! out)]
        (t/is (nil? (:error out)))
        (t/is (= {:id page-id :name "Prototype"}
                 (get-in out [:result :page])))
        (t/is (= 1 (get-in out [:result :revn])))))

    (t/testing "rename the page through the headless backend command"
      (let [out {::th/type :rename-file-page
                 ::rpc/profile-id (:id profile)
                 :id (:id file)
                 :page-id page-id
                 :name "  Renamed Prototype  "
                 :features cfeat/supported-features}
            out (th/command! out)]
        (t/is (nil? (:error out)))
        (t/is (= {:id page-id :name "Renamed Prototype"}
                 (get-in out [:result :page])))
        (t/is (= 2 (get-in out [:result :revn])))))

    (t/testing "created page is persisted in file data"
      (let [out {::th/type :get-file-pages
                 ::rpc/profile-id (:id profile)
                 :id (:id file)}
            out (th/command! out)]
        (t/is (nil? (:error out)))
        (t/is (= [{:id (get-in file [:data :pages 0])
                   :name "Page 1"}
                  {:id page-id
                   :name "Renamed Prototype"}]
                 (get-in out [:result :pages])))))))

(t/deftest rename-file-page-requires-edit-permissions
  (let [owner   (th/create-profile* 1 {:is-active true})
        other   (th/create-profile* 2 {:is-active true})
        file    (th/create-file* 1 {:profile-id (:id owner)
                                    :project-id (:default-project-id owner)
                                    :is-shared false})
        page-id (get-in file [:data :pages 0])
        out     (th/command! {::th/type :rename-file-page
                              ::rpc/profile-id (:id other)
                              :id (:id file)
                              :page-id page-id
                              :name "Forbidden"
                              :features cfeat/supported-features})
        error   (:error out)]
    (t/is (th/ex-info? error))
    (t/is (th/ex-of-type? error :not-found))))

(defn- sample-image-base64
  []
  (let [bytes (io/read* (th/tempfile "backend_tests/test_files/sample.png"))]
    (.encodeToString (Base64/getEncoder) bytes)))

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

(t/deftest create-file-shape
  (let [profile  (th/create-profile* 1 {:is-active true})
        file     (th/create-file* 1 {:profile-id (:id profile)
                                     :project-id (:default-project-id profile)
                                     :is-shared false})
        page-id  (get-in file [:data :pages 0])
        frame-id (uuid/next)
        rect-id  (uuid/next)
        text-id  (uuid/next)]

    (t/testing "create a top-level frame"
      (let [out {::th/type :create-file-shape
                 ::rpc/profile-id (:id profile)
                 :id (:id file)
                 :page-id page-id
                 :shape-id frame-id
                 :type :frame
                 :name "  Login  "
                 :x 10
                 :y 20
                 :width 320
                 :height 640
                 :features cfeat/supported-features}
            out (th/command! out)]
        (t/is (nil? (:error out)))
        (t/is (= {:id frame-id
                  :name "Login"
                  :type :frame
                  :page-id page-id
                  :parent-id uuid/zero
                  :frame-id uuid/zero
                  :x 10
                  :y 20
                  :width 320
                  :height 640}
                 (get-in out [:result :shape])))
        (t/is (= 1 (get-in out [:result :revn])))))

    (t/testing "create a rectangle inside the frame"
      (let [out {::th/type :create-file-shape
                 ::rpc/profile-id (:id profile)
                 :id (:id file)
                 :page-id page-id
                 :shape-id rect-id
                 :parent-id frame-id
                 :type :rect
                 :name "CTA"
                 :x 24
                 :y 32
                 :width 120
                 :height 40
                 :fill {:color "#00ff00"
                        :opacity 0.75}
                 :border-radius 8
                 :features cfeat/supported-features}
            out (th/command! out)]
        (t/is (nil? (:error out)))
        (t/is (= rect-id (get-in out [:result :shape :id])))
        (t/is (= 2 (get-in out [:result :revn])))))

    (t/testing "create a text layer inside the frame"
      (let [out {::th/type :create-file-shape
                 ::rpc/profile-id (:id profile)
                 :id (:id file)
                 :page-id page-id
                 :shape-id text-id
                 :parent-id frame-id
                 :type :text
                 :x 24
                 :y 96
                 :width 200
                 :height 32
                 :content "Hello backend"
                 :font-size 24
                 :features cfeat/supported-features}
            out (th/command! out)]
        (t/is (nil? (:error out)))
        (t/is (= text-id (get-in out [:result :shape :id])))
        (t/is (= 3 (get-in out [:result :revn])))))

    (t/testing "update a rectangle through the headless backend command"
      (let [out {::th/type :update-file-shape
                 ::rpc/profile-id (:id profile)
                 :id (:id file)
                 :page-id page-id
                 :shape-id rect-id
                 :name "  Primary CTA  "
                 :x 48
                 :y 64
                 :width 140
                 :height 56
                 :fill {:color "#ff00aa"
                        :opacity 0.5}
                 :stroke {:color "#111111"
                          :opacity 0.4
                          :width 2
                          :style :dashed
                          :alignment :inner}
                 :border-radius 12
                 :features cfeat/supported-features}
            out (th/command! out)]
        (t/is (nil? (:error out)))
        (t/is (= {:id rect-id
                  :name "Primary CTA"
                  :type :rect
                  :page-id page-id
                  :parent-id frame-id
                  :frame-id frame-id
                  :x 48
                  :y 64
                  :width 140
                  :height 56}
                 (get-in out [:result :shape])))
        (t/is (= 4 (get-in out [:result :revn])))))

    (t/testing "updated rectangle is persisted"
      (let [out {::th/type :get-file
                 ::rpc/profile-id (:id profile)
                 :id (:id file)
                 :features cfeat/supported-features}
            out (th/command! out)
            data (:data (:result out))
            rect (get-in data [:pages-index page-id :objects rect-id])]
        (t/is (nil? (:error out)))
        (t/is (= "Primary CTA" (:name rect)))
        (t/is (= 48 (:x rect) (:x (:selrect rect))))
        (t/is (= 64 (:y rect) (:y (:selrect rect))))
        (t/is (= 140 (:width rect) (:width (:selrect rect))))
        (t/is (= 56 (:height rect) (:height (:selrect rect))))
        (t/is (= [{:fill-color "#ff00aa" :fill-opacity 0.5}] (:fills rect)))
        (t/is (= 12 (:r1 rect) (:r2 rect) (:r3 rect) (:r4 rect)))))

    (t/testing "update a text layer through the headless backend command"
      (let [out {::th/type :update-file-shape
                 ::rpc/profile-id (:id profile)
                 :id (:id file)
                 :shape-id text-id
                 :content "Updated backend"
                 :font-size 18
                 :fill {:color "#112233"}
                 :features cfeat/supported-features}
            out (th/command! out)]
        (t/is (nil? (:error out)))
        (t/is (= text-id (get-in out [:result :shape :id])))
        (t/is (= 5 (get-in out [:result :revn])))))

    (t/testing "delete a rectangle through the headless backend command"
      (let [out {::th/type :delete-file-shape
                 ::rpc/profile-id (:id profile)
                 :id (:id file)
                 :shape-id rect-id
                 :features cfeat/supported-features}
            out (th/command! out)]
        (t/is (nil? (:error out)))
        (t/is (= rect-id (get-in out [:result :shape :id])))
        (t/is (= 6 (get-in out [:result :revn])))))

    (t/testing "updated and deleted shapes are persisted"
      (let [out {::th/type :get-file
                 ::rpc/profile-id (:id profile)
                 :id (:id file)
                 :features cfeat/supported-features}
            out (th/command! out)
            data (:data (:result out))
            objects (get-in data [:pages-index page-id :objects])
            rect (get objects rect-id)
            text (get objects text-id)]
        (t/is (nil? (:error out)))
        (t/is (= [frame-id] (get-in objects [uuid/zero :shapes])))
        (t/is (= [text-id] (get-in objects [frame-id :shapes])))
        (t/is (nil? rect))
        (t/is (= "Updated backend" (cttx/content->text (:content text))))
        (t/is (= "18" (get-in text [:content :children 0 :children 0 :font-size])))
        (t/is (= [{:fill-color "#112233" :fill-opacity 1}]
                 (get-in text [:content :children 0 :children 0 :fills])))))))

(t/deftest create-file-image-shape
  (let [profile  (th/create-profile* 1 {:is-active true})
        file     (th/create-file* 1 {:profile-id (:id profile)
                                     :project-id (:default-project-id profile)
                                     :is-shared false})
        page-id  (get-in file [:data :pages 0])
        frame-id (uuid/next)
        image-id (uuid/next)]

    (let [out {::th/type :create-file-shape
               ::rpc/profile-id (:id profile)
               :id (:id file)
               :page-id page-id
               :shape-id frame-id
               :type :frame
               :x 0
               :y 0
               :width 640
               :height 480
               :features cfeat/supported-features}
          out (th/command! out)]
      (t/is (nil? (:error out))))

    (t/testing "create an image-backed rectangle through the backend command"
      (let [out {::th/type :create-file-image-shape
                 ::rpc/profile-id (:id profile)
                 :id (:id file)
                 :page-id page-id
                 :shape-id image-id
                 :parent-id frame-id
                 :name "  Hero PNG  "
                 :x 32
                 :y 48
                 :width 575
                 :image-base64 (sample-image-base64)
                 :mime-type "image/png"
                 :features cfeat/supported-features}
            out (th/command! out)
            media (get-in out [:result :media])]
        (t/is (nil? (:error out)))
        (t/is (= {:id image-id
                  :name "Hero PNG"
                  :type :rect
                  :page-id page-id
                  :parent-id frame-id
                  :frame-id frame-id
                  :x 32
                  :y 48
                  :width 575
                  :height 416}
                 (get-in out [:result :shape])))
        (t/is (= (:id file) (:file-id media)))
        (t/is (= "Hero PNG" (:name media)))
        (t/is (= 575 (:width media)))
        (t/is (= 416 (:height media)))
        (t/is (= "image/png" (:mtype media)))
        (t/is (uuid? (:media-id media)))
        (t/is (= 2 (get-in out [:result :revn])))))

    (t/testing "image media and preview metadata are persisted in file data"
      (let [out {::th/type :get-file
                 ::rpc/profile-id (:id profile)
                 :id (:id file)
                 :features cfeat/supported-features}
            out (th/command! out)
            data (:data (:result out))
            shape (get-in data [:pages-index page-id :objects image-id])
            media-id (get-in shape [:fills 0 :fill-image :id])
            media (get-in data [:media media-id])
            image-ref (select-keys media [:id :name :width :height :mtype])]
        (t/is (nil? (:error out)))
        (t/is (= media-id (:id media)))
        (t/is (= image-ref (get-in shape [:fills 0 :fill-image])))
        (t/is (= image-ref (:metadata shape)))
        (t/is (= [image-id] (get-in data [:pages-index page-id :objects frame-id :shapes])))))))

(t/deftest create-file-image-shape-validates-media-and-permissions
  (let [owner   (th/create-profile* 1 {:is-active true})
        other   (th/create-profile* 2 {:is-active true})
        file    (th/create-file* 1 {:profile-id (:id owner)
                                    :project-id (:default-project-id owner)
                                    :is-shared false})
        page-id (get-in file [:data :pages 0])
        base    {::th/type :create-file-image-shape
                 :id (:id file)
                 :page-id page-id
                 :x 0
                 :y 0
                 :image-base64 (sample-image-base64)
                 :mime-type "image/png"
                 :features cfeat/supported-features}]

    (t/testing "requires edit permissions"
      (let [out   (th/command! (assoc base ::rpc/profile-id (:id other)))
            error (:error out)]
        (t/is (th/ex-info? error))
        (t/is (th/ex-of-type? error :not-found))))

    (t/testing "rejects unsupported media types"
      (let [out   (th/command! (assoc base
                                      ::rpc/profile-id (:id owner)
                                      :mime-type "text/plain"))
            error (:error out)]
        (t/is (th/ex-info? error))
        (t/is (th/ex-with-code? error :media-type-not-allowed))))

    (t/testing "rejects invalid image base64"
      (let [out   (th/command! (assoc base
                                      ::rpc/profile-id (:id owner)
                                      :image-base64 "%%%"))
            error (:error out)]
        (t/is (th/ex-info? error))
        (t/is (th/ex-with-code? error :invalid-image-data))))))

(t/deftest create-file-prototype-flow-and-interaction
  (let [profile  (th/create-profile* 1 {:is-active true})
        file     (th/create-file* 1 {:profile-id (:id profile)
                                     :project-id (:default-project-id profile)
                                     :is-shared false})
        page-id  (get-in file [:data :pages 0])
        frame-a  (uuid/next)
        frame-b  (uuid/next)
        rect-id  (uuid/next)
        flow-id  (uuid/next)
        created-interaction-id (atom nil)]

    (doseq [[shape-id x name] [[frame-a 0 "Start"]
                               [frame-b 360 "Done"]]]
      (let [out {::th/type :create-file-shape
                 ::rpc/profile-id (:id profile)
                 :id (:id file)
                 :page-id page-id
                 :shape-id shape-id
                 :type :frame
                 :name name
                 :x x
                 :y 0
                 :width 320
                 :height 640
                 :features cfeat/supported-features}
            out (th/command! out)]
        (t/is (nil? (:error out)))))

    (let [out {::th/type :create-file-shape
               ::rpc/profile-id (:id profile)
               :id (:id file)
               :page-id page-id
               :shape-id rect-id
               :parent-id frame-a
               :type :rect
               :name "CTA"
               :x 24
               :y 32
               :width 120
               :height 40
               :features cfeat/supported-features}
          out (th/command! out)]
      (t/is (nil? (:error out))))

    (t/testing "create a prototype flow through the backend command"
      (let [out {::th/type :create-file-prototype-flow
                 ::rpc/profile-id (:id profile)
                 :id (:id file)
                 :page-id page-id
                 :flow-id flow-id
                 :name "  Checkout flow  "
                 :starting-board-id frame-a
                 :features cfeat/supported-features}
            out (th/command! out)]
        (t/is (nil? (:error out)))
        (t/is (= {:id flow-id
                  :name "Checkout flow"
                  :page-id page-id
                  :starting-board-id frame-a
                  :starting-board-name "Start"}
                 (get-in out [:result :flow])))
        (t/is (= 4 (get-in out [:result :revn])))))

    (t/testing "create a navigate prototype interaction through the backend command"
      (let [out {::th/type :create-file-prototype-interaction
                 ::rpc/profile-id (:id profile)
                 :id (:id file)
                 :page-id page-id
                 :source-shape-id rect-id
                 :destination-board-id frame-b
                 :trigger :click
                 :preserve-scroll-position true
                 :animation {:type :dissolve
                             :duration 300
                             :easing :ease-in-out}
                 :features cfeat/supported-features}
            out (th/command! out)
            interaction-id (get-in out [:result :interaction :interaction-id])]
        (t/is (nil? (:error out)))
        (t/is (uuid? interaction-id))
        (reset! created-interaction-id interaction-id)
        (t/is (= {:interaction-id interaction-id
                  :source-shape-id rect-id
                  :source-shape-name "CTA"
                  :index 0
                  :identity (stable-interaction-identity interaction-id rect-id 0)
                  :trigger :click
                  :delay nil
                  :action-type :navigate-to
                  :destination-board-id frame-b
                  :destination-board-name "Done"}
                 (get-in out [:result :interaction])))
        (t/is (= 5 (get-in out [:result :revn])))))

    (t/testing "list prototype flows and interactions through the backend command"
      (let [out {::th/type :get-file-prototype-interactions
                 ::rpc/profile-id (:id profile)
                 :id (:id file)
                 :page-id page-id
                 :flow-id flow-id
                 :source-shape-id rect-id
                 :features cfeat/supported-features}
            out (th/command! out)]
        (t/is (nil? (:error out)))
        (t/is (= {:file-id (:id file)
                  :flows [{:id flow-id
                           :name "Checkout flow"
                           :page-id page-id
                           :starting-board-id frame-a
                           :starting-board-name "Start"}]
                  :interactions [{:interaction-id @created-interaction-id
                                  :source-shape-id rect-id
                                  :source-shape-name "CTA"
                                  :index 0
                                  :identity (stable-interaction-identity @created-interaction-id rect-id 0)
                                  :trigger :click
                                  :delay nil
                                  :action-type :navigate-to
                                  :destination-board-id frame-b
                                  :destination-board-name "Done"}]}
                 (:result out)))))

    (t/testing "delete a prototype interaction through the backend command"
      (let [out {::th/type :delete-file-prototype-interaction
                 ::rpc/profile-id (:id profile)
                 :id (:id file)
                 :page-id page-id
                 :source-shape-id rect-id
                 :interaction-index 0
                 :features cfeat/supported-features}
            out (th/command! out)]
        (t/is (nil? (:error out)))
        (t/is (= {:interaction-id @created-interaction-id
                  :source-shape-id rect-id
                  :source-shape-name "CTA"
                  :index 0
                  :identity (stable-interaction-identity @created-interaction-id rect-id 0)
                  :trigger :click
                  :delay nil
                  :action-type :navigate-to
                  :destination-board-id frame-b
                  :destination-board-name "Done"}
                 (get-in out [:result :interaction])))
        (t/is (= 6 (get-in out [:result :revn])))))

    (t/testing "reject stale prototype interaction indexes"
      (let [out {::th/type :delete-file-prototype-interaction
                 ::rpc/profile-id (:id profile)
                 :id (:id file)
                 :page-id page-id
                 :source-shape-id rect-id
                 :interaction-index 0
                 :features cfeat/supported-features}
            out (th/command! out)
            error (:error out)]
        (t/is (th/ex-info? error))
        (t/is (th/ex-with-code? error :prototype-interaction-not-found))))

    (t/testing "reject missing prototype source shapes"
      (let [out {::th/type :delete-file-prototype-interaction
                 ::rpc/profile-id (:id profile)
                 :id (:id file)
                 :page-id page-id
                 :source-shape-id (uuid/next)
                 :interaction-index 0
                 :features cfeat/supported-features}
            out (th/command! out)
            error (:error out)]
        (t/is (th/ex-info? error))
        (t/is (th/ex-with-code? error :shape-not-found))))

    (t/testing "prototype data is persisted in file data"
      (let [out {::th/type :get-file
                 ::rpc/profile-id (:id profile)
                 :id (:id file)
                 :features cfeat/supported-features}
            out (th/command! out)
            data (:data (:result out))
            flow (get-in data [:pages-index page-id :flows flow-id])
            interactions (get-in data [:pages-index page-id :objects rect-id :interactions])]
        (t/is (nil? (:error out)))
        (t/is (= {:id flow-id
                  :name "Checkout flow"
                  :starting-frame frame-a}
                 flow))
        (t/is (= [] interactions))))))

(t/deftest update-reorder-and-duplicate-file-prototype-interaction
  (let [profile  (th/create-profile* 1 {:is-active true})
        file     (th/create-file* 1 {:profile-id (:id profile)
                                     :project-id (:default-project-id profile)
                                     :is-shared false})
        page-id  (get-in file [:data :pages 0])
        frame-a  (uuid/next)
        frame-b  (uuid/next)
        frame-c  (uuid/next)
        rect-id  (uuid/next)]

    (doseq [[shape-id x name] [[frame-a 0 "Start"]
                               [frame-b 360 "Middle"]
                               [frame-c 720 "Done"]]]
      (let [out {::th/type :create-file-shape
                 ::rpc/profile-id (:id profile)
                 :id (:id file)
                 :page-id page-id
                 :shape-id shape-id
                 :type :frame
                 :name name
                 :x x
                 :y 0
                 :width 320
                 :height 640
                 :features cfeat/supported-features}
            out (th/command! out)]
        (t/is (nil? (:error out)))))

    (let [out {::th/type :create-file-shape
               ::rpc/profile-id (:id profile)
               :id (:id file)
               :page-id page-id
               :shape-id rect-id
               :parent-id frame-a
               :type :rect
               :name "CTA"
               :x 24
               :y 32
               :width 120
               :height 40
               :features cfeat/supported-features}
          out (th/command! out)]
      (t/is (nil? (:error out))))

    (let [create-out {::th/type :create-file-prototype-interaction
                      ::rpc/profile-id (:id profile)
                      :id (:id file)
                      :page-id page-id
                      :source-shape-id rect-id
                      :destination-board-id frame-b
                      :trigger :click
                      :features cfeat/supported-features}
          create-out (th/command! create-out)
          interaction-id (get-in create-out [:result :interaction :interaction-id])
          update-out {::th/type :update-file-prototype-interaction
                      ::rpc/profile-id (:id profile)
                      :id (:id file)
                      :page-id page-id
                      :interaction-id interaction-id
                      :source-shape-id rect-id
                      :interaction-index 0
                      :destination-board-id frame-c
                      :trigger :mouse-enter
                      :preserve-scroll-position true
                      :features cfeat/supported-features}
          update-out (th/command! update-out)
          duplicate-out {::th/type :duplicate-file-prototype-interaction
                         ::rpc/profile-id (:id profile)
                         :id (:id file)
                         :page-id page-id
                         :interaction-id interaction-id
                         :source-shape-id rect-id
                         :interaction-index 0
                         :insertion-index 1
                         :features cfeat/supported-features}
          duplicate-out (th/command! duplicate-out)
          duplicated-id (get-in duplicate-out [:result :interaction :interaction-id])
          reorder-out {::th/type :reorder-file-prototype-interaction
                       ::rpc/profile-id (:id profile)
                       :id (:id file)
                       :page-id page-id
                       :interaction-id duplicated-id
                       :source-shape-id rect-id
                       :interaction-index 1
                       :to-index 0
                       :features cfeat/supported-features}
          reorder-out (th/command! reorder-out)]
      (t/is (nil? (:error create-out)))
      (t/is (uuid? interaction-id))
      (t/is (nil? (:error update-out)))
      (t/is (= {:interaction-id interaction-id
                :source-shape-id rect-id
                :source-shape-name "CTA"
                :index 0
                :identity (stable-interaction-identity interaction-id rect-id 0)
                :trigger :mouse-enter
                :delay nil
                :action-type :navigate-to
                :destination-board-id frame-c
                :destination-board-name "Done"}
               (get-in update-out [:result :interaction])))
      (t/is (nil? (:error duplicate-out)))
      (t/is (uuid? duplicated-id))
      (t/is (not= interaction-id duplicated-id))
      (t/is (= 1 (get-in duplicate-out [:result :interaction :index])))
      (t/is (nil? (:error reorder-out)))
      (t/is (= {:interaction-id duplicated-id
                :source-shape-id rect-id
                :source-shape-name "CTA"
                :index 0
                :identity (stable-interaction-identity duplicated-id rect-id 0)
                :trigger :mouse-enter
                :delay nil
                :action-type :navigate-to
                :destination-board-id frame-c
                :destination-board-name "Done"}
               (get-in reorder-out [:result :interaction])))
      (let [out {::th/type :get-file
                 ::rpc/profile-id (:id profile)
                 :id (:id file)
                 :features cfeat/supported-features}
            out (th/command! out)
            interactions (get-in out [:result :data :pages-index page-id :objects rect-id :interactions])]
        (t/is (nil? (:error out)))
        (t/is (= [duplicated-id interaction-id] (mapv :id interactions)))
        (t/is (every? #(= frame-c (:destination %)) interactions))))))

(t/deftest get-file-prototype-interactions-lists-overlay-actions
  (let [profile  (th/create-profile* 1 {:is-active true})
        file     (th/create-file* 1 {:profile-id (:id profile)
                                     :project-id (:default-project-id profile)
                                     :is-shared false})
        page-id  (get-in file [:data :pages 0])
        frame-a  (uuid/next)
        frame-b  (uuid/next)
        rect-id  (uuid/next)
        stable-interaction-id (uuid/next)]

    (doseq [[shape-id x name] [[frame-a 0 "Start"]
                               [frame-b 360 "Overlay"]]]
      (let [out {::th/type :create-file-shape
                 ::rpc/profile-id (:id profile)
                 :id (:id file)
                 :page-id page-id
                 :shape-id shape-id
                 :type :frame
                 :name name
                 :x x
                 :y 0
                 :width 320
                 :height 640
                 :features cfeat/supported-features}
            out (th/command! out)]
        (t/is (nil? (:error out)))))

    (let [out {::th/type :create-file-shape
               ::rpc/profile-id (:id profile)
               :id (:id file)
               :page-id page-id
               :shape-id rect-id
               :parent-id frame-a
               :type :rect
               :name "CTA"
               :x 24
               :y 32
               :width 120
               :height 40
               :features cfeat/supported-features}
          out (th/command! out)]
      (t/is (nil? (:error out))))

    (th/update-file! :profile-id (:id profile)
                     :file-id (:id file)
                     :revn 3
                     :changes [{:type :mod-obj
                                :id rect-id
                                :page-id page-id
                                :operations [{:type :set
                                              :attr :interactions
                                              :val [{:id stable-interaction-id
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
                                                    {:action-type :toggle-overlay
                                                     :event-type :mouse-leave
                                                     :destination frame-b
                                                     :overlay-pos-type :bottom-right
                                                     :overlay-position (gpt/point 0 0)
                                                     :close-click-outside false
                                                     :background-overlay false}
                                                    {:action-type :close-overlay
                                                     :event-type :click
                                                     :destination frame-b}]}]}])

    (let [out {::th/type :get-file-prototype-interactions
               ::rpc/profile-id (:id profile)
               :id (:id file)
               :page-id page-id
               :source-shape-id rect-id
               :features cfeat/supported-features}
          out (th/command! out)]
      (t/is (nil? (:error out)))
      (t/is (= [{:source-shape-id rect-id
                 :interaction-id stable-interaction-id
                 :source-shape-name "CTA"
                 :index 0
                 :identity (stable-interaction-identity stable-interaction-id rect-id 0)
                 :trigger :mouse-enter
                 :delay nil
                 :action-type :open-overlay
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
                {:source-shape-id rect-id
                 :source-shape-name "CTA"
                 :index 1
                 :identity (legacy-interaction-identity rect-id 1)
                 :trigger :mouse-leave
                 :delay nil
                 :action-type :toggle-overlay
                 :destination-board-id frame-b
                 :destination-board-name "Overlay"
                 :overlay-position-type :bottom-right
                 :overlay-position (gpt/point 0 0)
                 :close-click-outside false
                 :background-overlay false}
                {:source-shape-id rect-id
                 :source-shape-name "CTA"
                 :index 2
                 :identity (legacy-interaction-identity rect-id 2)
                 :trigger :click
                 :delay nil
                 :action-type :close-overlay
                 :destination-board-id frame-b
                 :destination-board-name "Overlay"}]
               (get-in out [:result :interactions]))))

    (let [out {::th/type :delete-file-prototype-interaction
               ::rpc/profile-id (:id profile)
               :id (:id file)
               :page-id page-id
               :interaction-id stable-interaction-id
               :source-shape-id rect-id
               :interaction-index 1
               :features cfeat/supported-features}
          out (th/command! out)
          error (:error out)]
      (t/is (th/ex-info? error))
      (t/is (th/ex-with-code? error :prototype-interaction-target-stale)))

    (let [out {::th/type :delete-file-prototype-interaction
               ::rpc/profile-id (:id profile)
               :id (:id file)
               :page-id page-id
               :interaction-id stable-interaction-id
               :source-shape-id rect-id
               :interaction-index 0
               :features cfeat/supported-features}
          out (th/command! out)]
      (t/is (nil? (:error out)))
      (t/is (= {:source-shape-id rect-id
                :interaction-id stable-interaction-id
                :source-shape-name "CTA"
                :index 0
                :identity (stable-interaction-identity stable-interaction-id rect-id 0)
                :trigger :mouse-enter
                :delay nil
                :action-type :open-overlay
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
               (get-in out [:result :interaction]))))))

(t/deftest create-file-prototype-overlay-and-delete
  (let [profile  (th/create-profile* 1 {:is-active true})
        file     (th/create-file* 1 {:profile-id (:id profile)
                                     :project-id (:default-project-id profile)
                                     :is-shared false})
        page-id  (get-in file [:data :pages 0])
        frame-a  (uuid/next)
        frame-b  (uuid/next)
        rect-id  (uuid/next)
        toggle-interaction-id (atom nil)]

    (doseq [[shape-id x name] [[frame-a 0 "Start"]
                               [frame-b 360 "Overlay"]]]
      (let [out {::th/type :create-file-shape
                 ::rpc/profile-id (:id profile)
                 :id (:id file)
                 :page-id page-id
                 :shape-id shape-id
                 :type :frame
                 :name name
                 :x x
                 :y 0
                 :width 320
                 :height 640
                 :features cfeat/supported-features}
            out (th/command! out)]
        (t/is (nil? (:error out)))))

    (let [out {::th/type :create-file-shape
               ::rpc/profile-id (:id profile)
               :id (:id file)
               :page-id page-id
               :shape-id rect-id
               :parent-id frame-a
               :type :rect
               :name "CTA"
               :x 24
               :y 32
               :width 120
               :height 40
               :features cfeat/supported-features}
          out (th/command! out)]
      (t/is (nil? (:error out))))

    (let [out {::th/type :create-file-prototype-overlay
               ::rpc/profile-id (:id profile)
               :id (:id file)
               :page-id page-id
               :source-shape-id rect-id
               :action-type :open-overlay
               :destination-board-id frame-b
               :features cfeat/supported-features}
          out (th/command! out)
          interaction-id (get-in out [:result :interaction :interaction-id])]
      (t/is (nil? (:error out)))
      (t/is (uuid? interaction-id))
      (t/is (= :stable-id (get-in out [:result :interaction :identity :kind])))
      (t/is (= :open-overlay (get-in out [:result :interaction :action-type])))
      (t/is (= 4 (get-in out [:result :revn]))))

    (let [out {::th/type :create-file-prototype-overlay
               ::rpc/profile-id (:id profile)
               :id (:id file)
               :page-id page-id
               :source-shape-id rect-id
               :action-type :toggle-overlay
               :destination-board-id frame-b
               :relative-to-shape-id rect-id
               :overlay-position-type :manual
               :manual-position (gpt/point 12 16)
               :close-click-outside true
               :background-overlay true
               :trigger :mouse-enter
               :animation {:type :dissolve
                           :duration 300
                           :easing :linear}
               :features cfeat/supported-features}
          out (th/command! out)
          interaction-id (get-in out [:result :interaction :interaction-id])]
      (t/is (nil? (:error out)))
      (t/is (uuid? interaction-id))
      (reset! toggle-interaction-id interaction-id)
      (t/is (= {:interaction-id interaction-id
                :source-shape-id rect-id
                :source-shape-name "CTA"
                :index 1
                :identity (stable-interaction-identity interaction-id rect-id 1)
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
               (get-in out [:result :interaction])))
      (t/is (= 5 (get-in out [:result :revn]))))

    (let [out {::th/type :create-file-prototype-overlay
               ::rpc/profile-id (:id profile)
               :id (:id file)
               :page-id page-id
               :source-shape-id rect-id
               :action-type :close-overlay
               :features cfeat/supported-features}
          out (th/command! out)
          interaction-id (get-in out [:result :interaction :interaction-id])]
      (t/is (nil? (:error out)))
      (t/is (uuid? interaction-id))
      (t/is (= :stable-id (get-in out [:result :interaction :identity :kind])))
      (t/is (= :close-overlay (get-in out [:result :interaction :action-type])))
      (t/is (= 6 (get-in out [:result :revn]))))

    (let [out {::th/type :delete-file-prototype-interaction
               ::rpc/profile-id (:id profile)
               :id (:id file)
               :page-id page-id
               :source-shape-id rect-id
               :interaction-index 1
               :features cfeat/supported-features}
          out (th/command! out)]
      (t/is (nil? (:error out)))
      (t/is (= @toggle-interaction-id (get-in out [:result :interaction :interaction-id])))
      (t/is (= :stable-id (get-in out [:result :interaction :identity :kind])))
      (t/is (= :toggle-overlay (get-in out [:result :interaction :action-type])))
      (t/is (= 7 (get-in out [:result :revn]))))))

(t/deftest update-file-shape-supports-rich-style-and-parent-move
  (let [profile    (th/create-profile* 1 {:is-active true})
        file       (th/create-file* 1 {:profile-id (:id profile)
                                       :project-id (:default-project-id profile)
                                       :is-shared false})
        page-id    (get-in file [:data :pages 0])
        frame-a-id (uuid/next)
        frame-b-id (uuid/next)
        rect-id    (uuid/next)]

    (doseq [[shape-id x name] [[frame-a-id 0 "A"]
                               [frame-b-id 360 "B"]]]
      (let [out {::th/type :create-file-shape
                 ::rpc/profile-id (:id profile)
                 :id (:id file)
                 :page-id page-id
                 :shape-id shape-id
                 :type :frame
                 :name name
                 :x x
                 :y 0
                 :width 320
                 :height 640
                 :features cfeat/supported-features}
            out (th/command! out)]
        (t/is (nil? (:error out)))))

    (let [out {::th/type :create-file-shape
               ::rpc/profile-id (:id profile)
               :id (:id file)
               :page-id page-id
               :shape-id rect-id
               :parent-id frame-a-id
               :type :rect
               :x 24
               :y 32
               :width 120
               :height 40
               :features cfeat/supported-features}
          out (th/command! out)]
      (t/is (nil? (:error out))))

    (t/testing "rich style and parent move update through the backend command"
      (let [out {::th/type :update-file-shape
                 ::rpc/profile-id (:id profile)
                 :id (:id file)
                 :page-id page-id
                 :shape-id rect-id
                 :parent-id frame-b-id
                 :index 0
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
                 :r4 12
                 :features cfeat/supported-features}
            out (th/command! out)]
        (t/is (nil? (:error out)))
        (t/is (= {:id rect-id
                  :name "Rectangle"
                  :type :rect
                  :page-id page-id
                  :parent-id frame-b-id
                  :frame-id frame-b-id
                  :x 24
                  :y 32
                  :width 120
                  :height 40}
                 (get-in out [:result :shape])))
        (t/is (= 4 (get-in out [:result :revn])))))

    (t/testing "rich style and moved hierarchy are persisted"
      (let [out {::th/type :get-file
                 ::rpc/profile-id (:id profile)
                 :id (:id file)
                 :features cfeat/supported-features}
            out (th/command! out)
            data (:data (:result out))
            objects (get-in data [:pages-index page-id :objects])
            rect (get objects rect-id)]
        (t/is (nil? (:error out)))
        (t/is (= [] (get-in objects [frame-a-id :shapes])))
        (t/is (= [rect-id] (get-in objects [frame-b-id :shapes])))
        (t/is (= frame-b-id (:parent-id rect)))
        (t/is (= frame-b-id (:frame-id rect)))
        (t/is (= [{:fill-color "#abcdef" :fill-opacity 0.8}
                  {:fill-color "#112233" :fill-opacity 1}]
                 (:fills rect)))
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
                 (:strokes rect)))
        (t/is (= 6 (:r1 rect)))
        (t/is (= 8 (:r2 rect)))
        (t/is (= 10 (:r3 rect)))
        (t/is (= 12 (:r4 rect)))))))

(t/deftest update-file-shape-supports-frame-flex-layout
  (let [profile      (th/create-profile* 1 {:is-active true})
        file         (th/create-file* 1 {:profile-id (:id profile)
                                         :project-id (:default-project-id profile)
                                         :is-shared false})
        page-id      (get-in file [:data :pages 0])
        frame-id     (uuid/next)
        layout-attrs [:layout
                      :layout-flex-dir
                      :layout-gap
                      :layout-gap-type
                      :layout-wrap-type
                      :layout-padding-type
                      :layout-padding
                      :layout-justify-content
                      :layout-align-content
                      :layout-align-items]]

    (let [out {::th/type :create-file-shape
               ::rpc/profile-id (:id profile)
               :id (:id file)
               :page-id page-id
               :shape-id frame-id
               :type :frame
               :x 0
               :y 0
               :width 320
               :height 640
               :features cfeat/supported-features}
          out (th/command! out)]
      (t/is (nil? (:error out)))
      (t/is (= 1 (get-in out [:result :revn]))))

    (t/testing "set frame flex layout through the backend command"
      (let [out {::th/type :update-file-shape
                 ::rpc/profile-id (:id profile)
                 :id (:id file)
                 :shape-id frame-id
                 :layout {:type :flex
                          :direction :column
                          :wrap :wrap
                          :align-items :center
                          :justify-content :space-between
                          :row-gap 12
                          :column-gap 8
                          :padding 16}
                 :features cfeat/supported-features}
            out (th/command! out)]
        (t/is (nil? (:error out)))
        (t/is (= frame-id (get-in out [:result :shape :id])))
        (t/is (= 2 (get-in out [:result :revn])))))

    (t/testing "frame flex layout is persisted"
      (let [out {::th/type :get-file
                 ::rpc/profile-id (:id profile)
                 :id (:id file)
                 :features cfeat/supported-features}
            out (th/command! out)
            data (:data (:result out))
            frame (get-in data [:pages-index page-id :objects frame-id])]
        (t/is (nil? (:error out)))
        (t/is (= :flex (:layout frame)))
        (t/is (= :column (:layout-flex-dir frame)))
        (t/is (= :wrap (:layout-wrap-type frame)))
        (t/is (= :center (:layout-align-items frame)))
        (t/is (= :space-between (:layout-justify-content frame)))
        (t/is (= :stretch (:layout-align-content frame)))
        (t/is (= :multiple (:layout-gap-type frame)))
        (t/is (= {:row-gap 12 :column-gap 8} (:layout-gap frame)))
        (t/is (= :simple (:layout-padding-type frame)))
        (t/is (= {:p1 16 :p2 16 :p3 16 :p4 16} (:layout-padding frame)))))

    (t/testing "remove frame layout through the backend command"
      (let [out {::th/type :update-file-shape
                 ::rpc/profile-id (:id profile)
                 :id (:id file)
                 :shape-id frame-id
                 :layout {:type :none}
                 :features cfeat/supported-features}
            out (th/command! out)]
        (t/is (nil? (:error out)))
        (t/is (= 3 (get-in out [:result :revn])))))

    (t/testing "layout removal is persisted"
      (let [out {::th/type :get-file
                 ::rpc/profile-id (:id profile)
                 :id (:id file)
                 :features cfeat/supported-features}
            out (th/command! out)
            data (:data (:result out))
            frame (get-in data [:pages-index page-id :objects frame-id])]
        (t/is (nil? (:error out)))
        (t/is (every? #(not (contains? frame %)) layout-attrs))))))

(t/deftest update-file-shape-supports-frame-grid-layout-subset
  (let [profile  (th/create-profile* 1 {:is-active true})
        file     (th/create-file* 1 {:profile-id (:id profile)
                                     :project-id (:default-project-id profile)
                                     :is-shared false})
        page-id  (get-in file [:data :pages 0])
        frame-id (uuid/next)]

    (let [out {::th/type :create-file-shape
               ::rpc/profile-id (:id profile)
               :id (:id file)
               :page-id page-id
               :shape-id frame-id
               :type :frame
               :x 0
               :y 0
               :width 320
               :height 640
               :features cfeat/supported-features}
          out (th/command! out)]
      (t/is (nil? (:error out))))

    (let [out {::th/type :update-file-shape
               ::rpc/profile-id (:id profile)
               :id (:id file)
               :shape-id frame-id
               :layout {:type :grid
                        :direction :row
                        :align-items :center
                        :justify-items :stretch
                        :align-content :space-between
                        :justify-content :space-evenly
                        :row-gap 20
                        :column-gap 12
                        :padding 24
                        :rows [{:type :fixed :value 120}
                               {:type :flex :value 1}]
                        :columns [{:type :percent :value 50}
                                  {:type :auto}]}
               :features cfeat/supported-features}
          out (th/command! out)]
      (t/is (nil? (:error out)))
      (t/is (= frame-id (get-in out [:result :shape :id]))))

    (let [out {::th/type :get-file
               ::rpc/profile-id (:id profile)
               :id (:id file)
               :features cfeat/supported-features}
          out (th/command! out)
          data (:data (:result out))
          frame (get-in data [:pages-index page-id :objects frame-id])]
      (t/is (nil? (:error out)))
      (t/is (= :grid (:layout frame)))
      (t/is (= :row (:layout-grid-dir frame)))
      (t/is (= :center (:layout-align-items frame)))
      (t/is (= :stretch (:layout-justify-items frame)))
      (t/is (= :space-between (:layout-align-content frame)))
      (t/is (= :space-evenly (:layout-justify-content frame)))
      (t/is (= {:row-gap 20 :column-gap 12} (:layout-gap frame)))
      (t/is (= {:p1 24 :p2 24 :p3 24 :p4 24} (:layout-padding frame)))
      (t/is (= [{:type :fixed :value 120}
                {:type :flex :value 1}]
               (:layout-grid-rows frame)))
      (t/is (= [{:type :percent :value 50}
                {:type :auto}]
               (:layout-grid-columns frame)))
      (t/is (= {} (:layout-grid-cells frame))))))
