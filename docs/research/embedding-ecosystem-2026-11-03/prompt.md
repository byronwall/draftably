# Make Draftably easy to embed and distribute

https://github.com/byronwall/draftably

Source baseline: `ed4eff3181ded0c501c35ae18ef6aed9c62de8c5` on `main`.
Research branch: `codex/embedding-ecosystem-research`.
Mode: **Design**, including the distribution strategy needed to choose implementation order.

## Mission and decision

How should Draftably become as easy to integrate and broadly available as Mermaid?
Design a buildable path for `.draft` code fences in Markdown and embedding in web applications.
Support both static diagrams and an interactive viewer, according to the host's needs.
The owner wants builders to choose Draftably with little integration work.
Decide the public API, package boundaries, first integrations, and staged adoption plan.

Act as a diagram-runtime and developer-tools architect who has shipped Markdown integrations and browser libraries.
Be ambitious about reach and candid about the maintenance cost for one developer.
Compare real options before recommending one. Do not reduce this to a list of plugins.

## Access check

First confirm access to the named repository commit or the attached source packet.
The packet contains tracked source at the baseline, plus this prompt and a source inventory.
Use it if connected GitHub cannot expose the ref. It is sufficient for this mission.
If decisive files are missing from both, stop and name the smallest missing input.
Do not claim that inaccessible code was reviewed. Do not commit or push; Codex owns repository changes.

## Current facts and reading route

Read at minimum:

1. `AGENTS.md`, `README.md`, `package.json`, `pnpm-workspace.yaml`, `packages/cli/package.json`, `docs/ARCHITECTURE.md`, `docs/CHECKS.md`, `docs/RELEASING.md`.
2. `src/dsl/syntax.ts`, `src/dsl/compile.ts`, `src/dsl/project.ts`, `src/model/fonts.ts`, `src/model/font-metrics.json`, `src/model/types.ts`.
3. `src/cli/svg.ts`, `src/cli/main.ts`, `src/cli/png.ts`, `src/lib/font-data.ts`, `src/lib/svg-export.ts`, `src/model/embed.ts`, `src/model/link.ts`.
4. `site/draw.ts`, `site/docs/content.ts`, `site/docs/Example.tsx`, `site/live/DiagramView.tsx`, `site/live/LiveEditor.tsx`, `site/play/Playground.tsx`.
5. `src/components/scene/StaticScene.tsx`, `src/model/static-scene.ts`, `src/lib/engine-tasks.ts`, `src/workers/engine.worker.ts`, `src/state/debug-api.ts`, `src/state/document.ts`, `src/state/keyboard.ts`.
6. `scripts/build-cli.ts`, `scripts/prove-package.ts`, `vite.config.ts`, `vite.site.config.ts`, `tests/embed.test.ts`, `tests/dsl.test.ts`, `tests/themes.test.ts`, `tests/cli.test.ts`, and representative files in `examples/`.
7. `docs/research/README.md` and `docs/research/diagram-library-gaps-2026-10-27/{summary,coverage,next-steps}.md` for prior research. Some features shipped afterward; verify current source.

Known seams, to verify rather than assume:

- The compiler uses deterministic font metrics and a fixed render context, shared by browser and CLI.
- `site/draw.ts` already composes `compile` → `projectScene` → `renderSvg` for browser diagrams.
- The public site's Markdown parser recognizes `draft` fences. That internal path is not a reusable package.
- The root package is private. The published `draftably` package exposes a CLI binary without library exports.
- The Solid editor uses application-wide state and browser controls. `window.diagramStudio` is a debug API.
- SVG exports embed fonts through Vite-specific asset imports. Links and SVG IDs require careful host isolation.
- The current CLI includes optional import dependencies such as Mermaid and D2. Native embedding should assess their cost.
- This is an MIT project, maintained by one personal developer, using TypeScript, SolidJS, Vite, and pnpm.

## Ranked questions

### 1. What makes Mermaid available, and what can Draftably control?

Research Mermaid's current public rendering API, browser/CDN entry points, CLI, Markdown integrations,
and distribution through major platforms. Separate library availability from privileged host support.
Explain what a new fenced language can do in GitHub/GitLab READMEs, package registries, chat tools,
and Markdown viewers without those hosts changing their code. Give honest fallbacks.
Compare relevant approaches from Mermaid, D2, Graphviz/Viz.js, Kroki, and suitable diagram libraries.
Select three to five adoption bets in order. Explain which path creates useful reach soonest.
Do not promise native rendering everywhere just because a plugin exists.

### 2. What public runtime and package design should we build?

Compare a single package with subpath exports, separate packages, framework-first components,
web components, and hosted iframe embedding. Recommend the smallest durable design.
Specify exact proposed imports, typed function signatures, result/error shapes, options, and lifecycle.
Cover browser rendering from a string, Node/build-time SVG without Chrome, static image use,
interactive mounting/update/destroy, and multiple independent diagrams.
Define what belongs in the compiler, renderer, viewer, editor, CLI, and optional adapters.
Decide stable contracts versus internal data types; avoid exposing the editor store as the public API.
Explain CDN/no-bundler use, ESM/type declarations, workers, fonts/assets, SSR, and client hydration.
Prevent import dependencies or the full editor from inflating native rendering by accident.

### 3. How should Markdown integrations work across the major pipelines?

Propose one canonical fenced form and options, using actual valid Draftably syntax.
Choose the first support targets among unified/remark/rehype/MDX, markdown-it,
VitePress, Docusaurus, Astro/Starlight, MkDocs/Python Markdown, Pandoc, and editor previews.
Compare build-time SVG/images with client runtime enhancement and hosted rendering.
Specify path resolution for external `.draft` files, diagnostics with source lines,
cache keys, deterministic builds, theme behavior, links, accessibility, and JS-disabled fallback.
Give concrete integration examples and distinguish published capabilities from proposed APIs.
Design common adapter logic once, with thin host adapters only where they earn their maintenance.

### 4. How should web applications embed static diagrams and a viewer?

Give copyable proposed examples for vanilla JS, React, and Solid. Explain Vue/Svelte compatibility.
Decide whether wrappers are needed, when to publish them, and what each wrapper owns.
Cover mount/update/dispose, rapid source changes, stale async results, resizing, stable camera behavior,
events, link policy, optional emphasis-state controls, accessibility, style isolation, and unique SVG IDs.
Explain SSR and React Strict Mode implications without rewriting the Solid editor.
Keep a read-only viewer distinct from an embedded editor; recommend the editor's place in the roadmap.
Compare iframe and in-process embedding for reach, privacy, self-hosting, and integration limits.

### 5. What must be true before outsiders can safely depend on it?

Inspect the concrete trust boundary for untrusted source and emitted SVG.
Address link schemes, escaping, SVG IDs/CSS collisions, embedded source privacy,
resource exhaustion, CSP, worker restrictions, network behavior, fonts, and accessibility.
Make safe defaults explicit. Identify actual code seams and targeted proofs, not an enterprise checklist.
Identify determinism, API/versioning, package smoke checks, size/performance measurements,
and documentation needed for a credible public library. Do not invent measured results.

### 6. What should we ship first, and in what order?

End with an implementation plan grounded in this repository.
Show a first milestone that a builder can install and use, then independent useful stages.
Include a practical adoption plan: reference recipes, documentation, demos, contributor adapter guidance,
and upstream integration proposals where host approval is necessary.
Distinguish technical enablement from actual adoption. Do not require a demand study before building.
Name options to defer or avoid and why. Identify decisive uncertainties with bounded prototypes.

## Evidence and scope

- Search the current web. Use primary documentation, official source code, and official platform policies.
- Cite URLs for decisive external claims. Cite repository paths and symbols for code claims.
- Separate observed facts, inferences, and proposals. State missing or conflicting evidence.
- Include a source register with title, URL, access date, supported claim, and relevant version when known.
- Focus on native `.draft` rendering and integrations, not foreign-format imports or new diagram families.
- Do not redesign layout, rewrite the application, add collaboration services, or create a hosted SaaS prerequisite.
- Preserve deterministic geometry and source portability. Use pnpm and TypeScript for proposed repository code.
- Do not execute uploaded project code unless needed for a stated measurement. Never invent successful checks.
- Do not implement the product. Proposed API snippets and small illustrative companions are useful.

## Deliverables

Create downloadable Markdown files and link each in your final answer:

1. `embedding-ecosystem-report.md`: decision first, answers to every ranked question,
   architecture alternatives, platform-support matrix, runtime contract, worked Markdown and framework examples,
   distribution bets, and sources.
2. `embedding-implementation-plan.md`: ordered, independently useful milestones.
   Each names actual files/modules to change, acceptance criteria, a few meaningful checks,
   documentation and runnable example, dependencies, main risk, and completion condition.
3. `embedding-recommendations.md`: stable recommendation IDs, each marked Build, Explore, Defer, or Avoid,
   with a one-line reason and supporting evidence. Build means inclusion in a plan, not approval to ship.
4. `embedding-sources.md`: the primary source register. Preserve enough citation context to audit decisive claims.

Keep the decision and first milestone easy to review. Put depth in the report.
Attach all files as downloads; an optional ZIP may contain the same files.
If file creation is unavailable, give each file's complete content inline.
Finish with access status, files read, checked facts versus proposals, all deliverable links, and essential open questions.
