# Prototype Mutation Helper Contracts

Status: P22.4 descriptor-only planning. No runtime adapter is executable yet.

This document defines the next persisted prototype interaction helper contracts
after stable-id deletion. These contracts intentionally do not register
executable MCP tool handlers or add CLI commands yet; they only reserve command
names, target identity rules, payload boundaries, and response expectations in
the shared command runtime.

## Commands

```text
prototype.update_interaction
prototype.reorder_interaction
prototype.duplicate_interaction
```

Adapters:

- `backend-command`: planned, but unavailable until legacy/id-missing files
  have a migration and copy/remap duplicate-id behavior is settled. P23.2
  already generates ids for new backend-command interactions, and P23.3
  backfills legacy missing/duplicate ids through a common file-data migration.
- `plugin-live`: not part of these contracts. These helpers mutate persisted
  file data, not editor-local workspace state.

The command-runtime descriptors advertise `adapters: []` until implementation.

P23.2 implemented backend-command create-time id generation and P23.3
implemented legacy backfill. These helper descriptors remain adapterless until
copy/remap distinct-copy id regeneration and executable helper semantics are
settled.

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
- Affected interaction identities for entries whose indexes changed.
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
- Affected interaction identities for entries whose indexes changed.
- `revn`, `vern`, and `adapterSelection`.

## Implementation Prerequisites

Before any descriptor becomes executable:

1. New backend-command interaction creation must assign persisted UUIDs.
2. Done in P23.3: legacy/id-missing files receive ids through a common
   file-data migration.
3. Copy/duplicate/remap paths must define when interaction ids are preserved
   and when fresh ids are generated.
4. Common/backend fixtures must cover stable target, legacy target, stale guard,
   missing id, duplicate id, and action-specific validation.
5. MCP and CLI tests must prove the descriptor, request payload, response, and
   structured errors before exposing a runtime adapter.
