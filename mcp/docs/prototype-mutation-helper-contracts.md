# Prototype Mutation Helper Contracts

Status: P23.4 executable backend-command helpers.

This document defines the next persisted prototype interaction helper contracts
after stable-id deletion. P22.4 first reserved command names, target identity
rules, payload boundaries, and response expectations in the shared command
runtime. P23.4 turns those contracts into executable common/backend helpers,
MCP tools, and `penpot-cli` commands.

## Commands

```text
prototype.update_interaction
prototype.reorder_interaction
prototype.duplicate_interaction
```

Adapters:

- `backend-command`: executable in P23.4 for explicit persisted file targets.
  P23.2 generates ids for new backend-command interactions, P23.3 backfills
  legacy missing/duplicate ids, and P23.4 regenerates ids for distinct copied
  shapes/pages before enabling these helpers.
- `plugin-live`: not part of these contracts. These helpers mutate persisted
  file data, not editor-local workspace state.

The command-runtime descriptors advertise `adapters: ["backend-command"]` and
CLI commands for all three helpers.

P23.2 implemented backend-command create-time id generation, P23.3 implemented
legacy backfill, and the first P23.4 slice implemented copy/remap
distinct-copy id regeneration. The second P23.4 slice implemented executable
update, reorder, and duplicate helper semantics.

## Shared Targeting

All three helpers use the same target identity model as
`prototype.delete_interaction`:

- Preferred stable target: `fileId`, `interactionId`, optional `pageId`,
  optional `sourceShapeId`, optional `interactionIndex`.
- Legacy fallback target: `fileId`, optional `pageId`, `sourceShapeId`, and
  `interactionIndex`.
- If `interactionId` and source/index are supplied together, source/index are
  guards. Guard mismatches must return
  `prototype-interaction-target-stale`.
- Missing ids return `prototype-interaction-not-found`.
- Duplicate ids return `prototype-interaction-id-conflict` and must not write.

## Update Interaction

`prototype.update_interaction` updates fields on exactly one existing
interaction. It does not move the interaction, duplicate it, delete it, or
change the interaction `actionType`.

Payload:

- Target fields from Shared Targeting.
- `patch.trigger`: `click`, `mouse-enter`, `mouse-leave`, or `after-delay`.
- `patch.delay`: non-negative milliseconds. Valid only with
  `trigger = after-delay`.
- `patch.animation`: supported transition metadata for the current action type.
- `patch.destinationBoardId`: allowed for navigate/open/toggle interactions.
- `patch.preserveScrollPosition`: allowed for navigate interactions.
- `patch.overlayPositionType`, `patch.manualPosition`,
  `patch.relativeToShapeId`, `patch.closeClickOutside`, and
  `patch.backgroundOverlay`: allowed for open/toggle overlay interactions.

Validation:

- Reject an empty patch.
- Reject `actionType` changes; create/delete remains the action conversion
  path.
- Reject fields incompatible with the existing action type.
- Reject board/shape ids that cannot be resolved from the target page.
- Reuse the overlay validation rules from
  `prototype-create-overlay-contract.md` for manual position and unsupported
  push animation.

Response:

- Updated interaction summary.
- `revn` and `vern`.
- `adapterSelection`.

## Reorder Interaction

`prototype.reorder_interaction` moves one interaction inside the same source
shape interaction vector.

Payload:

- Target fields from Shared Targeting.
- `sourceShapeId`: required as the owner or guard.
- `toIndex`: zero-based destination index in the same source shape.
- `fromIndex`: optional alias for `interactionIndex` when the caller wants an
  explicit source-index guard.

Validation:

- Reject cross-shape moves.
- Reject `toIndex` outside the current vector bounds.
- Reject stale source/index guards before writing.
- Preserve every interaction payload except vector order.

Response:

- Moved interaction summary at its new index.
- `revn`, `vern`, and `adapterSelection`.

## Duplicate Interaction

`prototype.duplicate_interaction` copies one interaction on the same source
shape.

Payload:

- Target fields from Shared Targeting.
- `insertionIndex`: optional zero-based insertion index. Defaults to directly
  after the source interaction.

Validation:

- Reject cross-shape duplication until remap semantics are explicitly defined.
- The duplicated interaction must receive a fresh persisted interaction UUID.
  Callers must not provide the new id.
- Preserve action payload fields, but remap copied interaction identity.
- Reject duplicate source ids before writing.

Response:

- New duplicated interaction summary, including generated `interactionId`.
- `revn`, `vern`, and `adapterSelection`.

## Implementation Status

Completed before exposing runtime adapters:

1. New backend-command interaction creation must assign persisted UUIDs.
2. Done in P23.3: legacy/id-missing files receive ids through a common
   file-data migration.
3. Done for distinct copied shapes/pages in P23.4: copy/duplicate/remap paths
   preserve ids only for explicit non-copy reference rewrites and generate
   fresh ids for distinct copied interactions.
4. Done in P23.4: common/backend fixtures cover stable target, stale guard,
   action-compatible updates, same-source reorder, and fresh-id duplicate.
5. Done in P23.4: MCP and CLI tests prove descriptor exposure, request
   payloads, adapter selection, and response metadata.
