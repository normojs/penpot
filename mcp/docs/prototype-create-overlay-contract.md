# Prototype Create Overlay Contract

Status: P20.2 contract, descriptor-only until P20.3 implements an adapter.

`prototype.create_overlay` creates one persisted prototype interaction on a
source shape. It does not create boards, move shapes, open a live workspace, or
change editor-local selection/current-page state.

## Command

```text
prototype.create_overlay
```

Adapters:

- `backend-command`: planned for P20.3.
- `plugin-live`: not part of this contract.

The command-runtime descriptor must keep `adapters: []` until the backend
implementation is registered.

## Payload

Required for every action:

- `fileId`: target file id.
- `pageId`: target page id. Required to avoid cross-page source ambiguity.
- `sourceShapeId`: shape that owns the interaction.
- `actionType`: one of `open-overlay`, `toggle-overlay`, `close-overlay`.

Required for `open-overlay` and `toggle-overlay`:

- `destinationBoardId`: board/frame shown as the overlay.

Optional for `close-overlay`:

- `destinationBoardId`: board/frame to close. When omitted, the interaction
  closes the current overlay context, matching Penpot's self-close behavior.

Optional for `open-overlay` and `toggle-overlay`:

- `relativeToShapeId`: shape used as the overlay positioning base.
- `overlayPositionType`: `center`, `manual`, `top-left`, `top-right`,
  `top-center`, `bottom-left`, `bottom-right`, or `bottom-center`.
  Defaults to `center`.
- `manualPosition`: `{x, y}` point. Required when
  `overlayPositionType = manual`; ignored otherwise.
- `closeClickOutside`: boolean. Defaults to `false`.
- `backgroundOverlay`: boolean. Defaults to `false`.

Optional for every action:

- `trigger`: `click`, `mouse-enter`, `mouse-leave`, or `after-delay`. Defaults
  to `click`.
- `delay`: non-negative milliseconds, only meaningful with `after-delay`.
- `animation`: dissolve or slide animation. `push` is unsupported for overlay
  actions.

## Validation

The backend implementation must reject:

- Missing `fileId`, `pageId`, `sourceShapeId`, or `actionType`.
- `open-overlay` or `toggle-overlay` without `destinationBoardId`.
- Unknown `actionType`, `trigger`, or `overlayPositionType`.
- `manual` positioning without `manualPosition`.
- `manualPosition` without finite numeric `x` and `y`.
- `relativeToShapeId` or `destinationBoardId` that does not exist on the target
  page.
- `destinationBoardId` that does not point to a board/frame.
- `push` animation for any overlay action.
- `after-delay` on a non-board source shape.

## Response

Successful execution should return the same interaction summary shape exposed by
`prototype.list_interactions`:

- `sourceShapeId`
- `sourceShapeName`
- `index`
- `trigger`
- `delay`
- `actionType`
- `destinationBoardId` and `destinationBoardName` when present
- `relativeToShapeId` and `relativeToShapeName` when present
- `overlayPositionType` and `overlayPosition` for open/toggle overlays
- `closeClickOutside` and `backgroundOverlay` for open/toggle overlays
- `animation` when present

The status envelope should also include `fileId`, `pageId`, `revn`, `vern`,
`adapter`, and `adapterSelection`.

## Contract Fixtures

Minimum valid fixtures:

```json
[
  {
    "name": "open centered overlay",
    "payload": {
      "fileId": "file-id",
      "pageId": "page-id",
      "sourceShapeId": "button-id",
      "actionType": "open-overlay",
      "destinationBoardId": "modal-board-id"
    },
    "summary": {
      "actionType": "open-overlay",
      "overlayPositionType": "center",
      "overlayPosition": { "x": 0, "y": 0 },
      "closeClickOutside": false,
      "backgroundOverlay": false
    }
  },
  {
    "name": "toggle manual relative overlay",
    "payload": {
      "fileId": "file-id",
      "pageId": "page-id",
      "sourceShapeId": "button-id",
      "actionType": "toggle-overlay",
      "destinationBoardId": "menu-board-id",
      "relativeToShapeId": "button-id",
      "overlayPositionType": "manual",
      "manualPosition": { "x": 12, "y": 16 },
      "closeClickOutside": true,
      "backgroundOverlay": true
    },
    "summary": {
      "actionType": "toggle-overlay",
      "relativeToShapeId": "button-id",
      "overlayPositionType": "manual",
      "overlayPosition": { "x": 12, "y": 16 },
      "closeClickOutside": true,
      "backgroundOverlay": true
    }
  },
  {
    "name": "close current overlay",
    "payload": {
      "fileId": "file-id",
      "pageId": "page-id",
      "sourceShapeId": "close-button-id",
      "actionType": "close-overlay"
    },
    "summary": {
      "actionType": "close-overlay"
    }
  }
]
```
