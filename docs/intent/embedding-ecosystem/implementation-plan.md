# Embedding ecosystem implementation plan

Deliver a native SVG runtime, Markdown adapters, then an independent viewer and broader integration recipes.
Each stage must remain useful if later work stops.
Status: the selected Build scope is implemented and verified in the PR stack. See [implementation evidence](implementation-evidence.md) for commands and review order. Explore recommendations remain proposed follow-ups. This work has not published packages.

Read the [research summary](../../research/embedding-ecosystem-2026-11-03/summary.md) and [recommendation decisions](recommendations.md) first.
The [asset index](asset-index.md) preserves the complete Pro research.
Its [detailed plan](assets/pro-results/2026-11-03/embedding-implementation-plan.md) supplies acceptance details.
The [report](assets/pro-results/2026-11-03/embedding-ecosystem-report.md) supplies proposed types and worked examples.
The checkout corrections below take precedence over conflicting details in those original assets.

## Direction and boundaries

| Stage | Result a builder can use                                                                   | Prerequisite                        |
| ----- | ------------------------------------------------------------------------------------------ | ----------------------------------- |
| M1    | Install a packed `@draftably/runtime` artifact; render source to SVG in Node or a browser. | Existing compiler and SVG renderer. |
| M2    | Write a `draft` fence in unified/MDX; build an accessible SVG image.                       | M1.                                 |
| M3    | Mount, update, and destroy an independent viewer in vanilla JS, React, or Solid.           | M1.                                 |
| M4    | Use markdown-it and tested documentation-host recipes; optionally enhance static Markdown. | M2; M3 for interaction.             |
| M5    | Build outside adapters from shared fixtures and explicit support documentation.            | Stable runtime and one adapter.     |

M2 and M3 can proceed independently after M1. The package names are `@draftably/runtime` and `@draftably/markdown`. Publication remains separate.
Keep the CLI executable, editor, layout engines, and native source format as existing foundations.
The runtime must not install Mermaid, D2, jsdom, CodeMirror, or a UI framework.
Use subpath exports for the optional viewer, not another package per internal layer.

Use the current checkout under its normal Git rules when execution begins.
Reconcile changes since baseline `ed4eff3181ded0c501c35ae18ef6aed9c62de8c5` before editing shared modules.
Do not create a new worktree solely because the original Pro plan suggests a checkout preflight.

## M1 — Portable native SVG runtime

**Status:** Packed Node, strict TypeScript, and plain-browser consumer proofs pass. Package publication remains separate.

Start with the composition in `site/draw.ts`: `compile` → `projectScene` → SVG output.
Read `src/dsl/{syntax,compile,project}.ts`, `src/cli/svg.ts`, `src/lib/font-data.ts`, and `src/model/{embed,link,document}.ts`.
Confirm current contracts in `tests/dsl.test.ts`, `tests/themes.test.ts`, and `tests/embed.test.ts`.

Use three reviewable changes, with package publication after their combined proof:

1. Add a small facade under `src/runtime/`. Define `renderSvg`, `validate`, detached summaries, and structured diagnostics.
2. Extract the required SVG and font code. Add explicit namespace, text/XML, link, source-retention, and resource policies.
3. Add `packages/runtime/`, a Vite 6 library build, declaration output, and an external packed-package proof.

The module names in Pro's plan are suggestions. Split code by real responsibilities, not by every option or noun.
Keep the shared SVG representation limited to the current drawing vocabulary.
The first stage needs a string writer. Add the DOM writer when the viewer requires it.
Use the facade from `site/draw.ts` to prevent a second composition path.

Rendering and validation use asynchronous native compilation. Never substitute `checkSource()` for final engine geometry.
Image output embeds its used fonts. Inline output requires a unique namespace.
Default the new API to no links and no embedded source.
Retain explicit CLI behavior through its internal adapter; document intentional shared changes.
Test author-keyed dictionaries, including accepted inherited-looking IDs, through projection and cloning.

**Proof:** install a packed artifact outside the repository. Render SVG in Node without Chrome or a DOM shim.
Check public TypeScript imports and a browser distribution served under a nested path.
Compare representative current geometry and drawing output, including engine layouts and `fit=`.
Check repeated inline diagrams, unsafe links, decoded invalid XML, source privacy, and both metadata reader forms.
Measure actual package, browser-entry, and font sizes. Do not invent a size target before measurement.

**Docs/example:** add `docs/integrations/runtime.md`, a package README, and consumers under `integration-examples/node-svg/` and `browser-static/`.
Keep framework applications outside `examples/`, which the CLI build copies into its package.
Add a generated-image/source-link recipe for GitHub and package READMEs.

**Release work:** inspect `.changeset/config.json`, `scripts/{add-changeset,check-changeset,build-cli}.ts`, and `.github/workflows/{ci,release}.yml`.
The current helper and release gates target the CLI. Extend them for actual packages and shared-source effects.
Do not publish during proof runs.

**Done:** an external consumer installs the package and produces a portable SVG through documented imports.
Fonts, types, safe output, diagnostics, and current drawing behavior pass focused proofs.
Export only files and capabilities that exist.
**Main risk:** extraction changes output or leaves repository-specific asset imports.

## M2 — Shared Markdown core and remark

**Status:** The packed Unified and MDX consumer proof passes. This proves the static remark path; it does not prove other Markdown hosts.

Add `packages/markdown/` with a shared preparation core and a thin `/remark` adapter.
Use canonical `draft` fences; `.draft` remains the file extension.
Keep theme and layout declarations in the source body.
Default to emitted SVG image assets, with meaningful alt text, dimensions, and optional plain-text captions.

Implement source resolution, metadata validation, diagnostics, and asset publication once.
Resolve included files from the containing Markdown file within a configured content root.
Track include dependencies and retain accurate source locations.
Reject symlink escapes, remote includes, and fence options that grant host authority.
Cache by source, runtime/font identity, and effective render policy.
Prove that warm builds restore referenced assets when output directories start empty.

**Proof:** use packed runtime and Markdown artifacts in one unified HTML and one MDX consumer.
Check nested fences, literal examples, repeated diagrams, include edits/errors, source locations, and a non-root public path.
Inspect output without JavaScript. The default reader bundle must not contain the compiler or viewer.
Keep inline SVG experimental until its HAST/MDX/sanitizer round trip passes.
Reject interactive mode until its later capability exists.

**Docs/example:** `docs/integrations/markdown.md` and `integration-examples/unified/`.
Show the real asset emitter and dependency hooks, not an unexplained helper import.
**Done:** a fresh consumer builds a useful static page from `draft` fences and receives positioned errors.
**Main risk:** correct transforms leave broken assets after caching, rebuilding, or path changes.

## M3 — Independent viewer and framework recipes

**Status:** Packed worker, React Strict Mode, and Solid lifecycle proofs pass. Independent Chrome 156 checks pass keyboard use, camera controls, cleanup, and narrow-screen Actual size and outline inspection.

Add an optional runtime `/viewer` entry with synchronous `mountViewer` ownership and asynchronous `update`.
Each handle owns its camera, pending work, event subscriptions, worker, and disposal.
Use the existing native renderer and a bounded private DOM writer.
Do not import the editor store, `StaticScene`, application keyboard handlers, or the debug API.

Reject stale async commits. Preserve the last good view with visible diagnostics after invalid source.
Destroying a handle must settle pending work and release its resources.
Use a native render worker with explicit failure behavior; document any host-selected main-thread mode.
Keep fonts and worker assets relative to their published entry points.
Resize changes presentation, not source geometry.

Follow [FEEL.md](../diagram-quality/FEEL.md): wheel zoom needs no modifier; background drag pans.
Keep handlers inside the viewer and leave page behavior outside it alone.
Pro's modifier-based wheel suggestion is not the selected default.
Fit with margin, preserve user camera state, and provide named keyboard controls and an accessible outline.

**Proof:** two independent hosts, rapid source updates, invalid input after success, destroy during work, and remount.
Test hidden-to-visible resize, camera preservation, approved links, blocked assets, and SSR fallback.
Run React Strict Mode and Solid cleanup recipes against the packed viewer.
Add Vue/Svelte recipes over the same API; create no framework wrapper packages at this stage.

**Docs/example:** `docs/integrations/viewer.md` and small pinned consumers under `integration-examples/`.
**Done:** documented consumers can mount, update, and dispose without stale output or global editor effects.
**Main risk:** lifecycle leaks and consumer-specific worker/font paths.

## M4 — markdown-it and qualified host recipes

**Status:** Packed remark, MDX, markdown-it, and client proofs pass. The pinned hosts pass production and development include-edit builds. Independent Chrome 156 checks pass the client controls and all three host pages. See [implementation evidence](implementation-evidence.md).

Add `/markdown-it` over the shared Markdown core.
Expose parse → await preparation → render the same tokens.
Prove concurrent documents and errors when preparation is missing.

Maintain versioned recipes for Astro/Starlight, Docusaurus, and VitePress generated-image preprocessing.
Production and development include-edit builds pass at the pinned versions. Docusaurus default builds clear the MDX cache; its dev wrapper covers one page, direct includes, and one locale. Standard webpack passes; Faster caching did not. Favicon errors are fixed and freshly verified.
Keep the tested host pins listed below. Re-run the relevant proof before changing a pin.
VitePress uses generated-image preprocessing; it is not an async native markdown-it hook. Keep that boundary explicit. The pinned targets are Astro 7.4.5 with Starlight 0.42.9 and @astrojs/markdown-remark 7.3.5, Docusaurus 3.10.2 with React 19.2.0, and VitePress 1.6.4.

The `/client` enhancement uses explicit root ownership and a static fallback. Browser recompilation exposes source. Keep static-only output available.
Failure or teardown restores the static image and prevents late commits. The packed browser proof covers late fetch and worker results.

**Docs/example:** `docs/integrations/{markdown,astro-starlight,docusaurus,vitepress}.md` and complete consumer fixtures.
**Done:** advertised recipes pass real builds and navigation/rebuild checks against named versions.
**Main risk:** host-specific glue grows into independent rendering implementations.

## M5 — Contributor and adoption support

**Status:** Contributor guidance, support levels, proposal drafts, and reusable fixtures are included. The fixture contract passes three tests. Proposal drafts remain unsent.

Add a support matrix and adapter guide with reusable source, metadata, diagnostic, and output fixtures.
Separate package availability, installed plugins, generated images, and native provider support.
Give contributors a route for Obsidian, MkDocs, and Pandoc without another compiler implementation.
Prepare upstream proposal materials after there is working runtime evidence.

Explore one stable VS Code preview, a custom element, and a self-hosted iframe only as bounded prototypes.
Editor extraction, framework packages, and a mandatory hosted service stay outside this plan.
No external provider contact or publication follows from merging this research.

**Docs/example:** `docs/integrations/contributing.md` and shared fixtures under `tests/fixtures/integrations/`.
**Done:** another builder can create a thin adapter from the guide and reproduce the supported examples.
**Main risk:** nominal support expands beyond what one maintainer can verify.

## Checks and remaining decisions

Run focused tests for the changed boundaries and `pnpm check:fast` while iterating. The evidence record lists the final check results.
Run `pnpm check` before pushing, plus the installed-package proof for each implemented surface.
Shared renderer changes also need the existing CLI package and relevant export proofs.
Use `pnpm shoot` for visual evidence and add changesets for shipped changes.
New script names in Pro's plan remain proposed until implemented.

Verify package ownership, supported browser versions, resource policies, and measured performance before publication.
The runtime caps SVG output at 8,000,000 bytes. The viewer worker timeout defaults to five seconds. Calling-thread cancellation remains cooperative. These limits do not establish service capacity.
Release work still includes package ownership and browser compatibility decisions. No external contact or package publication has happened.
