# Prototype Interaction UUID Generation And Migration Audit

Status: P23.2 runtime change complete. Backend-command-created prototype
interactions now receive persisted stable ids; legacy backfill remains
separate.

This document audits the code paths that create, copy, import, summarize, and
delete persisted prototype interactions before Phase 23 starts assigning stable
interaction UUIDs.

## Decision

P23.2 makes the smallest safe runtime change:

- Assign a fresh `uuid/next` value to backend-command-created prototype
  interactions in common headless helpers.
- Cover `prototype.create_interaction` navigate interactions and
  `prototype.create_overlay` open/toggle/close overlay interactions.
- Do not accept caller-provided interaction ids on create. The backend/common
  layer owns stable id generation.
- Preserve the existing response shape. The summary code emits
  `interactionId` and `identity.kind = stable-id` when the stored interaction
  carries `:id`.
- Leave frontend workspace/plugin-live interaction creation unchanged until a
  separate live editor migration/generation task is selected.
- Leave legacy/id-missing files as source-index results until P23.3 chooses a
  backfill or migration policy.

P23.3 should not be folded into P23.2. Existing copy/remap paths can duplicate
stored interaction ids unless they are explicitly changed, so legacy backfill
needs its own fixtures and review.

## Current Creation Paths

| Path | Code | Current id behavior | P23.2 action |
| --- | --- | --- | --- |
| Headless navigate create | `common/src/app/common/files/headless.cljc` `create-navigate-interaction` and `create-prototype-interaction-request` | Builds from `ctsi/default-interaction` and now assigns a fresh `:id` before appending. | Done in P23.2. |
| Headless overlay create | `common/src/app/common/files/headless.cljc` `create-overlay-interaction` and `create-prototype-overlay-request` | Builds from `ctsi/default-interaction` and now assigns a fresh `:id` before appending. | Done in P23.2. |
| Backend RPC create | `backend/src/app/rpc/commands/files_update.clj` `create-file-prototype-interaction` / `create-file-prototype-overlay` | Delegates to common headless request helpers after permission, feature, and file locks, so generated ids are persisted through the normal change path. | No separate id logic needed. |
| Frontend workspace create | `frontend/src/app/main/data/workspace/interactions.cljs` `add-new-interaction` | Builds from `ctsi/default-interaction`; no `:id` is assigned. | Out of P23.2 scope. |
| Plugin live create | `frontend/src/app/plugins/page.cljs` can create flows; interaction mutation is still workspace/data driven. | No separate stable interaction id policy found. | Out of P23.2 scope. |

`ctsi/schema:interaction` already allows optional `:id`, so P23.2 does not need
a schema expansion. Focused tests prove the generated id is present in the
persisted interaction vector and summary.

## Read And Delete Readiness

P22.2 and P22.3 already prepared the read/delete side:

- `prototype-interaction-summary` returns top-level `interaction-id` plus
  `identity.kind = stable-id` when an interaction has `:id`.
- Id-missing interactions continue returning `identity.kind = source-index`.
- `delete-prototype-interaction-request` resolves `interaction-id` first and
  returns `prototype-interaction-id-conflict` if more than one interaction in
  the search scope has the same id.

Because of this, P23.2 is limited to creation-time id assignment plus tests.
MCP and CLI payload parsing do not need to change for create commands.

## Copy, Duplicate, And Import Risks

Stable interaction ids need file-wide uniqueness. The current code has several
paths that preserve interaction payloads:

| Path | Evidence | Risk |
| --- | --- | --- |
| Shape/library copy or remap | `common/src/app/common/logic/libraries.cljc` calls `ctsi/remap-interactions`. | `remap-interactions` rewrites `:destination` but preserves `:id`, so copying a shape with interactions can duplicate the interaction id in the same file. |
| Page duplicate | `frontend/src/app/main/data/workspace/pages.cljs` duplicates page objects and only remaps selected variant/component ids. | Non-variant shapes keep interactions unchanged; a duplicated page can carry the same interaction ids as the source page in the same file. |
| File duplicate/import | `backend/src/app/binfile/common.clj` `process-file` relinks general refs through `cfh/relink-refs`. | New file ids make cross-file duplicates acceptable, but `relink-refs` does not define interaction-id regeneration. Imported files with existing duplicate ids can remain ambiguous. |
| Legacy migration | `common/src/app/common/files/migrations.cljc` has `0002-clean-shape-interactions`. | It decodes and validates interactions but does not assign missing ids or fix duplicate ids. A new migration/backfill must be added separately if P23.3 chooses that route. |

These risks are why update/reorder/duplicate helpers must remain descriptor-only
until P23.3 has a migration/backfill and copy/remap policy.

## P23.2 Implementation

Implementation stays in common:

1. `common/src/app/common/files/headless.cljc` assigns `:id (uuid/next)` to new
   prototype interactions before they are appended.
2. `create-navigate-interaction` and `create-overlay-interaction` both use that
   helper, covering navigate, open-overlay, toggle-overlay, and close-overlay
   backend-command paths.
3. Keep RPC schemas unchanged. Create requests should not accept an
   `interaction-id`.
4. Common/backend/MCP/CLI tests expect `interactionId` in create
   responses and stable identity metadata on immediate list responses.
5. Keep existing id-missing list/delete fixtures as compatibility evidence.

Preferred tests:

- Common headless navigate create returns a summary with `interaction-id` and
  `identity.kind = stable-id`.
- Common headless overlay create returns a generated `interaction-id`.
- Backend `create-file-prototype-interaction` and
  `create-file-prototype-overlay` expose the generated id in result schemas.
- MCP and `penpot-cli` create commands preserve the generated id in JSON output.
- Legacy id-missing list/delete tests still return source-index identity.

## Recommended P23.3 Policy Options

P23.3 should choose one of these before changing legacy files:

| Option | Pros | Cons | Current recommendation |
| --- | --- | --- | --- |
| Common file-data migration | Centralized; uses existing migration registry. | If run in read paths before persistence, generated ids may differ across clients until saved. Needs proof of persistence behavior. | Possible, but only after focused migration tests. |
| Backend write-time lazy backfill | Runs under file lock during explicit writes. | Legacy files stay id-missing until touched. Needs helper shared by create/update/delete. | Safest first backfill candidate. |
| Fallback-only forever | No migration risk. | Richer helpers must keep legacy source-index complexity and cannot rely on stable ids. | Not enough for update/reorder/duplicate. |

For any chosen policy, fixtures must cover:

- Id-missing interactions receiving ids without reordering vectors.
- Existing unique ids being preserved.
- Duplicate ids being repaired or reported deterministically.
- Shape/page copy regenerating ids for distinct copies in the same file.
- File duplicate/import preserving or regenerating ids according to the final
  file-wide uniqueness rule.

## Command Impact

- `prototype.create_interaction`: P23.2 is id-generating for the
  backend-command path.
- `prototype.create_overlay`: P23.2 is id-generating for the
  backend-command path.
- `prototype.list_interactions`: no contract change; more newly-created results
  will naturally return `identity.kind = stable-id`.
- `prototype.delete_interaction`: no contract change; stable-id deletion becomes
  usable for newly-created backend-command interactions.
- `prototype.update_interaction`, `prototype.reorder_interaction`, and
  `prototype.duplicate_interaction`: remain descriptor-only until P23.3 and
  P23.4.
