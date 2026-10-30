# Draftably: deep usability audit of the published experience

https://github.com/byronwall/draftably

Source baseline: `ca96d3babd05041aaa206509090d023b02b61b5b` (main at preparation).
Mode: Review. Published target: https://byronwall.github.io/draftably/

## Mission

How well does Draftably help a new visitor understand its value, learn its language, make a useful diagram, and retain or share that work? Audit the landing page, documentation, Playground, and full Editor as one product. Byron requests a DEEP DEEP usability audit with a real browser and detailed findings. The decision is which experience problems deserve fixes first and what a coherent product journey should become.

Act as a senior usability researcher and technical product designer with experience in diagram editors, developer tools, documentation, and accessibility. Give candid, specific judgment. Favor deep investigation over generic advice. Preserve effective features.

## Access check

First confirm access to the live site and an interactive browser. Use an available browser or computer-use tool to operate visible controls. Fetching HTML or reviewing screenshots alone is not a real interaction audit. If you cannot interact with the site, say so prominently. Still deliver a clearly labeled partial review of accessible material; do not invent clicks, responsive tests, screenshots, or successful tasks. Identify the smallest missing input needed to complete the audit. Confirm repository access at the baseline separately. Distinguish the published version from source; deployment equality is unverified.

## Reading route

Start with the live experience, before reading implementation. Avoid letting repository knowledge conceal discoverability failures. Then inspect these real files at the baseline to ground fixes:

- `AGENTS.md`, `README.md`, `package.json`, `docs/ARCHITECTURE.md`, `docs/CHECKS.md`.
- `docs/intent/public-site/implementation-plan.md`, `docs/intent/diagram-quality/FEEL.md`.
- `site/main.tsx`, `site/Shell.tsx`, `site/SiteNav.tsx`, `site/landing/Landing.tsx`, `site/landing/Points.tsx`.
- `site/play/Playground.tsx`, `site/play/ExamplePicker.tsx`, `site/live/LiveEditor.tsx`, `site/live/CodeEditor.tsx`, `site/live/DiagramView.tsx`, `site/reopen.ts`.
- `site/docs/Docs.tsx`, `site/docs/Search.tsx`, `site/docs/content.ts`, `site/docs/Example.tsx`, `site/docs/Zoom.tsx`, `site/docs/pages/get-started.md`, `site/docs/pages/cli.md`, `site/docs/pages/themes.md`, `site/docs/pages/agent-skill.md`, `docs/DSL.md`.
- `src/components/Toolbar.tsx`, `src/components/Menus.tsx`, `src/components/Inspector.tsx`, `src/components/FilesPanel.tsx`, `src/state/launch.ts`, `src/state/files.ts`, `src/state/document.ts`.
- `examples/`, `skills/draftably/SKILL.md`, relevant tests discovered in `tests/`, `scripts/shoot.mjs`.

Local commands: pnpm dev; pnpm site:dev; pnpm site:build; pnpm check:fast; pnpm check. Use pnpm for package scripts. Source is SolidJS/TypeScript/Vite. The site and full editor are separate builds. The browser editor saves to browser storage; CLI mode saves to local .draft files. Do not assume those experiences are equivalent.

## Ranked questions

1. **Can visitors complete the primary journey?** Discover value, choose a starting path, create or modify a diagram, recover from invalid source, export/share, and reopen. Trace every transition across landing, docs, Playground, Editor, and local CLI instructions. Identify broken paths, lost work, unexpected resets, and unclear storage boundaries. Check ordinary link clicks versus directly loading the same destination.
2. **Does the landing page explain and demonstrate the product well?** Evaluate promise, audience, first screen, hierarchy, example complexity, editable-demo affordances, comparison with familiar diagram tools, calls to action, installation, and credibility. Can a novice predict the roles of Playground and Editor? Do demonstrations explain their cause and effect?
3. **Can the docs teach and support retrieval?** Inventory the visible topics. Test onboarding without a local installation, searching for a concrete answer, language rules, layout/refinements, diagram kinds, CLI, exports/reopening, and visual editing. Check search relevance, keyboard operation, deep links, anchors, previous/next, duplicate concepts, code copying, live editing, error feedback, expand controls, and transfer to Playground or Editor. Evaluate whether prose, examples, and diagrams teach one concept at a time.
4. **How usable are Playground and Editor under realistic tasks?** Test simple creation, label edits, adding and connecting shapes, selection, navigation/zoom, layout, undo/redo, source/render agreement, example selection, export, reimport, and recovery. Test advanced layout/comparison tools where discoverable. Judge initial state, tool density, naming, status, help, and mode errors. Do not silently bypass a confusing control with an internal API.
5. **How coherent and inclusive is the whole product?** Compare terminology, navigation, look, shortcuts, file formats, storage, example catalogs, and learning progression. Test desktop and narrow widths, keyboard-only paths, visible focus, labels/roles, zoom, color dependence, overlays, and diagram readability. Separate actual accessibility observations from speculative WCAG claims.
6. **What should change first?** Rank concrete fixes by user impact and reach. Propose a coherent end-to-end journey and a staged repair plan. Include strengths, rejected or lower-value ideas, and open usability questions that require real users.

## Browser method and evidence

Inventory available routes, documentation topics, example types, and interaction families before sampling. State population and sample counts. Cover simple flows, nested groups, sequence/state diagrams, a dense architecture, and cells/bit layouts where available. Do not sample only easy diagrams.

Attempt at least these journeys with success criteria stated first:

- First-time visitor: understand the product and make a first useful change without installation.
- Learner: find an unfamiliar concept, use a live docs example, recover from invalid input, and continue in a larger editing surface.
- Practitioner: modify a representative diagram, improve layout, undo, export/share, and reopen it.
- Return visitor: know what was saved, where it lives, and how to resume.
- Narrow-screen and keyboard user: orient, navigate docs, use a demo, and reach core editor controls.

Use visible controls and normal pointer/keyboard actions. Test at a wide desktop size and around 390px width; add 768px where layout changes. Test browser refresh and back/forward where they affect work. Preserve any pre-existing personal diagram; use your own disposable audit diagram for mutations. Do not change the deployed site, publish diagrams, or run destructive actions.

For every P1/P2 finding include stable ID, URL/surface, viewport, starting state, exact actions, observed versus expected result, recovery, repeatability, user effect, recommendation, and an observable acceptance check. Cite a screenshot or other direct browser evidence. Mark observed-once failures honestly. Reproduce primary blockers if safe. Report untested capabilities explicitly.

Separate **Observed**, **Heuristic**, **Inferred**, and **Proposed** claims. Cite paths/symbols for implementation claims, and current primary URLs for decisive external claims. Never claim a user study or measured comprehension. Score categories from 0–5 with High/Medium/Low coverage; use Untested when needed. Do not hide a primary blocker in an average.

## Scope

Audit and plan only. Codex owns repository edits. Do not commit, push, implement redesigns, or request deployment. This is a personal developer project: propose direct fixes, avoid enterprise infrastructure. Focus on the actual published experience, not an imagined future product. This is a deep product review, not only a visual taste critique or automated accessibility scan.

## Deliverables

Provide downloadable Markdown files and link each in the final answer. Optional screenshot companions are welcome. If files are unavailable, supply complete content inline.

1. **usability-audit.md**: decisive executive assessment, audience assumptions, full scope/coverage matrix, scorecard, journey logs, landing/docs/Playground/Editor analysis, cross-product coherence, diagram/example analysis, detailed ranked findings, strengths, evidence index, and limits. Be comprehensive enough for a product owner to reproduce and assess each material problem.
2. **prioritized-fixes.md**: stable finding IDs, severity (P0 unsafe/total failure; P1 primary journey blocked; P2 recurring friction/exclusion; P3 local friction; P4 refinement), reach, fix, acceptance criteria, and Build/Explore/Defer/Avoid disposition with reason. Separate blockers, quick fixes, and structural work.
3. **repair-plan.md**: staged, independently reviewable milestones grounded in real modules, user-visible outcome, validation, required docs/examples, and main risk. Build means recommended for a plan, not authorized implementation.

End with access status, pages and files examined, actual browser tasks versus proposals, deliverable links, and unresolved questions. Spend the effort on evidence and analysis, not generic design principles. One complete response is preferred over follow-up questions.
