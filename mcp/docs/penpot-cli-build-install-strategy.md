# penpot-cli Build And Install Strategy

This document records the Phase 13.1 packaging decision for the `penpot-cli`
fork and the P16.5 portable archive path.

## Decision

`penpot-cli` remains a private top-level workspace package. It is not published
to npm, but the workspace now has a private portable release archive for fork
distribution.

| Topic | Decision |
| --- | --- |
| Package name | Keep `penpot-cli` in `penpot-cli/package.json`. |
| Binary name | Keep the public binary name `penpot-cli`. |
| Package visibility | Keep `"private": true`; do not publish to npm yet. |
| Versioning | Keep the CLI package version independent from the Penpot product version; use package semver for CLI interface changes and git tags/changelog entries for fork releases. |
| Runtime dependency boundary | Keep depending on workspace `@penpot/command-runtime` during development; copy the runtime package files into the private release archive. |
| Primary install mode | Build and run from a private fork checkout. |
| Portable artifact | Generate `tmp/penpot-cli-release/penpot-cli-<version>.tar.gz` with `pnpm cli:package-check`. |

The important constraint is the workspace dependency on
`@penpot/command-runtime`. Publishing or installing a generic npm tarball while
that dependency is declared as `workspace:*` would create an install path that
works in the monorepo but fails for users outside the checkout. The supported
portable path is therefore a generated release archive that carries both the
built CLI and a local `node_modules/@penpot/command-runtime` copy.

## Fresh Checkout Flow

Run from the repository root:

```bash
pnpm install
pnpm cli:install-check
```

The check builds `penpot-cli` and runs `node penpot-cli/dist/index.js --help`.
It proves the TypeScript package, workspace dependency, emitted binary target,
and help entry point are wired correctly.

Direct execution remains supported:

```bash
pnpm --filter penpot-cli build
node penpot-cli/dist/index.js --help
```

## Local Workspace Link

For repeated local use, link the workspace package after dependencies are
installed:

```bash
pnpm --filter penpot-cli build
pnpm --dir penpot-cli link --global
penpot-cli --help
```

This link mode is intended for a developer machine that keeps the checkout
available. It is not a portable release artifact because the linked package
still resolves workspace dependencies through the checkout.

## Release Artifact Boundary

Do not use `pnpm pack`, `npm publish`, or a copied `dist/` directory as the
supported installation path yet.

The supported portable release artifact is created from the repository root:

```bash
pnpm cli:package-check
```

The command builds `penpot-cli`, writes
`tmp/penpot-cli-release/penpot-cli-<version>/`, creates
`tmp/penpot-cli-release/penpot-cli-<version>.tar.gz`, extracts the archive, and
smoke-checks:

```bash
node dist/index.js --help
node bin/penpot-cli mcp config --format json
```

Archive layout:

```text
penpot-cli-<version>/
  README.md
  RELEASE.md
  package.json
  bin/penpot-cli
  dist/index.js
  node_modules/@penpot/command-runtime/index.js
  node_modules/@penpot/command-runtime/index.d.ts
  node_modules/@penpot/command-runtime/package.json
```

The generated `package.json` stays private and points the binary to
`./bin/penpot-cli`. The archive is intended for private fork releases, not for
npm publication. Future public distribution can still move to either published
compatible runtime packages or a bundled single-package executable build.

## Verification

Use these checks for P13.1 and future CLI packaging edits:

```bash
pnpm --filter penpot-cli types:check
pnpm --filter penpot-cli lint
pnpm --filter penpot-cli build
pnpm --filter penpot-cli test
pnpm --filter penpot-cli smoke:help
pnpm cli:install-check
pnpm cli:package-check
```
