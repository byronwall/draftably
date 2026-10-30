# Draftably versus 15 popular diagramming libraries

Repository: https://github.com/byronwall/draftably

Baseline commit: `2995a98eef31803fa8669a7ada5c8f8892486bb7`.
Preparation branch: `codex/diagram-library-gap-analysis`.
Mode: **Strategy**, with a staged plan for the highest-value gaps.
Research date: October 27, 2026. State the actual date of external verification.

## Mission and decision

What diagram types and features should Draftably gain next, based on a deep comparison of
its DSL and diagramming offerings against **15 popular alternatives**?

The owner requests a deep gap analysis: which diagram types and features are common, which
are missing or incomplete in Draftably, and which gaps are worth closing. Give candid judgments
about value, effort, and fit. Do not turn frequency into a demand to copy every competitor.
Recommend three to five capability bets and explain what to defer or avoid.

Act as a diagram-language designer and product strategist who understands diagram-as-code
languages, graph libraries, layout engines, and interactive diagram editors.

## Access check

First confirm access to the exact baseline through GitHub or the attached source packet.
The packet contains baseline files with their repository paths. It is sufficient for the core
review; use GitHub for wider discovery when available. The preparation branch may be unpushed.
Do not mistake failure to read that branch for failure to read the supplied baseline.
If decisive parser, compiler, model, documentation, examples, or tests are missing from both
routes, stop and name the smallest missing input. Do not claim a full code review from README alone.

## Product context and reading route

Draftably is a local, deterministic diagram-as-code tool and SolidJS browser editor. A person
or agent can edit `.draft` source. The compiler, viewer, and CLI share geometry. The tool offers
automatic layout, local layout refinements, layout comparisons, undo, and source embedded in
exported PNG/SVG files. Assess these advantages as well as missing features.

Read at minimum, in this order:

1. `AGENTS.md`, `README.md`, `package.json`, `docs/ARCHITECTURE.md`, `docs/DSL.md`,
   `skills/draftably/SKILL.md`, and `docs/intent/diagram-quality/FEEL.md`.
2. `src/dsl/syntax.ts`, `src/dsl/compile.ts`, `src/dsl/cells.ts`, `src/dsl/lanes.ts`,
   `src/dsl/compare.ts`, `src/dsl/project.ts`, and `src/dsl/translate.ts`.
3. `src/model/types.ts`, `src/model/status.ts`, `src/model/appearance.ts`, `src/model/routes.ts`,
   `src/cli/main.ts`, `src/cli/svg.ts`, `src/state/files.ts`, and `src/state/file-session.ts`.
4. `examples/login-sequence.draft`, `examples/support-lanes.draft`,
   `examples/billing-schema.draft`, `examples/tcp-header.draft`, `examples/png-file.draft`,
   `examples/checkout-change.draft`, `examples/emphasis.draft`, `examples/kubernetes-cluster.draft`,
   and the other supplied examples.
5. `tests/sequence.test.ts`, `tests/lanes.test.ts`, `tests/cells.test.ts`,
   `tests/compare.test.ts`, `tests/states.test.ts`, `tests/translate.test.ts`,
   `tests/dsl.test.ts`, and `tests/embed.test.ts`.
6. Existing intent and plans in `docs/intent/diagram-primitives/`, `diagram-structure/`,
   `diagram-emphasis/`, `diagram-comparisons/`, `diagram-dsl/`, and `layout-in-files/`.
   Plans can be stale. Source and tests decide what has shipped. `docs/CHECKS.md` gives validation.

Important baseline facts to verify: sequence diagrams, swim lanes, cell tables, byte/bit layouts,
change marks, aligned before/after panels, named emphasis states, and multiple layout engines
already exist. The parser's `DslShape` excludes editor `icon` and `image` kinds. Sequence
fragments, activations, and notes are documented as absent. Do not list an existing capability
as wholly missing because an older plan still describes it as future work. Distinguish source
format support from browser-only support, export support, and complete domain semantics.

## Ranked questions

1. **What does Draftably actually support?** Build an evidence-based inventory of diagram
   families, language primitives, semantics, editing workflows, layout/routing, and outputs.
   Distinguish native notation, generic primitives that can approximate it, incomplete support,
   and unavailable features. For example, linked table cells are not automatically a full ER DSL;
   a generic graph can depict a state machine without state-machine semantics.
2. **Which 15 alternatives form a useful popular comparison set?** Choose exactly 15, excluding
   Draftably. Explain selection and categories using current primary evidence and dated popularity
   proxies, such as repository activity/stars, package use, integrations, and ecosystem reach.
   Do not pretend a heterogeneous set has a precise universal popularity ranking. Start from
   Mermaid, PlantUML, Graphviz, D2, Structurizr DSL, mingrammer/diagrams, nomnoml, React Flow
   (xyflow), JointJS, GoJS, bpmn-js, Cytoscape.js, AntV X6, AntV G6, and yFiles. Replace entries
   if evidence supports a stronger set, explaining each replacement. Separate text DSLs,
   programmable graph/diagram libraries, and editor/modeling toolkits. Treat ELK/Dagre as
   supporting engines rather than automatically comparable products. Note paid/open-source
   boundaries where they materially change a capability claim. Do not count product editions
   as separate alternatives.
3. **What is common, missing, or incomplete?** Produce both a diagram-type matrix and a feature
   matrix for all 15 alternatives plus Draftably. Cover flow/activity, sequence, state, class/UML,
   ER/schema, architecture/C4/cloud/network, swim lanes/BPMN, trees/mind maps, timelines/Gantt,
   journey, requirements, packet/byte/bit, component/deployment, and other meaningful families
   discovered in research. Include advanced sequence and ER notation. Feature coverage should
   include shapes/icons/images, rich labels/notes/math, edge heads/cardinality/ports, containers,
   layout constraints and stability, themes, views/filtering/collapse, change comparisons,
   embedding/export/import, reuse/includes/data-driven generation, validation, accessibility,
   editor round trips, and agent/CLI workflows. Expand the taxonomy where needed.
   State a legend: native, partial, programmable/custom, plugin/paid, unavailable, unknown.
   A programmable canvas is not native support for every diagram type. Report frequency with
   explicit denominators and separate native support from custom implementation potential.
4. **Which gaps are worth closing?** Rank three to five capability bets by concrete user job,
   usefulness across diagram families, fit with Draftably's differentiators, language/implementation
   cost, likely quality risks, and dependency leverage. Use explicit, task-specific scoring with
   explained judgment; avoid false precision. Distinguish breadth gaps, notation depth gaps,
   shared primitive gaps, and workflow gaps. Give a short runnable example from a competitor
   for each top gap, then current Draftably approximation and proposed `.draft` syntax clearly
   labeled as a proposal. Explain what becomes possible and why it is worth the cost.
5. **What should happen next?** Give Build, Explore, Defer, or Avoid dispositions for all
   recommendations, with stable IDs and one-line reasons. Show dependencies and a staged plan
   for the top bets. Name modules, smallest shippable slices, useful proof cases, DSL/skill/docs
   changes, and risks. Include an immediate next action and a Design-mode follow-up question for
   each bet. Explain what Draftably should keep distinctive instead of copying.

## Evidence rules

- Cite repository paths and symbols for claims about Draftably, at the stated baseline.
- Use current primary sources: official docs, repositories, specifications, and package registries.
  Cite direct URLs beside decisive external claims. Include a source index and verification dates.
- Separate facts, inferences, and proposals. Mark unknowns; absence from a documentation search
  alone does not prove unsupported. Do not claim benchmark results you did not run.
- Supply a compact evidence key for matrix cells or rows so readers can check support claims.
- Read the implementation when docs, examples, and old plans disagree; call out material conflicts.
- Popularity is a selection aid, not evidence that a feature fits Draftably.

## Scope

Study libraries, text DSLs, and programmable diagram toolkits. SaaS whiteboards can supply
context but do not replace the required 15-library comparison. General charting and scientific
plotting are outside scope unless a diagram family makes the boundary relevant.

Draftably is a personal project. Prefer direct TypeScript/SolidJS changes with pnpm, shared
compiler/viewer/CLI behavior, deterministic output, and readable agent-editable source.
Do not prescribe enterprise infrastructure, collaboration backends, or a wholesale framework
rewrite without a specific high-value reason. Do not commit, push, or implement application code.
Codex will review the research, integrate it, and open a documentation PR.

## Deliverables

Attach downloadable files and link each in the final reply:

1. `gap-analysis.md`: the deep report. Lead with the decision in one paragraph. Answer every
   ranked question. Include competitor profiles, diagram-type and feature coverage, notable
   Draftably strengths, worthwhile gaps, rejected bets, sources, uncertainty, and open questions.
2. `diagram-types.csv` and `features.csv`: reusable comparison tables with all 16 tools and
   support/evidence fields. Make both matrices readable in the Markdown report as well; split
   wide tables by category when needed.
3. `capability-bets.md`: three to five ranked bets with stable IDs, scores and reasons,
   dispositions, dependencies, examples, staged plan, and Design-mode follow-up questions.

This is a deep analysis. Do not replace it with a short list of popular products or a shallow
checklist. Keep the executive decision easy to read while giving the comparison real depth.
If file creation fails, return the complete contents inline. One ZIP is optional.
End with access status, files read, facts checked versus proposals, links, and open questions.
