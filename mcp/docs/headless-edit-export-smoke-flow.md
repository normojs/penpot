# Headless Edit And Export Smoke Flow

Status: P14.2 release-verification smoke flow

This flow verifies that MCP and `penpot-cli` can create and edit a useful
prototype target, then render or export an artifact, without opening or binding
a live Penpot workspace.

Use it after command-runtime, backend-command, shape, or exporter changes. It
also acts as the manual fallback when full frontend/backend test tooling is not
available locally.

## Scope

The flow covers:

- file creation through backend RPC
- page creation through the `backend-command` adapter
- frame, rectangle, and text creation through `backend-command`
- shape updates through `backend-command`
- exporter-backed preview and page export with explicit file/page/object ids
- adapter diagnostics in both CLI and MCP responses
- artifact output written to disk

The flow intentionally does not use `file.open`, `file.bind_context`, the
workspace MCP menu, selection state, or plugin-live execution.

## Preconditions

Have a running Penpot stack with backend and exporter reachable by the CLI:

```bash
export PENPOT_BACKEND_URI=http://localhost:6060
export PENPOT_EXPORTER_URI=http://localhost:6061
export PENPOT_CLI_TOKEN=<auth-token>
export PROJECT_ID=<project-id>
export PROFILE_ID=<profile-id>
export OUT_DIR=/tmp/penpot-headless-smoke
mkdir -p "$OUT_DIR"
```

Token lookup order is `--token`, `PENPOT_CLI_TOKEN`,
`PENPOT_MCP_USER_TOKEN`, then `PENPOT_ACCESS_TOKEN`. Use a token that can edit
the target project. `PROFILE_ID` is optional when the backend can resolve
`get-profile` for the token, but passing it makes the smoke evidence explicit.

Build the CLI before running the flow:

```bash
pnpm cli:install-check
```

## Static Checks

These checks run without a live workspace and protect the adapter-selection and
dry-run contracts used by this flow:

```bash
pnpm --filter penpot-cli test
pnpm --dir mcp --filter mcp-server test
git diff --check
```

The CLI smoke tests cover exporter dry-runs, preview dry-runs, output writes,
and no-service validation. The MCP server tests cover backend-command adapter
selection for page/shape tools and exporter resource metadata for previews.

## CLI Flow

Use JSON output and keep each response as completion evidence.

1. Create a file.

   ```bash
   node penpot-cli/dist/index.js file create \
     --project-id "$PROJECT_ID" \
     --name "Headless smoke $(date +%Y%m%d-%H%M%S)" \
     --format json
   ```

   Capture `FILE_ID` from the response. The command uses backend RPC and
   requires no workspace context.

2. Create a page.

   ```bash
   node penpot-cli/dist/index.js page create \
     --file "$FILE_ID" \
     --name "Generated prototype" \
     --format json
   ```

   Capture `PAGE_ID`. Expected diagnostics:

   - `adapter: "backend-command"`
   - `adapterSelection.status: "selected"`
   - `adapterSelection.selected: "backend-command"`

3. Create a frame that will become the export target.

   ```bash
   node penpot-cli/dist/index.js shape create-frame \
     --file "$FILE_ID" \
     --page "$PAGE_ID" \
     --name "Smoke frame" \
     --x 0 \
     --y 0 \
     --width 390 \
     --height 844 \
     --fill "#ffffff" \
     --format json
   ```

   Capture `FRAME_ID`. Expected adapter diagnostics are the same
   `backend-command` selection.

4. Create a rectangle inside the frame.

   ```bash
   node penpot-cli/dist/index.js shape create-rect \
     --file "$FILE_ID" \
     --page "$PAGE_ID" \
     --parent "$FRAME_ID" \
     --name "Hero block" \
     --x 24 \
     --y 32 \
     --width 342 \
     --height 180 \
     --fill "#3366ff" \
     --border-radius 16 \
     --format json
   ```

   Capture `RECT_ID`.

5. Create text inside the frame.

   ```bash
   node penpot-cli/dist/index.js shape create-text \
     --file "$FILE_ID" \
     --page "$PAGE_ID" \
     --parent "$FRAME_ID" \
     --name "Headline" \
     --x 40 \
     --y 64 \
     --width 280 \
     --height 48 \
     --content "Headless smoke" \
     --font-size 24 \
     --format json
   ```

   Capture `TEXT_ID`.

6. Update the rectangle to prove write edits work after creation.

   ```bash
   node penpot-cli/dist/index.js shape update \
     --file "$FILE_ID" \
     --page "$PAGE_ID" \
     --shape "$RECT_ID" \
     --x 28 \
     --y 36 \
     --width 334 \
     --fill "#1f8a70" \
     --border-radius 20 \
     --format json
   ```

   Expected diagnostics:

   - `adapter: "backend-command"`
   - no `file_context_required` error
   - a non-empty update payload in the response evidence

7. Optional: list pages to confirm the generated page is persisted.

   ```bash
   node penpot-cli/dist/index.js page list \
     --file "$FILE_ID" \
     --format json
   ```

8. Preview the frame with a dry-run first.

   ```bash
   node penpot-cli/dist/index.js render preview \
     --file "$FILE_ID" \
     --page "$PAGE_ID" \
     --object "$FRAME_ID" \
     --profile-id "$PROFILE_ID" \
     --scale 2 \
     --dry-run \
     --format json
   ```

   Expected diagnostics:

   - `adapter: "exporter"`
   - `adapterSelection.status: "selected"`
   - `artifact.kind: "preview"`
   - planned exporter payload uses `cmd: "export-shapes"`
   - planned exporter payload uses PNG output

9. Write the preview artifact.

   ```bash
   node penpot-cli/dist/index.js render preview \
     --file "$FILE_ID" \
     --page "$PAGE_ID" \
     --object "$FRAME_ID" \
     --profile-id "$PROFILE_ID" \
     --scale 2 \
     --output "$OUT_DIR/preview.png" \
     --format json
   ```

   Verify the artifact:

   ```bash
   test -s "$OUT_DIR/preview.png"
   ```

10. Dry-run a page export against the same frame.

    ```bash
    node penpot-cli/dist/index.js export page \
      --file "$FILE_ID" \
      --page "$PAGE_ID" \
      --object "$FRAME_ID" \
      --profile-id "$PROFILE_ID" \
      --export-format png \
      --scale 2 \
      --dry-run \
      --format json
    ```

    Expected diagnostics match the exporter adapter and the
    `export-shapes` request payload.

11. Write the export artifact.

    ```bash
    node penpot-cli/dist/index.js export page \
      --file "$FILE_ID" \
      --page "$PAGE_ID" \
      --object "$FRAME_ID" \
      --profile-id "$PROFILE_ID" \
      --export-format png \
      --scale 2 \
      --output "$OUT_DIR/export.png" \
      --format json
    ```

    Verify the artifact:

    ```bash
    test -s "$OUT_DIR/export.png"
    ```

## MCP Equivalent Flow

Run the same scenario from an MCP client with explicit ids:

1. `file.create` with `projectId` and `name`.
2. `page.create` with `fileId` and `name`.
3. `shape.create_frame` with `fileId`, `pageId`, geometry, and fill.
4. `shape.create_rect` with `fileId`, `pageId`, `parentId`, geometry, fill,
   and radius.
5. `shape.create_text` with `fileId`, `pageId`, `parentId`, geometry, content,
   and font size.
6. `shape.update` with `fileId`, `pageId`, `shapeId`, and at least one update
   field.
7. `render.preview` with `fileId`, `pageId`, `objectId`, and optional
   `profileId`.
8. `export.page` with explicit file, page, object, profile, format, and scale
   fields when that tool is available through the client catalog.

Expected MCP evidence:

- page and shape write tools select `backend-command`
- each backend-command response includes `adapterSelection`
- render/export tools select `exporter`
- preview/export responses include artifact or resource metadata
- no response requires `file.bind_context`
- no response uses plugin-live fallback for this explicit-id path

## Pass Criteria

P14.2 passes when one run can show:

- a created file id, page id, frame id, rectangle id, and text id
- backend-command adapter diagnostics for page and shape writes
- exporter adapter diagnostics for preview/export
- dry-run exporter payload evidence before artifact execution
- at least one non-empty output artifact on disk
- no opened or bound workspace context during the flow

## Failure Guide

| Symptom | Likely cause | Recovery |
| --- | --- | --- |
| `authentication_required` or missing token error | No usable CLI/MCP token | Pass `--token` or set `PENPOT_CLI_TOKEN` |
| Backend unavailable | Wrong backend URI or service is down | Check `PENPOT_BACKEND_URI` and backend logs |
| Exporter unavailable | Wrong exporter URI or service is down | Check `PENPOT_EXPORTER_URI`, frontend, backend, and exporter |
| Profile resolution fails | Token cannot call `get-profile` or profile is ambiguous | Pass `--profile-id` or set `PENPOT_PROFILE_ID` |
| `adapter_not_available` | Required explicit ids are missing or adapter is unsupported | Pass `fileId`, `pageId`, and `objectId`; keep live-only tools out of this flow |
| `file_context_required` | The command fell into plugin-live mode | Re-run with explicit file/page/object ids |
| Object not found or forbidden | Wrong id or insufficient project access | Confirm ids from prior JSON responses and token permissions |
| Empty shape update rejected | No actual update field was supplied | Add at least one geometry, style, hierarchy, or text update |
| Output download fails | Resource URI is not reachable from the CLI environment | Check gateway/exporter URLs and retry without `--output` to inspect resource metadata |

## Completion Evidence

Attach or record these items in release notes or test logs:

- JSON output from file creation
- JSON output from page creation with `adapterSelection`
- JSON output from at least one shape creation and one shape update
- JSON output from preview dry-run and export dry-run
- artifact paths and byte-size checks for preview/export output
- note confirming no `file.open`, `file.bind_context`, workspace MCP menu, or
  live plugin context was used
