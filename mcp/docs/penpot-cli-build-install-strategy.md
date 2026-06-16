# penpot-cli Build And Install Strategy

This document records the Phase 13.1 packaging decision for the `penpot-cli`
fork.

## Decision

`penpot-cli` remains a private top-level workspace package for the first
distribution wave.

| Topic | Decision |
| --- | --- |
| Package name | Keep `penpot-cli` in `penpot-cli/package.json`. |
| Binary name | Keep the public binary name `penpot-cli`. |
| Package visibility | Keep `"private": true`; do not publish to npm yet. |
| Versioning | Keep the CLI package version independent from the Penpot product version; use package semver for CLI interface changes and git tags/changelog entries for fork releases. |
| Runtime dependency boundary | Keep depending on workspace `@penpot/command-runtime`; do not ship an independent tarball until workspace dependencies are bundled or published together. |
| Primary install mode | Build and run from a private fork checkout. |

The important constraint is the workspace dependency on
`@penpot/command-runtime`. Publishing or installing a standalone tarball while
that dependency is declared as `workspace:*` would create an install path that
works in the monorepo but fails for users outside the checkout. Until the
runtime and CLI are packaged together, the supported path is a private checkout
or workspace link.

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

Before `penpot-cli` becomes a portable artifact, one of these must be true:

- `@penpot/command-runtime` is published with the CLI under compatible
  versions.
- The CLI build bundles `@penpot/command-runtime` into the emitted executable
  code.
- A release archive includes both packages and a documented workspace install
  layout.

The next packaging slice should focus on MCP plugin assets rather than changing
the CLI package boundary.

## Verification

Use these checks for P13.1 and future CLI packaging edits:

```bash
pnpm --filter penpot-cli types:check
pnpm --filter penpot-cli lint
pnpm --filter penpot-cli build
pnpm --filter penpot-cli test
pnpm --filter penpot-cli smoke:help
pnpm cli:install-check
```
