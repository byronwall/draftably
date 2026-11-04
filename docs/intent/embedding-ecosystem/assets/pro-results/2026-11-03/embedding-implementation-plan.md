# Draftably embedding implementation plan

**Decision:** deliver a safe, installable native SVG runtime first, then build-time Markdown, a read-only viewer, the second Markdown adapter family, and adoption tooling. Each milestone leaves a useful product behind. A hosted service, embedded editor, framework wrapper packages, and privileged GitHub/GitLab support are not prerequisites.

**Status:** proposed implementation work for Codex review. This Design mission did not modify repository source, install dependencies, execute project code, run checks, measure bundles, or publish packages. The supplied baseline is `ed4eff3181ded0c501c35ae18ef6aed9c62de8c5`. Existing test assertions and scripts are evidence of available checks, not newly successful results.

The [ecosystem report](embedding-ecosystem-report.md), especially §§2.4, 3.7, 3.10, 3.12 and 4.1–4.2, is authoritative for API types, defaults, errors and lifecycle. This plan names implementation seams and proof obligations without creating a competing contract. The [recommendation ledger](embedding-recommendations.md) supplies the stable EMB identifiers; “Build” means inclusion in this plan, not authorization to publish.

## Delivery order and publication boundary

| Milestone | Independently useful outcome | Dependency |
| --- | --- | --- |
| **M1 — Safe portable runtime** | Install one native package and generate a self-contained SVG in Node or a plain browser. Use that image in a README immediately. | Present native compiler and SVG writer. |
| **M2 — Shared Markdown and remark** | A `draft` fence becomes an accessible, cached build artifact through unified/MDX. Readers need no JavaScript. | M1. |
| **M3 — Isolated read-only viewer** | Vanilla JS, React and Solid applications mount independent viewers; Vue/Svelte use the same lifecycle recipes. Static fallback remains useful. | M1; M2 only for progressive Markdown enhancement. |
| **M4 — markdown-it and host recipes** | A second adapter family reaches more documentation builds; Astro/Starlight and Docusaurus have version-qualified examples. | M2; M3 only for interactive examples. |
| **M5 — Preview, contributor and adoption proof** | Integration authors can reuse fixtures and understand the exact support boundary; preview/upstream experiments have a clear gate. | Released runtime and at least one stable adapter. |

M3 and M4 can proceed independently after their prerequisites. Ship M1 without waiting for a plugin, and ship M2 without waiting for a viewer. Do not publish advertised subpaths whose files or behavior do not exist:

| Release stage | Publish from `@draftably/runtime` | Publish from `@draftably/markdown` |
| --- | --- | --- |
| M1 | Root API and declarations, `fonts.css`, the font/data assets it actually uses, explicit browser ESM distribution and package metadata. | Nothing yet. |
| M2 | M1 surface unchanged except justified compatible fixes. | Root common types, `/remark`, its types and required internal chunks. Keep adapter core private. |
| M3 | Add `/viewer`, `viewer.css`, native `render.worker.js`, associated assets and declarations. | Static adapter remains the current surface; enhancement follows in M4. |
| M4 | Existing runtime surface. | Add `/markdown-it` and its types after the async preparation proof; add `/client` and the versioned JSON bridge only after M3 and enhancement proofs. |

The scope `@draftably` is provisional. Verify ownership before publication; a fallback naming choice must be applied consistently to imports, fixtures, manifests and documentation. Preserve the existing `draftably` executable and CLI package.

## Checkout preflight and implementation rules

Before the first code change, Codex should establish a clean checkout/worktree at the recorded baseline and read the actual repository instructions. Reconcile any newer source changes deliberately rather than treating this packet as a moving branch.

- **Verify release automation in the checkout.** The packet contains `package.json`, `packages/cli/package.json`, `scripts/build-cli.ts`, `scripts/prove-package.ts` and `docs/RELEASING.md`. It does not contain the referenced `.changeset/config.json`, `scripts/add-changeset.ts`, `scripts/check-changeset.ts`, `.github/workflows/check.yml` or `.github/workflows/release.yml`. Their contents have not been audited. Extend their package selection, release checks and publication permissions only after inspection.
- **Read the interaction guidance before M3.** `AGENTS.md` references `docs/intent/diagram-quality/FEEL.md`; that file is absent from the packet. It is not decisive for this design, but Codex should read it from the checkout before changing viewer interaction. Do not invent its requirements.
- **Preserve the native pipeline.** Reuse `compile` → `projectScene` → renderer. Do not substitute `checkSource`, change layout algorithms, introduce host-width layout, or expose `Scene`/`Diagram` as stable public data. `checkSource` omits engine arrangements; full compilation also handles `fit=`. [R03], [R04]
- **Keep consumer examples outside the shipped DSL corpus.** Use a proposed top-level `integration-examples/` directory and separate proof fixtures. `scripts/build-cli.ts` recursively copies `examples/` into the CLI package; putting framework applications there would expand the CLI archive unnecessarily. Keep representative native sources in the existing `examples/` corpus. [Build script]
- **Use existing toolchain versions first.** Add a separate Vite 6 library configuration and declaration build. Do not import application Vite plugins, analytics, editor globals or newer documentation-only build options into the runtime build. The first Node support floor remains the repository's 22.21 requirement; browser compatibility is earned by the proof matrix. [Package manifest][Vite app config]
- **Add changesets according to actual shipped effects.** Runtime and Markdown packages need package-aware release handling. Changes to shared source can also affect the CLI. Follow the checkout's release instructions and record intentional output/security changes; do not run a publishing command as part of implementation verification. [Release guide]

## M1 — Safe portable native runtime

**Recommendation IDs:** EMB-001–008. **User value:** one install and one awaited call produce a valid, portable SVG with deterministic native geometry, without Chrome, DOM shims, Vite loaders or the editor.

### Scope and file seams

Organize this milestone as a few reviewable PRs, with publication after all M1 gates pass:

1. **Facade and shared renderer seam.** Add `src/runtime/index.ts`, `api.ts`, `render.ts`, `diagnostics.ts` and `limits.ts`. Translate existing compiler results and `DslError` locations into the report's stable diagnostics. Keep results detached from mutable caches and read-only by convention; no deep-freeze guarantee is required. Extract drawing internals from `src/cli/svg.ts` into private modules such as `src/runtime/svg/tree.ts`, `string.ts`, `text.ts`, `links.ts` and `ids.ts`. Adapt existing internal callers without breaking source-editing paths that still need `Scene`.
2. **Portable fonts and serialization.** Split the current `src/lib/font-data.ts` Vite asset assumptions from runtime font data. Add a build-owned generator, for example `scripts/build-runtime-assets.ts`, over `src/assets/fonts/` and `src/model/font-metrics.json`. Update `src/model/embed.ts` only as needed for runtime provenance and the new namespaced metadata form; preserve legacy source extraction. Review `src/model/document.ts` and `src/dsl/project.ts` dictionary construction, plus affected routing/lookups, for accepted magic IDs.
3. **Real package and consumers.** Add `packages/runtime/package.json`, package README/notices, `vite.runtime.config.ts`, `tsconfig.runtime.json`, `scripts/build-runtime.ts` and `scripts/prove-runtime-package.ts`. Update root build/check scripts and the existing workspace/release setup. Add `integration-examples/node-svg/` and `browser-static/`; both import the packed package rather than source aliases.

The fixed private SVG tree is an internal implementation detail, not a public scene format. Convert the string-producing heading, legend, note, marker, shape, edge and panel routines needed by the native corpus. M1 needs the string writer; M3 adds the DOM writer over the same private representation. Preserve CLI command/source-retention behavior through explicit internal adapters. Any shared security change affecting legacy exports needs a documented behavior decision and changeset, not an accidental default change.

### Required behavior

- **Full native parity:** `renderSvg` and `validate` use the async native compiler, including engine layouts and `fit=`. Geometry stays independent of browser viewport, font-loading order, locale and wall-clock time. Theme changes may recompile and move geometry; emphasis and paint-only changes retain the narrower existing invariants.
- **Valid XML:** centralize escaping and reject XML-forbidden characters and unpaired UTF-16 surrogates with `DRAFT_TEXT_INVALID`. Check decoded quoted labels as well as source-derived and host-provided titles/descriptions. Do not merely validate the original encoded source. Reject non-finite or invalid geometry before serialization. No raw HTML/foreign SVG input is introduced.
- **Safe links:** default to none. Safe mode allows only final parsed HTTP(S) destinations, with `_self` by default. A host resolver may return `null`; it cannot bypass final validation. Relative destinations require a host base. Authored `link-base` cannot widen policy. `_blank` adds `noopener` and `noreferrer`. Remove denied link wrappers rather than emitting an empty anchor or falling back to authored text. Do not leak a suppressed local target through a tooltip.
- **Inline isolation:** enforce the report's prefix grammar, namespace every generated ID and reference, and scope generated CSS. Cover markers, ARIA title/description references and optional source metadata. Repeated diagrams must work on the same page. Standalone image IDs may be deterministic within their separate document.
- **Fonts and source:** image output embeds only used bundled faces; inline host-font mode requires the exact published CSS/assets. Version family names by font/metric identity and retain font licenses. Do not perform implicit remote font/image fetches. Default `includeSource: false`; neither raw comments/source nor `sourceId` paths enter SVG metadata. Visible labels/IDs are still visible information.
- **Limits and output ownership:** validate finite, positive, non-loosening limit overrides. Preserve native ceilings and implement the report's proposed byte/output ceilings while producing output, not only after an unbounded final allocation. Treat AbortSignal as cooperative cancellation, not a hard execution deadline. All runtime imports remain inert on servers.

These requirements address actual seams in `linked`, `markersFor`, `fontFaceCss`, `embedSvgSource`, and the ordinary object dictionaries used by projection. They do not assert that an exploit or exhaustion test was already run. [R03], [R05], [R09]

### Acceptance checks

Use a small set of focused tests and an installed-artifact proof:

1. **Parity and determinism:** select existing examples covering normal and engine layouts, `fit=`, labels/groups, cells, sequence, comparisons and states. Compare geometry with the current native path in Node and browser; compare cold/warm results. Exclude timings and host identity from deterministic artifacts. Do not assert that all theme presets have identical sizes.
2. **Serialization and trust cases:** parse generated output with an XML-capable proof tool with external entities/network disabled, then load it as an actual SVG image; exercise text metacharacters, decoded controls, unpaired surrogates, scheme/control-character URL variants, denied callbacks, repeated inline instances and accepted IDs such as `__proto__`/`constructor`. Confirm no inherited dictionary access, lost geometry or cross-instance references. Retain the Chrome-gated PNG/PDF embedded-source round-trip cases in `tests/embed.test.ts` when that boundary changes, and add explicit SVG reader fixtures for both legacy and new metadata; those SVG fixtures are new work, not coverage claimed from that file.
3. **Tarball consumers:** pack and install outside the repository with install scripts disabled. Prove Node ESM SVG generation without a browser or DOM shim; TypeScript public imports; browser ESM under a nested base path; and a self-hosted no-bundler module using its relative font/data chunks. Check exported files exist and no `?inline`, app alias, Solid JSX or repository-only path survives.
4. **Dependency and artifact facts:** inspect the packed dependency tree and browser graph for Solid, CodeMirror, Mermaid, D2, jsdom, CLI/server imports and app state. Record archive size, static entry and lazy font bytes, and measured cold/warm render timings for a named corpus/environment. These establish a baseline; no size or latency result is assumed here.

### Documentation and completion

Add `docs/integrations/runtime.md` covering the report's signatures/defaults, errors, supported environment matrix, font/CSP choices, privacy, cancellation limits and version policy. Put the complete first successful Node and browser examples in the package README and `integration-examples/`. Add an image/source README recipe and a CI drift-check recipe; generated images remain an explicit build artifact.

Correct the stale “no runtime dependencies” statements around the CLI and the overly broad theme-placement statement identified in the report. Keep CLI/native-runtime dependency claims distinct.

**Main risk:** extracting rendering or font assets subtly changes native output or leaves bundler-specific imports. **Done:** a clean external consumer installs the packed runtime and generates a self-contained, valid SVG; parity/security/asset proofs pass; the documented export map contains only shipped files; release notes and measurements describe what was actually verified. No viewer or Markdown package is needed to call M1 complete.

## M2 — Shared fence processing and async remark asset output

**Recommendation IDs:** EMB-009–010. **User value:** authors use ordinary `draft` fences or local `.draft` includes and receive accessible static images in a real unified/MDX build.

### Scope and file seams

Add `packages/markdown/src/core/{options,resolve,diagnostics,cache,prepare,assets}.ts`, `src/remark.ts`, package metadata/types, `scripts/build-markdown.ts` and `scripts/prove-markdown-package.ts`. Keep the core independent of mdast, HAST and markdown-it; adapters own AST/token traversal and host hooks.

Use `site/docs/content.ts` and `site/docs/Example.tsx` as observed integration references, not packages to export unchanged. The site-only `draft themes` macro stays private. Existing `site/draw.ts` remains a useful composition reference without becoming the public API. [R08]

Provide a narrow host contract for content root, document identity, asset emission/public URL, dependency registration and diagnostics. The adapter must not guess a site's output directory or URL base. Default to asset output, async preparation and production `errors: 'fail'`. An explicit `errors: 'placeholder'` emits an escaped explanatory placeholder without source text. Do not turn compile failure into accidental source disclosure.

### Required behavior

- Transform only actual parser-recognized fences with the exact `draft` language token; preserve longer outer code listings and handle tilde/list/blockquote fences through parser semantics. Parse the report's single metadata grammar and reject duplicate/unknown keys, trailing tokens and malformed quoting. No fence can set link policy, arbitrary HTML attributes, filesystem roots, renderer URLs or executable callbacks.
- Resolve `src` relative to the containing Markdown file and an explicit content root. Reject absolute/scheme/UNC/drive/NUL/non-file inputs. Canonicalize real paths and check path-segment containment, including symlinks; cap reads and hash actual bytes. Record missing-file dependencies so creation can rebuild the page.
- Map actual parser positions, including nested fences and includes, into structured diagnostics. External errors name the included file and relate back to its Markdown include site. No absolute workstation path enters emitted HTML or public cache manifests.
- Cache runtime output and embedding representation separately. Include runtime/font/metrics versions, source bytes, state, font/source policies, accessibility fields and effective link resolver identity. Disable persistent caching for a custom resolver without an explicit cache key. Bound memory/disk use; do not use a global unbounded source map.
- Emit an ordinary image node with correct dimensions, meaningful alt text and optional plain-text caption. Serve content-addressed assets through the host's public URL policy. Multiple identical image fences may share an asset; inline occurrences require distinct namespaces.
- Persist the report's asset/dependency manifest alongside compiled-page caches. A warm build that skips Markdown transformation must replay or restore required asset publication. A missing artifact invalidates its dependent page; a transient sink plus post-build copy is insufficient. Keep public URLs separate from private filesystem paths, and make duplicate concurrent emission safe.
- Until M3 plus M4 supply the initializer and client bridge, reject unsupported interactive mode with an actionable `DRAFT_CAPABILITY` diagnostic. Never silently promise interaction that was not emitted.

**Optional inline output is a separate, bounded extension.** The runtime tree stays private. The Markdown package may convert only a successful `renderSvg` result through an SVG-aware HAST bridge, with namespace/attribute normalization and parity checks. It must not import runtime private modules, parse arbitrary author HTML as trusted SVG, enable raw HTML globally, or create JSX strings. Asset output needs no parser and is the M2 completion baseline. Document the compatible sanitizer stage/schema if inline mode ships; a failed bridge does not block asset release.

### Acceptance checks, examples and completion

Add focused `tests/markdown.test.ts` coverage for metadata, positions, include containment, missing/include changes, cache invalidation and fail/placeholder behavior. The installed-package proof builds one HTML/unified fixture and one MDX fixture from a packed runtime plus packed adapter. Test a nested public base path, repeated diagrams, an invalid include, a symlink escape, metacharacter caption/alt text, concurrent pages and a content change with unchanged filename. Inspect the reader output with JavaScript disabled and confirm that compiler/viewer code is absent from the default client bundle.

Add `docs/integrations/markdown.md`, an error/position guide and `integration-examples/unified/` with HTML and MDX entry points. Show a local file include, a valid native example, asset emission and watch-dependency hookup. Optional inline documentation must state which tested parser/sanitizer ordering it requires.

**Dependencies:** M1's stable renderer/result and package proof. **Main risk:** source path/caching errors or a plugin that works in one build but fails through MDX or a site's base URL. **Done:** the packed `/remark` adapter builds real image assets with accurate diagnostics, reproducible outputs and a useful no-JS page; watch behavior is proved for the documented host; optional features are not advertised before their proofs.

## M3 — Independent viewer, native worker and framework recipes

**Recommendation IDs:** EMB-011–013. **User value:** applications add pan/zoom, inspection, safe links and emphasis states without importing the Solid editor or adopting a framework package.

### Scope and file seams

Add `src/runtime/viewer/{index,controller,camera,events,fonts}.ts`, the private DOM writer, scoped control CSS, and `src/runtime/workers/render.worker.ts`. Extend the runtime build and proof to publish `/viewer`, `viewer.css` and the actual worker asset. Use `DiagramView.tsx` as camera/interaction reference and `engine-tasks.ts` as worker-lifecycle evidence, not modules to expose wholesale. Keep `StaticScene`, application stores, `state/keyboard.ts`, `state/debug-api.ts` and all editing workflows outside the public graph. [R09], [R10]

Implement the report's synchronous `mountViewer` handle and exact update results/events. Default fonts to **host** in the viewer; the example must load the published CSS. Default execution is a lazily started dedicated native worker. The worker factory yields a fresh worker owned by that handle; a supplied factory is not permission to terminate a shared unrelated worker.

### Required behavior

- **Ownership and races:** require an empty, exclusively owned host; fail duplicate mounting before modifying it. Increment revision at `update` invocation, before debounce/dispatch. Keep at most current work and the latest queued source. Snapshot request options and apply the report's explicit state/race precedence. Only the current live revision may atomically commit or publish success; every request settles once.
- **Errors and teardown:** retain the last good picture with a visible stale indicator and current diagnostics, or show an initial error region. `destroy` invalidates first, then removes listeners, observers, animation frames, pointer capture, worker, owned DOM and retained source/results. It is idempotent; later updates settle as destroyed. Cancellation must not produce author-error announcements.
- **Worker policy:** enforce the documented per-job deadline through termination; the proposed five seconds is a policy to validate, not a benchmark result. Creation/CSP failure yields an environment error and preserves fallback. Main-thread mode is explicit and cannot promise a hard deadline. Send only private serializable data; never structured-clone resolver callbacks or AbortSignal. Resolve/validate final links and perform navigation on the host side.
- **DOM/CSP/font assets:** construct the viewer from the renderer-owned tree with `createElementNS` and text nodes, not `innerHTML` or a permissive Trusted Types policy. Use the host's owner document/window. Verify expected font readiness and report failures; manage any embedded-font registrations per document with explicit ownership. No fonts, worker or storage starts at module import. Document same-origin worker placement and host factory overrides; do not silently create Blob workers or assume a cross-origin CDN worker is legal.
- **Camera and access:** preserve world center/scale after user navigation; refit only initial/untouched auto-fit, explicit `fit`, or requested fit on update. Zero-size containers defer fit; resize never recompiles. Scope keys and pointer/wheel handling to the viewer, preserve normal page scrolling, and ignore editable descendants. Include named controls, visible focus, reduced-motion behavior, a useful accessible outline and labeled state selection. No blanket application role or hundreds of tab stops.
- **Framework/SSR:** imports are inert on the server; mounting occurs after DOM ownership is established. The framework never reconciles the viewer's child subtree. Keep a prebuilt image as sibling fallback and hide it only after first successful commit. Carry server-controlled identity where applicable; do not generate hydration mismatches or suppress warnings to hide them.

M4 connects the Markdown enhancement bridge only after these viewer semantics pass. Use the report's versioned initialization JSON asset and explicit `/client` lifecycle; source is reader-visible when client compilation is enabled even if SVG `includeSource` is false. Keep fallback on module, worker or font failure and avoid duplicate screen-reader announcements. A newly mounted viewer receives a different namespace from any retained inline fallback; it does not adopt SSR markup.

### Acceptance checks, examples and completion

Use controlled promises to prove A→B where A completes during B's debounce, reverse completion, invalid source after success, abort/supersede/destroy precedence, two hosts, destruction during font/worker preparation and post-destroy updates. Test emphasis changes during a pending compile against the report's precedence rules. Add browser proof for resize/camera persistence, hidden→visible containers, keyboard controls, approved/cancelled link navigation and no global shortcuts.

Extend the installed browser fixture with enforced Trusted Types, documented CSP variants, blocked worker/font delivery, nested asset URLs and multiple runtime instances. Record worker startup and update latency, retained resources after teardown, repeated-diagram/font payload cost and current/static import sizes. Publish actual environment/corpus values; the editor's existing benchmark numbers are not measurements of this viewer.

Add `docs/integrations/viewer.md` and runnable `integration-examples/vanilla-viewer/`, `react/`, `solid/`, `vue/` and `svelte/`. Each is a small pinned-version lifecycle consumer, not a new wrapper library. Exercise React Strict Mode setup→cleanup→setup, Solid cleanup, and Vue/Svelte teardown; prove static SSR plus enhancement where documented. The report supplies the core copyable examples. [S36], [S36A], [S39], [S40]

**Dependencies:** M1; M2 for interactive fences. **Main risk:** retained work, stale publication or host-specific asset assumptions. **Done:** independently mounted viewers survive rapid updates and repeated mount/destroy cycles; the packed worker/assets function without repository aliases; SSR and required lifecycle recipes pass; fallback remains useful under failure. Editor embedding remains outside this milestone.

## M4 — markdown-it and qualified documentation-host recipes

**Recommendation IDs:** EMB-014–015. **User value:** a second shared adapter reaches markdown-it builds while tested recipes cover major site generators without one package per generator.

### Scope and file seams

Add `packages/markdown/src/markdown-it.ts` over the M2 core. Its contract makes **parse once → await preparation → render the same tokens** explicit. A normal synchronous fence callback must consume prepared records, never return a Promise or reparse a different token stream. Update package exports/types and the packed adapter proof only when implemented. [S24], [S24A]

Add `docs/integrations/{markdown-it,astro-starlight,docusaurus,vitepress}.md` and correspondingly small consumers under `integration-examples/`. Astro/Starlight and Docusaurus use the existing remark adapter. Version-qualify the Astro processor choice and configuration location; do not assume current defaults are the same as older Astro. Do not reuse a host's Mermaid-only switch as a generic custom-language hook. [S27], [S28], [S29], [S29A], [S29B], [S30]

After M3, add `packages/markdown/src/client.ts` and the report §3.12 bridge: versioned source initialization JSON, durable `emitInit`, asset/client-module manifests, host-selected policy IDs, and explicit `enhanceDrafts(root, options).destroy()` ownership. Publish `/client` only after same-origin JSON fetching, bounded work, fallback preservation, route teardown and source-disclosure behavior are proved. JSON cannot contain worker factories, resolvers or executable options; the host supplies those policies.

The real host glue includes persistent asset storage/replay, final client-directory publication, effective locale/base paths, dev serving and dependency watches. Astro's current recipe explicitly installs/selects Unified and uses `astro:build:done` for the final client directory. Docusaurus's `postBuild` handles production publication; its development asset serving is separate. Turn the report's configuration excerpts into complete examples before advertising them. Test warm-cache rebuilds with an initially empty output directory as well as cold builds. [S49], [S50], [S52], [S53]

### Bounded VitePress experiment

Timebox one exact-version bridge to **two implementation days and one review round**. The inspected version in the report is `v2.0.0-alpha.21`; Codex must recheck the selected version before implementation. Candidate approaches are a pre-render preparation/manifest stage with original positions or a narrow bridge at the actual async render boundary. Do not invent a `markdown.preprocess` hook or assume ordinary markdown-it fence rules await promises. [S25A], [S25B], [S25C]

The bridge must prove code highlighting/wrappers, includes, Vue output, concurrent pages, public-base URLs, dev watch and client navigation. If these gates cannot be met within the bound, publish the generated-image recipe and label the bridge experimental. M4 does not wait for a VitePress fork or an unsupported internal patch.

### Acceptance checks, examples and completion

The installed proof must detect rendering before preparation, wrong/missing prepared entries, nested fence positions and independent concurrent documents. Build one locked version of each advertised host recipe. Exercise an external `.draft` edit/create/delete, development rebuild, non-root base path and production no-JS output. If interaction is enabled, test failed enhancement and route unmount through M3 rather than inventing host-specific cancellation.

**Dependencies:** M2; optional M3. **Main risk:** framework-specific timing and asset/watch hooks erode the shared-core boundary. **Done:** `/markdown-it` is a real awaited integration; Astro/Starlight and Docusaurus recipes build against named tested versions; VitePress is either proved within the bound or explicitly limited to generated images. No separate adapter package is created merely for a configuration recipe.

## M5 — Contributor contract, preview gate and adoption proof

**Recommendation ID:** EMB-016; related Explore gates in the ledger. **User value:** third parties can integrate without reverse-engineering the application, and prospective users can verify the scope of support from working examples.

### Scope, docs and optional preview

Add `docs/integrations/contributing.md`, a compact compatibility matrix, and reusable fixtures under `tests/fixtures/integrations/` covering metadata, paths, diagnostics, output policy, cache identity and lifecycle. Reuse the shared Markdown core and runtime; do not publish it as a speculative generic framework before a real adapter needs it.

Use `site/docs/content.ts`, `site/docs/Example.tsx` and a focused site demo to publish working static and viewer recipes. Update root/package READMEs with image/source links, exact package imports, supported versions and failure behavior. Keep examples importable from packed artifacts; a source-alias demo is not adoption proof.

A VS Code preview is **Explore**, not a mandatory full-extension release. Permit a two-day internal proof using stable Markdown preview extension hooks, the installed runtime and local assets. It must respect workspace trust/resource rules, handle asynchronous rendering and disposal, leave readable fallback and avoid network source disclosure. If it cannot reuse the existing contracts cleanly, record the blocker and stop; no marketplace submission or editor-wide feature expansion is required. Obsidian, MkDocs and Pandoc remain contributor paths or later bridges, not additional first-party release gates. [S34], [S35]

### Acceptance and completion

- A contributor can follow the guide to adapt one minimal host without copying compilation, URL policy, escaping or path-containment logic.
- A fresh consumer can reproduce the published Node, Markdown and framework demos from exact package versions. Broken or unsupported recipes are identified in the matrix rather than silently included.
- Record technical availability separately from adoption: fixture passes, an external integration report, an accepted upstream issue, a merged host integration and a deployed host feature are distinct events. No telemetry or demand study is required before building.
- Prepare upstream proposals with a working demo, resource/security policy, compatibility fixtures and a maintenance contact. Publishing/sending a proposal is a separate authorized action; this design does not send messages or promise host acceptance.

**Dependencies:** stable runtime and one adapter. **Main risk:** maintaining many nominal integrations with no owner. **Done:** a small tested first-party surface and a usable contributor path exist; optional preview findings have a go/no-go record; documentation does not claim native support on hosts that only receive image fallbacks.

## Proposed verification run sheet

The existing `pnpm check:fast`, `pnpm check`, CLI package commands and release guidance were inspected. They were **not run**. New script names below are proposals that must be added before use; they are not present capabilities at this baseline. Each implementation PR runs the narrow relevant proof, then the repository's required gate. Broaden checks only for a concrete regression risk or required release gate. [Check guide][Package proof]

```bash
# After Codex creates the implementation checkout and adds the relevant scripts.
# Respect the checkout's pinned pnpm version and lockfile.
pnpm install --frozen-lockfile

# Existing iteration gate; includes focused new tests once they are added.
pnpm check:fast

# M1: NEW scripts. Build the library and test an external tarball install.
# runtime:build -> scripts/build-runtime.ts
# runtime:pack-check -> scripts/prove-runtime-package.ts
# prove:runtime -> scripts/prove-runtime-package.ts --browser
pnpm runtime:build
pnpm runtime:pack-check
pnpm prove:runtime

# M2/M4: NEW scripts. Install both tarballs in isolated consumer fixtures.
# markdown:build -> scripts/build-markdown.ts
# markdown:pack-check -> scripts/prove-markdown-package.ts
# prove:markdown -> scripts/prove-markdown-package.ts --browser
pnpm markdown:build
pnpm markdown:pack-check
pnpm prove:markdown

# M3 extends the same installed runtime/browser proof with viewer and worker cases.
# Re-run these when the viewer, asset layout or framework recipes change.
pnpm runtime:build
pnpm runtime:pack-check
pnpm prove:runtime

# Existing gate before the implementation PR; no publish command is included.
pnpm check

# When shared renderer/asset changes affect the installed CLI, verify that boundary.
pnpm cli:build
pnpm cli:pack-check

# Before a release, use the checkout's release gate AFTER adding the new package proofs.
pnpm release:check
```

Reuse existing proof-harness failure capture and `pnpm shoot` for visual evidence, rather than writing throwaway screenshot tools. A new runtime proof must serve its own installed consumer, not require the editor's file-session server merely because the existing harness does. Browser fixtures need their documented browser prerequisites; record failures and diagnose them rather than repeating a failed run until it happens to pass.

Measure runtime entry/chunk/font/archive bytes and representative cold/warm timings from actual packed builds. Extend the existing benchmark tooling only where it answers a real comparison; retain the machine/browser/version/corpus with the result. The repository's existing 200 ms/1 s editor budgets are context, not proof or an automatic promise for a new runtime.

## Bounded uncertainties and stopping rules

| Question | Small proof and decision |
| --- | --- |
| Can the runtime leave Vite-specific font imports behind while preserving SVG fidelity? | M1 Node tarball plus nested-path browser/no-bundler fixture. If asset resolution fails, fix publication layout before releasing; do not require the consumer to adopt repository aliases. |
| Does inline HAST preserve SVG namespaces, IDs and styling through the actual sanitizer/MDX pipeline? | One successful-output-only bridge and representative parity fixture. If it fails, release image output; keep inline mode experimental. Runtime internals remain private. |
| Can strict host policies support the viewer's chosen assets? | M3 enforced Trusted Types/CSP fixture with same-origin worker, host fonts, blocked-resource cases and explicit main-thread mode. Document the supported recipe; never weaken host policy automatically. |
| Does VitePress expose a maintainable async bridge at the selected version? | Two-day, one-version experiment in M4. If not, keep the pre-generated image recipe and record the blocker. |
| Does preview integration earn another maintained artifact? | Two-day VS Code proof in M5 with stable hooks and lifecycle. Ship only with an owner and a reusable implementation; otherwise leave the contributor recipe. |

No measured capacity, bundle-size target, host-native approval or release date is fabricated here. The first consequential decision is already concrete: build and prove M1, publish only its implemented surface, and let subsequent milestones expand reach without making the first useful runtime wait for the ecosystem.

[Build script]: https://github.com/byronwall/draftably/blob/ed4eff3181ded0c501c35ae18ef6aed9c62de8c5/scripts/build-cli.ts
[Package manifest]: https://github.com/byronwall/draftably/blob/ed4eff3181ded0c501c35ae18ef6aed9c62de8c5/package.json
[Vite app config]: https://github.com/byronwall/draftably/blob/ed4eff3181ded0c501c35ae18ef6aed9c62de8c5/vite.config.ts
[Release guide]: https://github.com/byronwall/draftably/blob/ed4eff3181ded0c501c35ae18ef6aed9c62de8c5/docs/RELEASING.md
[Check guide]: https://github.com/byronwall/draftably/blob/ed4eff3181ded0c501c35ae18ef6aed9c62de8c5/docs/CHECKS.md
[Package proof]: https://github.com/byronwall/draftably/blob/ed4eff3181ded0c501c35ae18ef6aed9c62de8c5/scripts/prove-package.ts

[R03]: https://github.com/byronwall/draftably/blob/ed4eff3181ded0c501c35ae18ef6aed9c62de8c5/src/dsl/compile.ts
[R04]: https://github.com/byronwall/draftably/blob/ed4eff3181ded0c501c35ae18ef6aed9c62de8c5/src/model/fonts.ts
[R05]: https://github.com/byronwall/draftably/blob/ed4eff3181ded0c501c35ae18ef6aed9c62de8c5/src/lib/font-data.ts
[R08]: https://github.com/byronwall/draftably/blob/ed4eff3181ded0c501c35ae18ef6aed9c62de8c5/site/draw.ts
[R09]: https://github.com/byronwall/draftably/blob/ed4eff3181ded0c501c35ae18ef6aed9c62de8c5/src/components/scene/StaticScene.tsx
[R10]: https://github.com/byronwall/draftably/blob/ed4eff3181ded0c501c35ae18ef6aed9c62de8c5/src/state/document.ts
[S24]: https://github.com/markdown-it/markdown-it/blob/master/docs/development.md#i-need-async-rule-how-to-do-it
[S24A]: https://markdown-it.github.io/markdown-it/interfaces/MarkdownIt.html
[S25A]: https://github.com/vuejs/vitepress/blob/v2.0.0-alpha.21/src/node/markdown/markdown.ts
[S25B]: https://github.com/vuejs/vitepress/blob/v2.0.0-alpha.21/src/node/markdownToVue.ts
[S25C]: https://github.com/antfu/markdown-it-async/blob/main/src/index.ts
[S27]: https://docusaurus.io/docs/markdown-features/diagrams
[S28]: https://docusaurus.io/docs/markdown-features/plugins
[S29]: https://docs.astro.build/en/guides/markdown-content/
[S29A]: https://docs.astro.build/en/reference/markdown-processors/unified/
[S29B]: https://v5.docs.astro.build/en/guides/markdown-content/
[S30]: https://starlight.astro.build/guides/authoring-content/
[S34]: https://code.visualstudio.com/api/extension-guides/markdown-extension
[S35]: https://raw.githubusercontent.com/obsidianmd/obsidian-api/master/obsidian.d.ts
[S36]: https://react.dev/reference/react/useEffect
[S36A]: https://react.dev/reference/react/StrictMode
[S39]: https://vuejs.org/api/composition-api-lifecycle
[S40]: https://svelte.dev/docs/svelte/lifecycle-hooks
[S49]: https://docs.astro.build/en/reference/integrations-reference/#astrobuilddone
[S50]: https://docusaurus.io/docs/api/plugin-methods/lifecycle-apis
[S52]: https://docusaurus.io/docs/static-assets
[S53]: https://docusaurus.io/docs/api/docusaurus-config#staticdirectories
