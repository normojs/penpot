# Prototype Interaction Identity Audit

Status: P22.2 read metadata implemented. Stable-id deletion remains future
P22.3 work.

## Scope

This audit covers the stable identity options for persisted prototype
interactions used by:

- `prototype.list_interactions`
- `prototype.delete_interaction`
- `prototype.create_interaction`
- `prototype.create_overlay`
- `penpot-cli prototype list-interactions`
- `penpot-cli prototype delete-interaction`

The current delete contract remains source-shape/index based until P22.3
explicitly changes the write surface. The read surface now exposes explicit
identity metadata.

## Current Data Shape

Persisted prototype interactions live inside a source shape:

```clojure
{:id <source-shape-id>
 :interactions [{:action-type :navigate
                 :event-type :click
                 :destination <board-id>}]}
```

Important facts from the current implementation:

- Shape attrs define `:interactions` as an optional vector of
  `ctsi/schema:interaction`.
- `ctsi/schema:interaction` has action/event/destination/overlay fields plus
  an optional `:id` UUID field.
- `ctsi/add-interaction` appends to the vector.
- `ctsi/remove-interaction` removes by vector index.
- `headless/prototype-interactions-summary` emits `source-shape-id`, `index`,
  optional `interaction-id`, and an `identity` map for each summarized
  interaction.
- `headless/delete-prototype-interaction-request` validates
  `interaction-index` against the current source-shape vector, then removes
  that index.
- Flow ids are page-level entries. A flow id can help discovery, but it is not
  an interaction parent and cannot identify a specific source-shape
  interaction.

Current public API surfaces mirror this:

- Backend RPC `delete-file-prototype-interaction` accepts `id`, optional
  `page-id`, `source-shape-id`, and `interaction-index`.
- MCP `prototype.delete_interaction` accepts `fileId`, optional `pageId`,
  `sourceShapeId`, and `interactionIndex`.
- CLI `prototype delete-interaction` accepts `--file`, optional `--page`,
  `--source`, and `--index`.
- `prototype.list_interactions` responses include `identity.kind =
  stable-id|source-index`; `interactionId` appears only when the stored
  interaction carries a persisted id.

Implementation evidence:

- `common/src/app/common/types/shape.cljc` stores `:interactions` on shapes.
- `common/src/app/common/types/shape/interactions.cljc` defines interaction
  schema fields and vector helpers.
- `common/src/app/common/files/headless.cljc` builds summaries and delete
  requests with `index`.
- `backend/src/app/rpc/commands/files_update.clj` exposes list/delete RPC
  schemas with `interaction-index`.
- `mcp/packages/server/src/tools/PrototypeTools.ts` maps MCP delete calls to
  backend `interaction-index`.
- `penpot-cli/src/index.ts` maps CLI `--index` to backend
  `interaction-index`.

## Stability Problem

The current target identity is stable only between a fresh
`prototype.list_interactions` result and the next write to the same source
shape. It is not stable across:

- Adding an interaction before the target.
- Deleting an earlier interaction.
- Reordering interactions.
- Duplicating shapes or components when interactions are copied.
- Concurrent edits between list and delete.

The backend already protects the most obvious stale case by rejecting an index
outside the current vector. It cannot detect a still-in-range index that now
points to a different interaction.

## Options Considered

| Option | Stability | Migration cost | Risk | Decision |
| --- | --- | --- | --- | --- |
| Keep source-shape/index only | Low | None | Still-in-range stale indexes can target the wrong interaction | Keep as compatibility fallback only |
| Generated fingerprint from content | Medium for unchanged content | None | Duplicate interactions collide; any edit changes the reference; hash semantics become a hidden contract | Do not use as a deletion identity |
| Persisted interaction UUID | High | Requires schema, migration, create/list/delete updates | Needs duplicate-id handling during migration and copy/remap flows | Preferred future canonical identity |
| Page-level sidecar map | Medium | High | Splits identity away from the source shape and complicates file-change processing | Reject |

## P22.1 Decision

Future work should introduce a persisted `:id` UUID on each interaction and
use that UUID as the canonical stable identity.

Compatibility rules:

- Existing source-shape/index inputs remain valid.
- Existing summaries keep `index` unchanged.
- New summaries should add optional `interactionId` only when the persisted
  interaction carries an id.
- New summaries should add an `identity` object that makes stability explicit.
- `identity.kind = "stable-id"` means `interactionId` can be used for future
  stable-id writes.
- `identity.kind = "source-index"` means the result is legacy and unstable
  after any source-shape interaction mutation.
- The backend must not synthesize a hash-based id and treat it as stable.
- Stable-id deletion should be added only after `prototype.list_interactions`
  exposes the identity metadata.

## P22.2 Read Contract

P22.2 implements the read side of the P22.1 decision:

- `ctsi/schema:interaction` accepts optional persisted `:id` values.
- `prototype.list_interactions` and related create/delete summaries preserve
  existing `sourceShapeId`/`index` fields.
- Summaries with stored ids include top-level `interactionId` and
  `identity.kind = "stable-id"`.
- Summaries without stored ids include `identity.kind = "source-index"` and
  `unstable: true`.
- No UUIDs are generated during reads or creates in P22.2.
- `prototype.delete_interaction` does not yet accept `interactionId`.

Recommended summary shape for P22.2:

```json
{
  "interactionId": "00000000-0000-0000-0000-000000000101",
  "sourceShapeId": "00000000-0000-0000-0000-000000000003",
  "index": 0,
  "identity": {
    "kind": "stable-id",
    "interactionId": "00000000-0000-0000-0000-000000000101",
    "sourceShapeId": "00000000-0000-0000-0000-000000000003",
    "interactionIndex": 0
  }
}
```

Recommended legacy summary shape for id-missing files:

```json
{
  "sourceShapeId": "00000000-0000-0000-0000-000000000003",
  "index": 0,
  "identity": {
    "kind": "source-index",
    "sourceShapeId": "00000000-0000-0000-0000-000000000003",
    "interactionIndex": 0,
    "unstable": true
  }
}
```

## Future Write Contract

P22.3 can extend deletion without breaking existing callers:

```text
prototype.delete_interaction
```

Accepted target forms:

- Stable form: `fileId`, `interactionId`, optional `pageId`,
  optional `sourceShapeId`.
- Legacy form: `fileId`, optional `pageId`, `sourceShapeId`,
  `interactionIndex`.

Rules:

- If `interactionId` is supplied, it wins over `interactionIndex`.
- If both `interactionId` and legacy fields are supplied, legacy fields should
  act as guards. A mismatched source or index should return a stale-target
  validation error rather than deleting by id silently.
- If no interaction carries the requested id, return
  `prototype-interaction-not-found`.
- If more than one interaction carries the requested id, return a conflict or
  validation error and do not delete anything.
- Legacy deletion keeps the current behavior and error codes.

## Migration Notes

Preferred migration path:

1. Add `:id` as an optional field in `ctsi/schema:generic-interaction-attrs`
   or the shared interaction schema.
2. Update interaction creation helpers so new navigate and overlay
   interactions always receive a UUID.
3. Add a file-data migration that walks every shape `:interactions` vector and
   assigns UUIDs to interactions without ids.
4. Preserve existing interaction order and payload fields during migration.
5. During copy/duplicate/remap, keep interaction ids only when the operation is
   a version/history read; generate new ids when creating a distinct copy of a
   shape to avoid duplicate ids in the same file.
6. Add duplicate-id detection in read/delete helpers so old or manually edited
   files cannot make stable-id deletion ambiguous.

Generated fingerprints can still be useful as an optional diagnostic guard, but
they should not be accepted as a primary delete target.

## Descriptor Expectations

No descriptor changes are required in P22.1.

Implemented descriptor changes for P22.2:

- `prototype.list_interactions.responseShape` should mention optional
  `interactionId` and `identity.kind`.
- MCP/CLI tests should cover id-present and id-missing summaries.

Expected descriptor changes for P22.3:

- `prototype.delete_interaction.inputSchema` should describe
  `interactionId OR sourceShapeId + interactionIndex`.
- MCP/CLI tests should cover stable id deletion, legacy deletion, stale guard
  mismatch, missing id, and duplicate id.

## Fixtures

Fixture cases live in
`mcp/docs/prototype-interaction-identity-fixtures.json`.
