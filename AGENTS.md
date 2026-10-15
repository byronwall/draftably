# Agent notes

Pointers only. Read the linked doc when the task touches it.

- **Checks:** `pnpm check:fast` (about 10s) while iterating; `pnpm check` before pushing. The engine
  suites take about 80s, so run them in the background. Suites, browser proofs and
  failure output: [docs/CHECKS.md](docs/CHECKS.md).
- **Screenshots:** `pnpm shoot <url|file.draft|file.svg> tmp/out.png`, or `--sheet` for a contact
  sheet. Don't write one-off Playwright scripts.
- **Releases:** a PR that changes `src/`, `examples/`, `docs/DSL.md` or `packages/cli/` needs a
  changeset ([docs/RELEASING.md](docs/RELEASING.md)).
- **File language:** [docs/DSL.md](docs/DSL.md). Code map: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
  Plans for in-flight work: `docs/intent/<initiative>/`.
- **Viewer:** `pnpm draftably open <file>` serves a file at `?file=<path>` and prints the real URL on
  its `Viewer:` line; use that URL. In the page, `window.diagramStudio`
  ([src/state/debug-api.ts](src/state/debug-api.ts)) reads file state and geometry.
- **Branches:** build stacked branches in separate worktrees. Run `pnpm install` after switching
  branches in one checkout; it can drop packages another branch needs.
