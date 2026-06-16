---
name: Importing a standalone fullstack template into the pnpm monorepo
description: Durable pitfalls when importing an external Vite+Express repo as a self-contained artifact.
---

# Importing a standalone fullstack template as an artifact

A standard Replit fullstack template (Vite client + Express server, server reads
`process.env.PORT`, vite middleware `allowedHosts: true`) is best imported as a
**self-contained artifact package** that keeps its own `package.json`/`vite.config`/server,
rather than refactoring it into the monorepo's OpenAPI/codegen/db conventions.

## Durable pitfalls
- **Bootstrap then replace:** create the artifact via `createArtifact` (gets a registered id,
  allocated `localPort`, workflow), then overwrite the scaffold app files with the repo's own.
  Set package name to `@workspace/<slug>`, `private: true`.
- **`verifyAndReplaceArtifactToml`:** params are exactly `tempFilePath` + `artifactTomlPath`
  (absolute paths). You **cannot remove the `[[integratedSkills]]` block** the scaffold added
  — keep it or the replace fails with `cannot change integratedSkills`.
- **pnpm strict resolution exposes undeclared deps** that npm flat-hoisting hid in the source
  repo. Add the missing ones as DIRECT deps. **Why it's fatal, not a warning:** vite's dep
  scan calls `process.exit(1)` on any unresolved import, so one missing transitive dep crashes
  the dev server even after express logs "serving on port". Also: a transitive dep referenced
  in `vite.config optimizeDeps.include` won't resolve at the project root under pnpm — it must
  be a direct dep.
- Peer-dep version-mismatch warnings (major-version skews) are non-fatal; ignore them.
