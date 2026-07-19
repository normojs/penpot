# Components / Tokens Descriptor Boundaries

Status: Phase 27 Components/Tokens wave complete. Executable backend-command
paths now exist for:

- `tokens.list` via `get-file-tokens`
- `tokens.apply` via `apply-file-token` (1..100 shapes + explicit attrs, simple ref/spacing/typography materialization)
- `component.create` via `create-file-component` (single frame or multi-shape wrap)
- `component.instantiate` via `create-file-component-instance` (local or linked library, explicit x/y)

This document turns the post–Phase 26 evaluation in
[`headless-live-gap-audit.md`](./headless-live-gap-audit.md) into an executable
planning contract for a future components/tokens wave. It reserves public
command names and documents why adapters stay empty until library-file targeting
and token apply scope are explicit.

## Product Intent

Agents already see these names in `ToolNames.ts` under design editing:

```text
component.create
component.instantiate
tokens.list
tokens.apply
```

Today those names are **not** registered in `PenpotMcpServer`, have **no**
`command-runtime` descriptors, and have **no** `penpot-cli` commands. Common
library helpers and tokens-lib models exist, but there is no headless request
path. Agents must not treat name presence as executable support.

Phase 27 makes the names discoverable as **planned, non-executable** command
catalog entries. P27.2 added empty-adapter `CommandDescriptors` and the
`ComponentsTokensCommandDescriptors` group. Later phases may add fixtures,
backend-command helpers, MCP tools, and CLI commands.

## Command Set

| Command | Planned role | First safe adapter candidate | Current adapter list |
| --- | --- | --- | --- |
| `component.create` | Create a local-file component from one non-component frame | `backend-command` | `["backend-command"]` |
| `component.instantiate` | Place a local-file component instance at explicit x/y | `backend-command` | `["backend-command"]` |
| `tokens.list` | Read token sets/themes/tokens for a file | `backend-command` read-only | `["backend-command"]` |
| `tokens.apply` | Apply a token to one shape for explicit attributes | `backend-command` | `["backend-command"]` |

CLI names (reserved, not registered in Phase 27):

```text
component create
component instantiate
tokens list
tokens apply
```

## Non-Goals For Phase 27

- Register MCP tools for any of the four names.
- Register executable or dry-run CLI commands.
- Add backend-command or plugin-live adapters.
- Call `generate-add-component`, `generate-instantiate-component`, tokens-lib
  mutators, or plugin `penpot.library.local.tokens` APIs from MCP/CLI.
- Define variant-container UX, remote library sync, DTCG import/export, or
  token theme switching as product features in this phase.
- Invent persisted "current selection" shortcuts; create/instantiate must take
  explicit shape/page/file ids when they become executable.

## Existing Penpot Surfaces

### Components (common library logic)

Common already owns component creation and instantiation change builders:

- `app.common.logic.libraries/generate-add-component`
- `app.common.logic.libraries/generate-add-component-changes`
- `app.common.logic.libraries/generate-instantiate-component`

These require file objects, page context, libraries map, positions, and
optional parent/frame placement. They are **not** headless MCP/CLI entry points
today. Plugin overview paths already surface component instance summaries when
a shape is an instance (`PenpotUtils` component fields).

### Tokens (common tokens-lib + plugin helpers)

Common owns:

- `app.common.types.tokens-lib` token set/theme catalog model
- `app.common.types.token/apply-token-to-shape` and unapply helpers
- `app.common.files.changes_builder` tokens-lib change builders
  (`set-tokens-lib`, token/set/theme mutations)

Plugin helpers already read the **local** token catalog for overview/search:

- `PenpotUtils.findTokensByName`
- `PenpotUtils.findTokenByName`
- `PenpotUtils.tokenOverview`

Those are plugin-live conveniences, not a shared command contract. Feature flags
and file data may omit tokens entirely; headless reads must tolerate empty libs.

## Open Contracts Before Any Adapter

### 1. Library-file targeting (components)

Executable create/instantiate must answer:

| Question | Why it blocks adapters |
| --- | --- |
| Which file owns the component definition? | Main file local library vs shared library file |
| Which page hosts the main instance after create? | Create mutates page shapes and library data |
| How are source shapes selected without live selection? | Explicit `shapeIds` required for headless |
| How is instantiate placement expressed? | `pageId` + `x`/`y` and optional `parentId`/`frameId` |
| How are remote/linked libraries addressed? | `componentFileId` / libraries map identity |

Phase 27 recommendation:

- Prefer **local-file components only** for the first future executable slice.
- Require explicit `fileId`, `pageId`, and shape/component ids.
- Defer remote library publish/sync and variant-container creation.

### 2. Component root selection (`component.create`)

Mirror common rules at a high level:

- One frame that is not already a component head may become the root.
- Otherwise a future headless path must either reject multi-shape create or
  define a board-wrapping policy equivalent to the UI `prepare-create-board`
  path.
- Phase 27 reserves create for **explicit shape ids**; it does not define the
  multi-shape wrap policy yet.

Planned input sketch (non-normative until fixtures exist):

```json
{
  "fileId": "uuid",
  "pageId": "uuid",
  "shapeIds": ["uuid"],
  "name": "optional",
  "adapter": "auto"
}
```

### 3. Instantiate identity (`component.instantiate`)

Planned input sketch:

```json
{
  "fileId": "uuid",
  "pageId": "uuid",
  "componentId": "uuid",
  "componentFileId": "uuid",
  "x": 0,
  "y": 0,
  "parentId": "optional",
  "frameId": "optional",
  "adapter": "auto"
}
```

Open questions:

- Is `componentFileId` required always, or defaulted to `fileId` for local
  components?
- Are nested instances inside other components in scope for v1?

### 4. Token list summary (`tokens.list`)

First useful **read-only** command after descriptors. Planned summary fields:

- file identity and whether tokens-lib is present
- token sets: id/name/description, token counts
- tokens: name, type, set id (values redacted or summarized; no secret-like
  expansion of unresolved refs beyond stored value strings already in file data)
- themes: id/name/path and active theme paths if available

Planned input sketch:

```json
{
  "fileId": "uuid",
  "setId": "optional",
  "includeValues": false,
  "adapter": "auto"
}
```

`includeValues` defaults false so agents can inventory structure without large
payloads. Values remain file data when explicitly requested later.

### 5. Token apply scope (`tokens.apply`)

Write path stays deferred longer than list:

| Question | Why it blocks adapters |
| --- | --- |
| Which shape attributes map from which token type? | Existing token-attr maps are broad |
| Apply to one shape vs selection vs style? | Headless needs explicit `shapeIds` |
| Theme activation vs attribute apply? | Different mutations |
| Active sets / resolution order? | Affects resolved values |

Phase 27 keeps `tokens.apply` named and descriptor-only with empty adapters so
agents see it as planned, not missing and not executable.

## Descriptor Boundary Rules

P27.2 command-runtime entries already satisfy:

1. Public MCP tool names reserved in `ToolNames.ts`.
2. `adapters: []` (empty). Do **not** advertise `backend-command` or
   `plugin-live` until an executable contract ships.
3. Descriptions and response shapes mark planned / non-executable boundaries.
4. CLI command strings are reserved without implementing CLI handlers.
5. MCP tool construction in `PenpotMcpServer` is unchanged.
6. Fail closed: accidental execution must return `adapter_not_available` /
   planned-boundary messaging rather than partial plugin-only behavior.

Descriptor group:

```text
ComponentsTokensCommandDescriptors =
  component.create
  component.instantiate
  tokens.list
  tokens.apply
```

The group is part of `MigratedCommandDescriptors`. Runtime and CLI smoke tests
assert empty adapters and lookup by id / mcpToolName / cliCommand.

## Adapter Selection Reason Codes (future)

Reserve reason text for later selection helpers; do not implement selection in
Phase 27:

| Code (proposed) | Message intent |
| --- | --- |
| `backend_command_component_contract_unsupported` | Component create/instantiate needs library-file and root/placement contracts |
| `backend_command_tokens_read_planned` | Token list is planned read-only once summary fixtures exist |
| `backend_command_tokens_apply_unsupported` | Token apply needs attribute-scope contract |
| `cli_component_tokens_unsupported` | CLI does not execute components/tokens until headless adapters exist |

## Error And Permission Expectations (future executable waves)

When adapters exist:

- Reuse existing file permission checks for read (list) and edit
  (create/instantiate/apply).
- Missing file/page/shape/component ids → not-found / validation errors, not
  silent no-ops.
- Empty tokens-lib → successful empty list, not an error.
- Create without edit permission → permission denied.
- Never require live selection; always accept explicit ids.

## Phase Plan

| ID | Scope | Exit criteria |
| --- | --- | --- |
| P27.1 | Planning document and tracker open | This doc + `todo.md` Phase 27 rows; audit/architecture pointers updated |
| P27.2 | Descriptor-only command-runtime entries | Four descriptors resolve with `adapters: []`; runtime and CLI smoke tests cover the group |
| P27.3 | Inventory/docs alignment polish | Inventory/architecture mark descriptors as planned/non-executable and keep MCP/CLI unregistered |
| P27.4+ (out of phase or later) | Read-only `tokens.list` fixtures and optional backend-command read | Executable only after summary fixtures |
| Later | `component.create` / `component.instantiate` fixtures then backend-command | Library-file targeting closed |
| Later | `tokens.apply` contract then write path | Attribute apply scope closed |

## Verification For Descriptor-Only Slices

- `getCommandDescriptor` resolves each of the four names by id, mcp tool name,
  and reserved CLI string.
- Each descriptor has empty `adapters`.
- MCP server tool registry still does **not** construct tools for these names.
- CLI help/execution does **not** gain working component/tokens commands until
  a later phase explicitly registers them.
- Docs state "planned / non-executable" so agents do not treat catalog presence
  as runtime support.

## Decision Summary

1. Open Phase 27 as a **descriptor boundary** wave, not an authoring feature
   wave.
2. Prefer read-only `tokens.list` as the first future executable candidate after
   descriptors.
3. Keep component create/instantiate and `tokens.apply` non-executable until
   library-file targeting and apply-scope contracts have fixtures.
4. Do not register plugin-live-only tools as a temporary substitute for
   headless automation.
