# Integration adoption pass

This pass follows the ecosystem implementation. It targets the work a consumer
must do to get a diagram into another project.

## What changed

| Consumer task                 | Before                                                                       | After                                                                    |
| ----------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Store Markdown assets         | Three host recipes copied 130 lines of file-store code.                      | All three use `createFileAssets`; the copied files are removed.          |
| Render a markdown-it document | Parse, await preparation, then render the same tokens.                       | One `adapter.render` call returns HTML and its manifest.                 |
| Embed a viewer                | Write mount, update, cleanup, stylesheet, and sizing code.                   | Import the optional element and add `<draft-diagram>`.                   |
| Try unpublished changes       | Build and pack each package; find the archive paths and dependency override. | `pnpm integration:pack` writes both archives and exact install commands. |
| Find the first example        | Assemble the setup from API guides and fixtures.                             | One [start guide](../../integrations/README.md) contains complete paths. |

These are changes in setup work. They are not a measured tenfold adoption rate.

## Why these changes

Two fresh consumers exercised the original package archives before editing.
They produced SVGs, but exposed repeated file storage, lifecycle code, and
Markdown preparation steps. A copied viewer example failed Vite's default build
target because it used top-level `await`. The vanilla fixture also omitted its
documented worker setting. Both examples are corrected in the viewer layer.

The pass considered eleven ideas: shorter guides, shared file storage, an async
Markdown method, a native element, framework wrappers, a task-based start page,
JSON emission, full host plugins, preview packages, shared dependency collectors,
and a blob worker. It chose shared helpers, the element, and the start page.

| Bundle                              | Less consumer code | First diagram from a recipe | Works across hosts |
| ----------------------------------- | -----------------: | --------------------------: | -----------------: |
| Shorter guides                      |                  3 |                           8 |                  7 |
| Shared helpers, element, start page |                  9 |                           9 |                  9 |
| Separate host plugins and wrappers  |                  9 |                           9 |                  5 |

Scores are qualitative, from zero to ten. The chosen bundle removes repeated
work without adding framework dependencies. Host cache and watcher rules remain
in their qualified recipes. Module workers remain the default; blob workers
would add a CSP requirement.

## Proof

- `pnpm check` passes 641 tests, the engine suites, and the production build.
- Packed Markdown consumers check SVG and JSON storage, deleted-file restoration,
  publication, concurrent documents, and strict TypeScript imports.
- Each packed host passes two clean builds with an included-source edit between
  them. The asset hash changes and each `/manual/` URL maps to a built SVG.
- Astro's development server returns the shared-store SVG with HTTP 200.
- `pnpm viewer:pack-check` builds the element with Vite's default production
  target and checks the public types and SSR import.
- `pnpm prove:element` checks direct browser import, pre-definition properties,
  nonce-only styles, real workers, fallback, source changes, removal, late results,
  keyboard controls, narrow layout, and isolation from host styles.
- Existing viewer, React Strict Mode, and Solid browser proofs pass.
- An independent browser review found no blocking defects or console errors.
  It verified visible controls, error recovery, removal, keyboard use, and 390px layout.
- A fresh consumer followed the generated install commands and both start-guide
  scripts without corrections. It wrote an SVG, HTML, and the referenced image.
  A separate minimal Vite consumer built with the documented configuration.

## Defaults and limits

The element is optional. Existing imperative APIs remain available. Markdown
stays static unless the host opts into interactive source publication.

Vite development still needs the documented dependency-optimization exclusion.
The file store retains assets for cached pages; hosts choose retention and
publication paths. The qualified Docusaurus recipe still clears its MDX cache.

This work opens draft PRs. It does not publish packages or install upstream
plugins. Registry publication remains a separate release step.

## Review order

- [PR #453](https://github.com/byronwall/draftably/pull/453): shared file assets and async Markdown rendering.
- [PR #455](https://github.com/byronwall/draftably/pull/455): native diagram element and browser proof.
- The start-guide layer adds complete examples and the local package preview command.

The [original implementation evidence](implementation-evidence.md) records the
first eight implementation PRs above the research plan.
