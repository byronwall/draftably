# Sequence diagrams as explanations

https://github.com/byronwall/draftably

Baseline: `2f210ce4aa92593d7cafa9c514bb4ab3808dd2a4` (main as captured on 2026-10-30).
Mode: Design, with algorithm analysis where layout needs it.

## Mission

How should draftably turn sequence diagrams into clear, edited explanations, given the attached note and current renderer? Recommend a coherent design and a staged implementation plan. Byron wants deep analysis of how his tool can improve. The decision is which capabilities and layout changes to build next, and which to reject.

Act as a sequence-notation, diagram-layout, and developer-tool designer. Be ambitious about useful outcomes. Compare real alternatives. Identify strengths, tradeoffs, and failure cases. Do not turn this into a theme refresh or a checklist of UML features.

## Access check

First confirm access to the named commit or attached source packet. The packet is authoritative for the baseline. It contains exact source files, repository instructions, tests, and the full note. If decisive inputs are missing, stop and request the smallest missing input. Do not claim a full repository review from partial access. You may research the public site, but distinguish its current deployment from the supplied commit. Do not assume the note describes today's renderer: several changes already exist.

## Reading route

Read at minimum, in this order:

1. `docs/intent/sequence-explanations/source-note.md`, `AGENTS.md`, `README.md`, `package.json`.
2. `docs/intent/diagram-quality/FEEL.md`, `RUBRIC.md`, `NEXT.md`, `docs/ARCHITECTURE.md`, `docs/CHECKS.md`.
3. `examples/login-sequence.draft`, the sequence section of `docs/DSL.md`, and `skills/draftably/SKILL.md`.
4. `src/dsl/syntax.ts`, `src/dsl/compile.ts` (`sequenced`, `participantWidth`), `src/dsl/project.ts`, `src/dsl/translate.ts`.
5. `src/model/types.ts`, `document.ts`, `routes.ts` (`messageRoute`), `labels.ts`, `colors.ts`, `appearance.ts`.
6. `src/cli/svg.ts` (`sequenceBackdrop` and message rendering), `src/components/scene/Lifelines.tsx`, `EdgeView.tsx`, `StaticScene.tsx`, `NodeView.tsx`, `src/state/scene.ts`, `src/state/actions.ts`, `src/state/debug-api.ts`.
7. `tests/sequence.test.ts`, `tests/edge-labels.test.ts`, `tests/dsl.test.ts`, `tests/translate.test.ts`.

Inspect more through connected GitHub access when needed. The packet includes a path inventory to locate related code.

## Ranked questions

1. **What remains wrong, and what should we build?** Map each substantive point in the note to current behavior: already solved, partially solved, missing, or unsuitable. Cite exact paths and symbols. The baseline already has label measurement, wrapped above-line labels, narrow participant widths, muted header accents, four-point self-loops, participant groups, and authored phase bands. Separate those facts from visual quality judgments. Explain the most valuable remaining improvements as one design.
2. **Which semantics deserve explicit language and model support?** Compare extending nodes/edges, a dedicated sequence model, and a small hybrid. Address requests, replies, asynchronous sends, local actions, phases, alternatives, parallel regions, scope notes, and outcomes. Rank needs rather than treating every construct as mandatory. Examine the specific mismatch where `kind=async` means a dashed line and the docs call it a reply. Specify ordering, concurrency, response pairing, and lossless editor/source round trips. Show concrete proposed `.draft` syntax and data structures. Label proposed syntax so nobody confuses it with supported syntax.
3. **How should layout work at the intended reading size?** Analyze participant order and stability, groups that override order, label constraints across adjacent and distant lanes, self-loop clearance, phase gutters and row spacing, multiline headers, panel bounds, arrowheads, and long labels. Determine whether current spacing calculations meet all constraints. Propose a small, deterministic algorithm with pseudocode, complexity, and exact geometry expectations for key cases. Distinguish order from elapsed time. Compare export readability near 900–1100 px with mobile exploration; those widths are starting points, not standards.
4. **Which established ideas improve explanation without adding visual machinery?** Research primary sources for Mermaid, PlantUML, D2, C4 dynamic diagrams, OMG interaction semantics, and relevant diagram-comprehension or exploration papers. Verify the note's cited studies and limit claims to what they measured. Explain where tools solve the problem well and where copying them would hurt draftably. Cover focus, phase collapse with honest hidden-event markers, stable companion views, scope/legend visibility in static exports, and when a different diagram is better. Keep authoring assistance distinct from invented semantics.
5. **What concrete redesign and proof would settle the choice?** Preserve the four participants and seven facts in the sign-in example. Produce a readable engineering view, a separate brief overview if useful, and a consistent-order failure companion without inventing authentication implementation details. Contrast viable design options on task-specific criteria. Provide diagrams or annotated SVGs that make the recommendation inspectable. Address success-path scope and a visible statement that spacing is not measured time. Include a small corpus of difficult cases and reader questions that test understanding, alongside geometry invariants and likely regressions.
6. **How do we build it in shippable steps?** Name exact modules, boundaries, dependencies, tests, examples, docs, and risks for each milestone. Keep deterministic text-to-diagram output, SolidJS editor parity, CLI SVG/PNG parity, source persistence, and undo behavior. Separate immediate fixes from prototypes and later capabilities. Give a worker enough detail to start milestone one without another design session.

## Evidence

Cite repository paths and symbols for code claims. Use current primary sources with URLs for decisive external claims. Separate fact, inference, and proposal. Treat the note as informed design input, not a formal standard or evidence that every stated defect remains. Do not infer that a correct diagram measures latency, promises completion, or proves persistence. Do not invent outcomes for user studies. State missing or conflicting evidence. Every recommendation needs repository evidence or a primary source.

## Constraints and scope

Use TypeScript, SolidJS/TSX, and pnpm. This is a personal project; avoid enterprise patterns, version coexistence, and broad normalization layers. Choose direct code for real needs. Preserve explicit author intent and stable lane order. Suggest ordering changes as reviewable actions. Do not recover phases or execution semantics from proximity alone. Layout and export must explain themselves without hover. Do not add activation bars, formal branches, icons, or colors merely for completeness. No implementation, commits, pushes, or deployment by Pro. Codex will review your output and make repository changes.

Existing validation: `pnpm check:fast`; `pnpm check` before push; `pnpm shoot examples/login-sequence.draft tmp/sequence.png` for screenshots. Read `docs/CHECKS.md` for browser proofs and audit commands. DSL changes require `docs/DSL.md` and `skills/draftably/SKILL.md` updates. Product-code or example changes require a changeset. This mission delivers research and an implementation plan; it does not authorize starting feature implementation.

## Deliverables

Attach these as downloadable files and link every file in the final answer:

- `sequence-design-report.md`: start with a one-paragraph decision; answer all ranked questions deeply; include the note-to-code gap map, alternatives, sources, and limits.
- `sequence-implementation-plan.md`: ordered, independently shippable milestones; exact modules, proposed syntax and model changes, algorithms, meaningful tests, docs, examples, acceptance criteria, and main risk. Specify exact expected values where relevant.
- `sequence-recommendations.md`: stable IDs with Build, Explore, Defer, or Avoid, and a one-line reason. Build means proposed plan scope, not approval to ship.
- Visual companions as SVG or PNG, and source `.draft` files when supported by the current language. Mark future-language examples clearly. Preserve the distinction between actual baseline renders and proposed mockups.

A ZIP is optional. If files cannot be created, provide the complete reports inline. End with access status, files read, checks performed versus proposals, download links, and open questions. Spend one substantial response on the full mission.
