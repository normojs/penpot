# Prototype Interaction UUID Generation And Migration Audit

Status: P23.3 migration complete. Backend-command-created prototype
interactions receive persisted stable ids, and legacy file data is backfilled
by a common file-data migration.

This document audits the code paths that create, copy, import, summarize, and
delete persisted prototype interactions before Phase 23 starts assigning stable
interaction UUIDs.

## Decision

P23.2 made the smallest safe runtime change:

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
- Leave legacy/id-missing files as source-index results in P23.2; P23.3 later
  applies the file-data migration described below.

P23.3 selects a common file-data migration:

- Add `0018-assign-prototype-interaction-ids` to
  `common/src/app/common/files/migrations.cljc`.
- Walk every shape `:interactions` vector in `:pages-index` and
  `:components`.
- Track a file-wide seen set across pages and components.
- Preserve the first existing unique `:id`.
- Assign a fresh `uuid/next` id to interactions with missing ids.
- Assign a fresh `uuid/next` id to later duplicate ids.
- Preserve interaction vector order and all non-id payload fields.

Existing copy/remap paths can still duplicate stored interaction ids when
creating distinct copies. That regeneration policy remains separate from the
legacy migration and must be handled before update/reorder/duplicate helpers
become executable.

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
| Legacy migration | `common/src/app/common/files/migrations.cljc` has `0018-assign-prototype-interaction-ids`. | P23.3 assigns missing ids and repairs later duplicate ids while preserving existing first unique ids, order, and payload fields. |

These risks are why update/reorder/duplicate helpers must remain descriptor-only
until copy/remap distinct-copy id regeneration and executable helper semantics
are implemented.

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

## P23.3 Migration Implementation

P23.3 chose the common file-data migration option:

| Option | Pros | Cons | Outcome |
| --- | --- | --- | --- |
| Common file-data migration | Centralized; uses existing migration registry; runs before richer helper execution. | Needs deterministic uniqueness semantics and focused migration coverage. | Selected in P23.3 as `0018-assign-prototype-interaction-ids`. |
| Backend write-time lazy backfill | Runs under file lock during explicit writes. | Legacy files stay id-missing until touched. Needs helper shared by create/update/delete. | Deferred. |
| Fallback-only forever | No migration risk. | Richer helpers must keep legacy source-index complexity and cannot rely on stable ids. | Rejected for Phase 23. |

The focused migration tests cover:

- Id-missing interactions receiving ids without reordering vectors.
- Existing unique ids being preserved.
- Duplicate ids being repaired deterministically by preserving the first
  occurrence and regenerating later duplicates.
- Page and component object containers sharing the same file-wide seen set.
- Payload fields and vector order being preserved.

Remaining future fixtures before executable update/reorder/duplicate:

- Shape/page copy regenerates ids for distinct copies in the same file.
- Import/file duplicate preserves or regenerates ids according to the final
  file-wide uniqueness rule.
- Frontend workspace creation either generates ids or is normalized by an
  explicit save/migration path.

## Command Impact

- `prototype.create_interaction`: P23.2 is id-generating for the
  backend-command path.
- `prototype.create_overlay`: P23.2 is id-generating for the
  backend-command path.
- `prototype.list_interactions`: no contract change; more newly-created results
  will naturally return `identity.kind = stable-id`.
- `prototype.delete_interaction`: no contract change; stable-id deletion becomes
  usable for migrated legacy interactions and newly-created backend-command
  interactions.
- `prototype.update_interaction`, `prototype.reorder_interaction`, and
  `prototype.duplicate_interaction`: remain descriptor-only until P23.4 handles
  copy/remap duplicate-id behavior and executable helper semantics.
