# Draftably embedding recommendations

**Decision:** ship a small native runtime, shared build-time Markdown integration, and an independently owned read-only viewer. Use static images to reach hosts that do not recognize `draft` fences.

**Scope:** design recommendations against source packet baseline `ed4eff3181ded0c501c35ae18ef6aed9c62de8c5`, researched November 3, 2026, America/Indianapolis. Proposed package names and APIs are not published capabilities. **Build means inclusion in the implementation plan; it is not authorization to publish, deploy, contact a provider, or change the repository during this mission.** No new checks, benchmarks, installations, or adoption results are claimed here.

Read this ledger with [the design report](embedding-ecosystem-report.md), [implementation plan](embedding-implementation-plan.md), and [source register](embedding-sources.md). Source identifiers match those companions. Repository paths refer to the recorded baseline; later implementation files named below are proposals.

## Classification and priority

| Label | Meaning |
| --- | --- |
| **Build** | Committed scope in the proposed milestones, with an observable completion condition. |
| **Explore** | One bounded investigation or prototype; no promise of a production integration. |
| **Defer** | Excluded from the current build sequence until its stated trigger occurs. |
| **Avoid** | A rejected approach or prohibited shortcut within this design. |
| **P0** | A correctness, trust-boundary, or public-contract gate for the mapped milestone. |
| **P1** | Prioritized usable integration or distribution work. |
| **P2** | Conditional follow-up; it does not block an earlier useful release. |

Recommendation IDs are stable. If a later decision changes, retain the identifier and record the change rather than recycling it.

| Milestone | Useful outcome | Principal Build IDs |
| --- | --- | --- |
| **M1** | Installable safe portable static runtime | EMB-001–008 |
| **M2** | Shared adapter core and remark asset output | EMB-009–010 |
| **M3** | Independent viewer/worker and framework recipes | EMB-011–013 |
| **M4** | markdown-it and version-qualified host recipes | EMB-014–015 |
| **M5** | Contributor guidance and demonstrated adoption paths | EMB-016; bounded Explore work remains optional |

## Build

### EMB-001 — Build: separate native installation from the CLI

**Priority / milestone:** P0 · M1.

**Reason and evidence:** the CLI manifest in the snapshot declares Mermaid, D2, and jsdom; subpath tree-shaking does not remove installation dependencies. [`packages/cli/package.json`](https://github.com/byronwall/draftably/blob/ed4eff3181ded0c501c35ae18ef6aed9c62de8c5/packages/cli/package.json), [S18], [S19].

**Scope and completion:** create proposed `@draftably/runtime`, later `@draftably/markdown`, and retain the existing CLI command. Use ESM/declarations and narrow stable subpaths. Complete when a clean packed-package consumer imports native rendering without application, framework, or foreign-import dependencies. Resolve publishing names before release; scope ownership is unverified.

### EMB-002 — Build: one asynchronous public rendering contract

**Priority / milestone:** P0 · M1.

**Reason and evidence:** `site/draw.ts::draw()` already composes compilation/projection/SVG, while full `compile()` includes layouts that `checkSource()` skips. [R03], [R04].

**Scope and completion:** expose `renderSvg`, `validate`, version/provenance, structured diagnostics and detached summary data. Keep compiled scenes private. Validation covers compilation, not output-byte or browser-paint guarantees. Complete when final-layout fixtures and malformed source use the documented public results, without message-parsing or undocumented internal overloads.

### EMB-003 — Build: one audited SVG construction path

**Priority / milestone:** P0 · M1; DOM writer reuse in M3.

**Reason and evidence:** existing SVG output has shared IDs and markup helpers that need a deliberate embedding boundary. `src/cli/svg.ts`, `src/model/{heading,legend,note,embed}.ts`; report §§2.2–2.4.

**Scope and completion:** use renderer-owned tags/attributes, consistent text/XML handling, namespaced IDs/references and validated URLs. Keep the private tree purpose-specific and use safe author-keyed storage through projection/cloning. Complete when adversarial text, inherited-looking IDs, repeated inline diagrams, markers and source metadata remain valid and isolated, and representative baseline diagrams retain their drawing semantics.

### EMB-004 — Build: portable fonts and deterministic geometry

**Priority / milestone:** P0 · M1; readiness proof in M3.

**Reason and evidence:** deterministic metrics exist, but font delivery uses Vite imports; theme typography can change dimensions. [R04], [R05]; `tests/themes.test.ts`.

**Scope and completion:** package exact fonts/notices and versioned family identities. Embed used faces by default; reject host-font mode for external image targets. Preserve fixed render context. Complete when Node/browser outputs agree under identical inputs and packaged assets resolve without Vite-specific loading. Qualify glyph coverage and distinguish serialization success from browser font readiness.

### EMB-005 — Build: explicit source privacy and host-controlled links

**Priority / milestone:** P0 · M1; maintained through M2–M3.

**Reason and evidence:** current CLI exports retain source by default, and SVG link emission needs stronger public policy. `src/model/embed.ts`, `src/cli/svg.ts`, `src/model/link.ts`.

**Scope and completion:** default the new runtime to `includeSource: false` and non-navigable output. Require explicit host policy for validated destinations, revalidate resolver results, and retain legacy source extraction compatibility. Complete when disabled/blocked links cannot navigate and metadata policy is tested. Document that client recompilation exposes source even when fallback-image metadata is absent.

### EMB-006 — Build: meaningful resource limits and cancellation boundaries

**Priority / milestone:** P0 · M1; enforceable browser isolation in M3.

**Reason and evidence:** parser ceilings already exist; asynchronous syntax alone does not preempt CPU work. `src/dsl/syntax.ts`; report §§2.4, 4.1.

**Scope and completion:** validate finite tightening-only compile limits, separate output-byte limits, count serialized bytes incrementally, and identify cooperative cancellation honestly. Complete when invalid configurations and oversized source fail predictably before expensive work. Worker/server isolation supplies hard deadlines where required; proposed limits and deadlines remain policies, not measured capacity claims.

### EMB-007 — Build: prove the packed release, not repository-only imports

**Priority / milestone:** P0 · M1; extend at each later milestone.

**Reason and evidence:** existing release proofs provide a starting seam; runtime assets/types introduce a different consumer contract. `scripts/prove-package.ts`, `scripts/build-cli.ts`, `docs/RELEASING.md`; [S19], [S20].

**Scope and completion:** prove installed ESM/types, inert server imports, nested asset paths, pinned no-bundler loading, license notices and representative CSP configurations. Export only implemented entries. Record actual bundle/font/worker sizes and reproducible performance samples when implemented; invent no thresholds or successful results now. Correct stale dependency documentation and apply the repository's release process.

### EMB-008 — Build: portable image and source recipes immediately

**Priority / milestone:** P1 · M1; distribution follow-through in M5.

**Reason and evidence:** images reach repository/package readers without native fence approval; existing CLI SVG export already enables the workflow. `README.md`; [S04], [S06].

**Scope and completion:** document SVG/PNG plus `.draft` source, meaningful alternatives, stable registry image URLs and a deliberate CI drift check. Complete when a fresh example can regenerate its assets through documented commands. Preserve authored files; no automatic commits or README replacement. Describe this accurately as image-based support.

### EMB-009 — Build: one canonical fence and shared adapter core

**Priority / milestone:** P0 · M2.

**Reason and evidence:** the site already recognizes `draft`; generic Markdown does not define its rendering or metadata semantics. [R08], [S08].

**Scope and completion:** implement the report's `draft {key="value"}` grammar once, with source-line mapping, rooted local-file resolution, dependency tracking, policy-aware cache keys and bounded cache storage. Complete when both inline source and included files produce consistent diagnostics, symlink escapes fail, and dependency edits invalidate output. Keep semantic theme/layout declarations in portable source.

### EMB-010 — Build: remark/MDX static assets first

**Priority / milestone:** P1 · M2.

**Reason and evidence:** asynchronous unified transforms fit full native compilation; ordinary image nodes avoid requiring client rendering. [S21], [S22], [S23].

**Scope and completion:** publish the thin remark adapter with emitted SVG assets, accessible image text/captions, explicit build-error behavior and no-JS output. Complete when clean HTML and MDX consumers build valid fixtures, restore referenced assets on warm-cache builds, and diagnose broken fences at source locations. Controlled inline SVG is a deliberate audited option; do not expand M2 into a separate component ecosystem.

### EMB-011 — Build: an independent viewer with owned worker execution

**Priority / milestone:** P0 · M3; depends on M1.

**Reason and evidence:** application stores and apparently passive components are not instance-isolated viewer contracts. [R09], [R10]; report §4.1.

**Scope and completion:** implement synchronous mount ownership, latest-revision updates, bounded queued work, private serializable worker jobs, host-side callbacks, timeout/error handling and complete disposal. Complete when two instances, rapid updates, cancellation and destruction cannot publish stale success or affect each other. Worker failure preserves fallback; main-thread execution requires explicit host choice.

### EMB-012 — Build: framework and SSR recipes over the same DOM lifecycle

**Priority / milestone:** P1 · M3.

**Reason and evidence:** framework lifecycle hooks can own one imperative region without another renderer; React remount behavior and cleanup ownership are concrete integration risks. [S36], [S36A], [S37], [S38], [S39], [S40].

**Scope and completion:** provide runnable vanilla, React and Solid examples plus Vue/Svelte recipes. Separate mounting from source updates, keep framework-owned fallback outside viewer children, and enhance after hydration. Complete when cleanup/remount and source races work under each documented lifecycle. Preserve server-selected output/identity; do not claim hydration of a public compiled scene.

### EMB-013 — Build: useful navigation and accessible read-only interaction

**Priority / milestone:** P0 · M3.

**Reason and evidence:** source-defined states and fixed geometry support useful viewing without authoring; keyboard/focus behavior must be explicit. `src/model/status.ts`, `src/dsl/compile.ts`; [S46].

**Scope and completion:** preserve user camera state, fit deliberately, observe resize without recompiling, expose scoped item/link/state events, and provide labeled controls plus a readable outline. Complete when keyboard navigation, page scrolling, hidden-container resize and state changes work without global shortcuts or duplicate announcements. Default viewer chrome is light; source theme remains authoritative.

### EMB-014 — Build: correct asynchronous preparation for markdown-it

**Priority / milestone:** P1 · M4; depends on M2.

**Reason and evidence:** ordinary fence render callbacks are synchronous; a Promise returned there is not a finished render. [S24], [S24A].

**Scope and completion:** expose parse → await preparation → synchronous render of those same tokens. Reuse metadata, diagnostics, file policy and caching from the shared core. Complete when concurrent documents cannot mix prepared artifacts, original source positions survive, and a forgotten preparation step fails clearly. Do not substitute the cheaper validator for final geometry.

### EMB-015 — Build: version-qualified host recipes and a bounded VitePress bridge

**Priority / milestone:** P1 · M4; simple remark-based fixtures may start in M2.

**Reason and evidence:** current hosts expose different processors and lifecycle hooks; current VitePress async internals do not make arbitrary fence callbacks asynchronous. [S25], [S25A], [S25B], [S25C], [S27], [S29], [S29A], [S30].

**Scope and completion:** prove Docusaurus and current Astro/Starlight configuration, public-base paths, cold/warm asset publication, watch invalidation and client navigation. After M3, provide the versioned initialization-asset and explicit `/client` enhancement bridge from report §3.12, retaining static fallback and restoring it on disposal. Prototype one pinned VitePress bridge. If correct support requires a fork or broad internal patch, stop at generated images and retain an experimental label. Recipes must name tested host versions rather than imply timeless compatibility.

### EMB-016 — Build: contributor guidance and verifiable adoption paths

**Priority / milestone:** P1 · M5; depends on the relevant earlier interfaces.

**Reason and evidence:** technical enablement and actual deployment are different outcomes; a small maintainer needs reusable fixtures rather than independent adapter engines. Report §§1.2–1.4, 3.3.

**Scope and completion:** publish an adapter contract, compatibility fixtures, reference consumer projects, support levels and a maintenance checklist limited to real integration obligations. Record reproduced external integration results separately from available packages. Complete when another contributor can build a thin adapter using documented hooks and failures. No mandatory telemetry, demand study, or upstream approval gate.

## Explore

### EMB-017 — Explore: one stable VS Code preview integration

**Priority / milestone:** P2 · M5, after M4.

**Reason and evidence:** documented markdown-it/preview hooks offer reuse; the newer code-block editor API is experimental. [S34].

**Bound and stop condition:** prototype a single installed preview using stable hooks, local resources, scoped cleanup and workspace trust. Demonstrate update/error behavior with shared fixtures. Stop if it requires weakening the host's security policy or building an embedded editor. Production packaging needs a maintainer decision; it is not a dependency of M1–M4.

### EMB-018 — Explore: a thin custom element

**Priority / milestone:** P2 · optional M5 follow-up to M3.

**Reason and evidence:** a declarative interface may reduce host glue, but introduces upgrade, registration, property/event and SSR conventions. Report §§2.2, 4.7.

**Bound and stop condition:** wrap the existing viewer in one prototype covering source changes, reconnection, events and two runtime copies. Compare its actual consumer code with the imperative recipe. Stop unless it removes meaningful integration work; do not create another renderer, public scene type or package family.

### EMB-019 — Explore: optional self-hosted iframe viewing

**Priority / milestone:** P2 · optional M5 follow-up to M3.

**Reason and evidence:** document isolation can help hosts that permit frames, but cross-origin communication and source disclosure remain explicit concerns. [S45]; report §4.7.

**Bound and stop condition:** prototype a dedicated viewer page with exact-origin/source-window checks, versioned messages, bounded source, resize/focus behavior and chosen sandbox permissions. Stop if it needs the editor application or a mandatory public service. Keep an image fallback; frames do not bypass Markdown sanitization.

### EMB-020 — Explore: Kroki and native-host proposals

**Priority / milestone:** P2 · M5 or later, after release evidence exists.

**Reason and evidence:** a renderer backend and host enablement are separate integration decisions. [S04], [S05A], [S12], [S13].

**Bound and stop condition:** prepare one concrete adapter/proposal with security policy, supported output, pinned fixtures and an update owner. Pursue only a technically applicable provider path. Stop at the proposal or prototype when acceptance is unknown; never make external approval a prerequisite for useful local runtime/Markdown releases. Drafting this recommendation does not authorize contacting providers.

## Defer

### EMB-021 — Defer: embedded editor extraction

**Priority / milestone:** P2 · outside M1–M5.

**Reason and evidence:** editor state, persistence, shortcuts, file routing and undo are a substantially larger contract than reading a diagram. [R09], [R10].

**Revisit condition:** a concrete authoring integration justifies a separate isolation/writeback design after the viewer is stable. Until then, link to the existing editor or playground. Do not quietly add editing through viewer events or export the debug API as an SDK.

### EMB-022 — Defer: framework wrapper packages without demonstrated value

**Priority / milestone:** P2 · reconsider after M3 recipes.

**Reason and evidence:** extra releases and framework compatibility work are justified only when they remove repeated lifecycle/SSR mistakes. Report §4.6.

**Revisit condition:** a reproducible integration problem or duplicated host-specific behavior identifies a useful wrapper contract. A wrapper may own refs, lifecycle, event translation and fallback presentation; rendering, policy, namespaces and cancellation stay in the runtime. No demand study is required to act on a concrete need.

### EMB-023 — Defer: a first-party adapter for every host or language

**Priority / milestone:** P2 · reconsider through M5 contributors.

**Reason and evidence:** MkDocs, Pandoc, Obsidian and other environments have independent lifecycle/release obligations; their extension mechanisms do not justify duplicating native geometry. [S31], [S32], [S33], [S35].

**Revisit condition:** a named maintainer and bounded host need justify a thin bridge over the established JS/asset protocol. Start with generated images. Defer broad Python bindings, framework-specific engines, CJS/UMD variants and an all-host catalog until they solve a demonstrated integration constraint.

## Avoid

### EMB-024 — Avoid: shipping the full CLI/editor as the native library

**Priority / milestone:** P0 · M1 and all later package changes.

**Reason and evidence:** the CLI's mandatory imports and application assets defeat the small native consumer boundary. `packages/cli/package.json`; [R09], [R10].

**Guard and rejection condition:** reject public barrels or dependency changes that pull Mermaid, D2, jsdom, CodeMirror, Solid, editor state or file-serving behavior into native rendering. Optional dependency declarations and tree-shaking assertions are insufficient; inspect the installed dependency graph and actual entry bundles.

### EMB-025 — Avoid: executable or arbitrary HTML content in native source rendering

**Priority / milestone:** P0 · M1–M3.

**Reason and evidence:** controlled SVG construction is a narrower, auditable boundary than treating source as HTML, script or a general plugin program. `src/cli/svg.ts`; report §§2.2, 3.3.

**Guard and rejection condition:** reject source-driven scripts, raw HTML/JSX, event-handler attributes, arbitrary `foreignObject`, dynamic code evaluation and source-selected renderer plugins. Renderer-owned fixed primitives remain valid. Do not disable whole-page sanitization or create a global Trusted Types policy to make insertion convenient.

### EMB-026 — Avoid: security and ambient-capability switches in fences

**Priority / milestone:** P0 · M2 and every adapter.

**Reason and evidence:** document authors should select diagram content, not grant network, filesystem, navigation or execution authority to themselves. Report §§3.1, 3.4.

**Guard and rejection condition:** reject fence options that widen link schemes, enable raw HTML, choose workers, raise limits, fetch remote includes, bypass the content root or select a renderer service. Host configuration owns these policies. Unknown/duplicate options fail; local `src` remains subject to canonical-path containment and size limits.

### EMB-027 — Avoid: a mandatory hosted service or implicit source transfer

**Priority / milestone:** P0 · all milestones.

**Reason and evidence:** local rendering is sufficient for the primary paths, while renderer services necessarily receive source. [S05A], [S12]; report §4.7.

**Guard and rejection condition:** keep native builds and the viewer usable with self-hosted package assets. No automatic source upload, public-renderer request or source-bearing query URL is required for ordinary use. Any optional iframe/service must disclose its receiving origin and work without becoming the only supported path.

### EMB-028 — Avoid: a nominal lifecycle over global application state

**Priority / milestone:** P0 · M3 and all wrappers.

**Reason and evidence:** renaming an editor mount or adding a no-op first `destroy()` does not provide independent instances. [R09], [R10]; report §4.1.

**Guard and rejection condition:** reject shared active-document stores, global handlers, unresolved pending updates or callbacks after disposal. The first destroy releases owned resources and retained data; repeated destruction is intentionally idempotent. Verify unmount during work and immediate remount, not merely a single successful screenshot.

### EMB-029 — Avoid: claiming universal hosted support from a plugin

**Priority / milestone:** P0 · M1 documentation and M5 distribution claims.

**Reason and evidence:** vendors control native Markdown rendering; installed editor extensions and owned build pipelines affect different audiences. [S04], [S04A], [S05], [S05A], [S06], [S07].

**Guard and rejection condition:** label each route as native provider support, installed adapter, controlled application, or generated image. Name verified versions and limitations. Reclassify only after actual provider deployment is verified; a package release, syntax grammar, proposal or community listing is not that evidence.

## Review boundary

This ledger chooses implementation scope and release criteria. It does not report successful implementation. Reopen a decision when a bounded prototype reveals a concrete incompatibility, when the source baseline changes, or when a provider supplies new primary evidence. Earlier useful milestones must remain independently valuable if every optional integration is deferred.

[R03]: https://github.com/byronwall/draftably/blob/ed4eff3181ded0c501c35ae18ef6aed9c62de8c5/src/dsl/compile.ts
[R04]: https://github.com/byronwall/draftably/blob/ed4eff3181ded0c501c35ae18ef6aed9c62de8c5/src/model/fonts.ts
[R05]: https://github.com/byronwall/draftably/blob/ed4eff3181ded0c501c35ae18ef6aed9c62de8c5/src/lib/font-data.ts
[R08]: https://github.com/byronwall/draftably/blob/ed4eff3181ded0c501c35ae18ef6aed9c62de8c5/site/draw.ts
[R09]: https://github.com/byronwall/draftably/blob/ed4eff3181ded0c501c35ae18ef6aed9c62de8c5/src/components/scene/StaticScene.tsx
[R10]: https://github.com/byronwall/draftably/blob/ed4eff3181ded0c501c35ae18ef6aed9c62de8c5/src/state/document.ts
[S04]: https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/creating-diagrams
[S04A]: https://github.com/github/markup/blob/master/README.md
[S05]: https://docs.gitlab.com/user/markdown/
[S05A]: https://docs.gitlab.com/administration/integration/kroki/
[S06]: https://docs.npmjs.com/about-package-readme-files/
[S07]: https://docs.slack.dev/messaging/formatting-message-text/
[S08]: https://spec.commonmark.org/0.31.2/#fenced-code-blocks
[S12]: https://docs.kroki.io/kroki/setup/usage/
[S13]: https://docs.kroki.io/kroki/setup/install/
[S18]: https://docs.npmjs.com/cli/v11/configuring-npm/package-json/
[S19]: https://nodejs.org/api/packages.html
[S20]: https://v6.vite.dev/guide/build
[S21]: https://github.com/unifiedjs/unified#transformer
[S22]: https://github.com/syntax-tree/mdast-util-to-hast#fields-on-nodes
[S23]: https://mdxjs.com/docs/extending-mdx/
[S24]: https://github.com/markdown-it/markdown-it/blob/master/docs/development.md#i-need-async-rule-how-to-do-it
[S24A]: https://markdown-it.github.io/markdown-it/interfaces/MarkdownIt.html
[S25]: https://vitepress.dev/reference/site-config
[S25A]: https://github.com/vuejs/vitepress/blob/v2.0.0-alpha.21/src/node/markdown/markdown.ts
[S25B]: https://github.com/vuejs/vitepress/blob/v2.0.0-alpha.21/src/node/markdownToVue.ts
[S25C]: https://github.com/antfu/markdown-it-async/blob/main/src/index.ts
[S27]: https://docusaurus.io/docs/markdown-features/diagrams
[S29]: https://docs.astro.build/en/guides/markdown-content/
[S29A]: https://docs.astro.build/en/reference/markdown-processors/unified/
[S30]: https://starlight.astro.build/guides/authoring-content/
[S31]: https://facelessuser.github.io/pymdown-extensions/extensions/superfences/
[S32]: https://www.mkdocs.org/dev-guide/plugins/
[S33]: https://pandoc.org/MANUAL.html#extension-fenced_code_attributes
[S34]: https://code.visualstudio.com/api/extension-guides/markdown-extension
[S35]: https://raw.githubusercontent.com/obsidianmd/obsidian-api/master/obsidian.d.ts
[S36]: https://react.dev/reference/react/useEffect
[S36A]: https://react.dev/reference/react/StrictMode
[S37]: https://docs.solidjs.com/reference/lifecycle/on-mount
[S38]: https://docs.solidjs.com/reference/lifecycle/on-cleanup
[S39]: https://vuejs.org/api/composition-api-lifecycle
[S40]: https://svelte.dev/docs/svelte/lifecycle-hooks
[S45]: https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage
[S46]: https://www.w3.org/WAI/tutorials/images/complex/
