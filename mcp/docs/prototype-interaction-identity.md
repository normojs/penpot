# Prototype Interaction Identity Audit

Status: P22.3 stable-id deletion targeting implemented.

## Scope

This audit covers the stable identity options for persisted prototype
interactions used by:

- `prototype.list_interactions`
- `prototype.delete_interaction`
- `prototype.update_interaction`
- `prototype.reorder_interaction`
- `prototype.duplicate_interaction`
- `prototype.create_interaction`
- `prototype.create_overlay`
- `penpot-cli prototype list-interactions`
- `penpot-cli prototype delete-interaction`

The delete contract now accepts a persisted interaction id when one exists and
keeps source-shape/index targeting as the compatibility fallback. The read
surface exposes explicit identity metadata so agents can decide which target
form is stable.

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
- `headless/delete-prototype-interaction-request` resolves a supplied
  `interaction-id` first, using optional source-shape/index fields as stale
  guards, or falls back to source-shape/index deletion.
- Flow ids are page-level entries. A flow id can help discovery, but it is not
  an interaction parent and cannot identify a specific source-shape
  interaction.

Current public API surfaces mirror this:

- Backend RPC `delete-file-prototype-interaction` accepts `id`, optional
  `page-id`, optional `interaction-id`, optional `source-shape-id`, and
  optional `interaction-index`.
- MCP `prototype.delete_interaction` accepts `fileId`, optional `pageId`,
  optional `interactionId`, optional `sourceShapeId`, and optional
  `interactionIndex`.
- CLI `prototype delete-interaction` accepts `--file`, optional `--page`,
  optional `--interaction-id`, optional `--source`, and optional `--index`.
- `prototype.list_interactions` responses include `identity.kind =
  stable-id|source-index`; `interactionId` appears only when the stored
  interaction carries a persisted id.

Implementation evidence:

- `common/src/app/common/types/shape.cljc` stores `:interactions` on shapes.
- `common/src/app/common/types/shape/interactions.cljc` defines interaction
  schema fields and vector helpers.
- `common/src/app/common/files/headless.cljc` builds summaries with `index`
  plus optional `interaction-id`, and delete requests can resolve by stable id
  or legacy source/index.
- `backend/src/app/rpc/commands/files_update.clj` exposes list/delete RPC
  schemas with optional `interaction-id` and optional legacy
  `interaction-index`.
- `mcp/packages/server/src/tools/PrototypeTools.ts` maps MCP delete calls to
  backend `interaction-id` or `interaction-index`.
- `penpot-cli/src/index.ts` maps CLI `--interaction-id` or `--index` to the
  backend delete target.

## Stability Problem

Legacy source-shape/index identity is stable only between a fresh
`prototype.list_interactions` result and the next write to the same source
shape. It is not stable across:

- Adding an interaction before the target.
- Deleting an earlier interaction.
- Reordering interactions.
- Duplicating shapes or components when interactions are copied.
- Concurrent edits between list and delete.

The backend protects the most obvious legacy stale case by rejecting an index
outside the current vector. When a stored interaction id exists, P22.3 can
delete by that stable id and optionally reject stale source/index guards before
removing anything.

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
- `prototype.delete_interaction` keeps legacy source-shape/index deletion for
  id-missing summaries until those files are migrated or new interactions
  receive persisted ids.

Recommended summary shape:

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

## P22.3 Delete Contract

P22.3 extends deletion without breaking existing callers:

```text
prototype.delete_interaction
```

Accepted target forms:

- Stable form: `fileId`, `interactionId`, optional `pageId`, optional
  `sourceShapeId`, optional `interactionIndex`.
- Legacy form: `fileId`, optional `pageId`, `sourceShapeId`,
  `interactionIndex`.

Rules:

- If `interactionId` is supplied, it is the primary target.
- If `interactionId` and source/index fields are supplied together, source and
  index act as guards. A mismatched source or index returns
  `prototype-interaction-target-stale` rather than deleting by id silently.
- If no interaction carries the requested id, return
  `prototype-interaction-not-found`.
- If more than one interaction carries the requested id, return a conflict or
  validation error and do not delete anything.
- Legacy deletion keeps the current behavior and error codes.
- P22.3 does not generate ids during create/delete and does not add a file-data
  migration.

## P22.4 Planned Helper Contracts

P22.4 defines descriptor-only contracts for:

- `prototype.update_interaction`
- `prototype.reorder_interaction`
- `prototype.duplicate_interaction`

These helpers are intentionally not executable yet. Their command-runtime
descriptors advertise no adapters until new interactions receive persisted
UUIDs and legacy/id-missing files have a migration or explicit fallback policy.

Contract details live in `prototype-mutation-helper-contracts.md`.

## Migration Notes

Preferred migration path:

1. Done in P22.2: add `:id` as an optional field in the shared interaction
   schema.
2. Update interaction creation helpers so new navigate and overlay
   interactions always receive a UUID.
3. Add a file-data migration that walks every shape `:interactions` vector and
   assigns UUIDs to interactions without ids.
4. Preserve existing interaction order and payload fields during migration.
5. During copy/duplicate/remap, keep interaction ids only when the operation is
   a version/history read; generate new ids when creating a distinct copy of a
   shape to avoid duplicate ids in the same file.
6. Done for deletion in P22.3: add duplicate-id detection so old or manually
   edited files cannot make stable-id deletion ambiguous.

Generated fingerprints can still be useful as an optional diagnostic guard, but
they should not be accepted as a primary delete target.

## Descriptor Expectations

No descriptor changes are required in P22.1.

Implemented descriptor changes for P22.2:

- `prototype.list_interactions.responseShape` should mention optional
  `interactionId` and `identity.kind`.
- MCP/CLI tests should cover id-present and id-missing summaries.

Implemented descriptor changes for P22.3:

- `prototype.delete_interaction.inputSchema` should describe
  `interactionId OR sourceShapeId + interactionIndex`.
- MCP/CLI tests cover stable id deletion and legacy deletion; common/backend
  tests cover stale guard mismatch, missing id, duplicate id, and legacy index
  compatibility.

Implemented descriptor changes for P22.4:

- `prototype.update_interaction`, `prototype.reorder_interaction`, and
  `prototype.duplicate_interaction` are descriptor-only planned commands with
  `adapters: []`.
- The descriptors define stable target identity, source/index guards, immutable
  action type for updates, same-source reorder/duplicate boundaries, and fresh
  UUID requirements for duplicated interactions.

## Fixtures

Fixture cases live in
`mcp/docs/prototype-interaction-identity-fixtures.json`.
