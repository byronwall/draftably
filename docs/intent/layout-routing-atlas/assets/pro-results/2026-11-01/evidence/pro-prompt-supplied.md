# Draftably: exhaustive layout and routing documentation with a visual atlas

https://github.com/byronwall/draftably

Baseline: `af70d8317797d5a522acffdd604819376a3ec893`.
Working branch: `codex/layout-routing-visual-docs`.
Mode: Design, with a source-backed coverage review.

## Mission

What should Draftably's complete layout and routing documentation contain so a reader can see every available choice, understand its effect, and choose the right control?

The owner says: "We have so many different layout algorithms and routing options. I want the docs to exhaustively describe all the options and give visuals of all. Look for gaps and propose fixes."

Produce a buildable documentation design, substantial ready-to-review page drafts, and a complete visual-example specification. Find product gaps that documentation cannot fix. Rank those separately. Codex will verify your claims, preserve your original files, integrate the results, and open a PR. Do not commit or push.

Act as a graph-drawing engineer and technical documentation designer who has built visual algorithm explainers. Use the full depth of Pro. Make this substantially stronger than a larger reference table. Be candid about weak examples, inert settings, misleading names, and behavior that conflicts with the docs.

## Access check

Confirm you can read this exact baseline through GitHub or the attached source packet. Read its `PACKET.md` first. The packet contains current source, docs, tests, and examples, without dependencies or build output. It is authoritative for this baseline; the live site or `main` may advance. If a decisive file is missing from both sources, stop and name the smallest missing input. Do not claim exhaustive coverage from partial access.

## Reading route

At minimum, read:

1. `AGENTS.md`, `README.md`, `package.json`, `docs/ARCHITECTURE.md`, `docs/CHECKS.md`, `docs/RELEASING.md`, and `docs/intent/diagram-quality/FEEL.md`.
2. `docs/DSL.md`, `skills/draftably/SKILL.md`, `site/docs/content.ts`, `site/docs/Docs.tsx`, `site/docs/Example.tsx`, and `site/live/LiveEditor.tsx`. The site derives reference pages from `##` sections in `docs/DSL.md`. `draft` fences already produce editable source and rendered examples. Reuse that system where possible.
3. `src/dsl/syntax.ts`, especially `ENGINES`, `ENGINE_PARAMS`, `ROUTING_PARAMS`, all layout recipes, edge attributes, and refinements. Read `src/dsl/compile.ts`, `channels.ts`, `lanes.ts`, `cells.ts`, and `layout-edits.ts`. Sequence compilation is in `compile.ts`.
4. `src/model/types.ts`, all four engines in `src/engines/` and their declarations, `src/model/static-scene.ts`, `src/model/routes.ts`, `src/state/layout.ts`, `scene.ts`, `comparison.ts`, `sculpt.ts`, and `file-session.ts`.
5. `src/components/LayoutLab.tsx`, `Menus.tsx`, `comparison/ComparisonSidebar.tsx`, `comparison/ComparisonDialog.tsx`, `sculpt/TimelineDeck.tsx`, `sculpt/BrushDock.tsx`, and `src/state/commands.ts`.
6. `src/cli/variants.ts`, `vary.ts`, `index.ts`, representative `examples/*.draft`, the layout/routing/DSL/variants/site-docs tests, and `docs/intent/layout-in-files/plan.md`.

Inspect the published `/docs/layout-engines`, `/docs/routing`, `/docs/layout-tools`, and relevant diagram-kind lessons at https://draftably.dev if browser access permits. Record which live interactions you actually checked. Use the source packet even if browser access fails.

## Starting evidence, not conclusions

- `LayoutLab.algorithms` contains 11 operations. `ENGINES` permits 10 in files. `separate` repairs current geometry and is deliberately excluded from file recipes.
- The DSL exposes 16 `ENGINE_PARAMS` attributes, plus shared layout attributes such as direction and fit. `LayoutSettings` includes more editor/pass controls.
- `ROUTING_PARAMS` exposes 12 file settings. `RoutingOptions` also has internal switches, such as `quick`, `facing`, `titleBands`, `window`, `tidy`, and `jogs`. Determine which belong in user docs, contributor docs, or neither.
- Current docs list engines and router values, but one engine example and one routing example cannot demonstrate every option.
- Cold file compilation and warm improvement passes have different semantics. Some engines can look alike after the same cold start. Some settings only apply to certain algorithms.
- Existing comparisons and `draftably vary --try` retain identical results and can identify a setting with no effect. Do not manufacture visible differences.

Check each point independently. These are leads, not findings you must agree with.

## Ranked questions

1. **What exists, and where is it documented?** Build a complete coverage matrix from source, not from the present docs. Include built-in flow/row/column/lanes/sequence/cells recipes; every engine; layout settings; directions, folding, target shape, and scope; nesting and inheritance; ordering and feedback edges; refinements and pins; edge ports, return/wrap lanes, channel reservations; all routing settings; Compare, `vary`, local improvement, timeline, and brush. For each option give its canonical syntax or UI label, allowed values/range, actual defaults by context, applicable algorithms, persistence behavior, present documentation, missing explanation, and visual-example ID. Count the inventory and reconcile any exclusions. Distinguish supported public controls from internal implementation flags and legacy aliases.
2. **What should readers see for every choice?** Design a visual atlas that makes mechanisms and tradeoffs visible. Use one unchanged graph for fair engine comparisons, plus small graph families that reveal each engine's strengths and failures. For numeric settings use a useful low/default/high sweep; categorical options need each distinct supported state. Freeze geometry for routing comparisons. Show nested groups, flat DAGs, trees, cycles/feedback, disconnected nodes, long chains, fan-in/out, dense ports, title bands, narrow corridors, long labels, and pinned nodes where relevant. Every visual needs exact runnable `.draft` source or a reproducible editor-only recipe. Say what changes and what must stay fixed. Explain no-effect cases honestly. Avoid the full Cartesian product. Cover every public option and the important interactions instead.
3. **How should the docs help someone decide?** Compare two or three coherent documentation designs, score them on option coverage, ability to see causal differences, and ability to choose a fix for a bad drawing. Recommend the strongest design. Specify navigation, page boundaries, a symptom-to-control guide, progressive detail, links between source/CLI/editor names, and browser/CLI entry points. Reuse current live examples. Ask whether shared-scale views, synchronized before/after, highlighted changed lines, or geometry/route overlays teach enough to justify implementation. Keep useful detail readable on a narrow screen.
4. **What is wrong or missing in the product?** Identify ignored knobs, misleading ranges/defaults, doc/source drift, inaccessible controls, irreproducible examples, persistence surprises, and algorithm/routing limitations. Cite concrete files and symbols. Distinguish a missing explanation from a bug and from a new capability. Rank fixes by reader impact. Do not propose new algorithms unless a demonstrated gap warrants one. Examine which options should be hidden, renamed, constrained, combined, or documented rather than expanded.
5. **What exactly should we write and build?** Supply substantial page drafts and a staged implementation plan with real files, example sources, checks, and acceptance criteria. The first milestone should improve reader outcomes on its own. Include a small, durable way to detect missing options and broken examples as the code changes. State what a complete atlas means in countable terms. Separate documentation work from behavior changes requiring a release.

## Evidence and visual rules

- Cite repository paths and symbols for code claims. Provide primary-source URLs for decisive external claims.
- Check algorithm terminology against original papers or official documentation, where needed. These are original heuristics, not imported ELK, Graphviz, CoSE, or full stress-majorization implementations.
- Separate observed facts, inferences, proposals, and unverified claims. Defaults may differ across parser/compiler, engine settings, editor mode, Compare, and `vary`; do not collapse them.
- A reference range alone does not explain an option. Explain units, mechanism, direction of effect, applicability, interactions, and failure cases.
- Generate actual Draftably visuals if your tools can run the supplied source. Never draw a plausible output and present it as engine output. If runtime rendering is unavailable, deliver exact `.draft` fixtures plus expected comparisons, labeled unverified for Codex to render.
- Annotate ports, clearances, ranks, feedback paths, or changed settings only when those marks explain the comparison. A small image wall with unreadable labels is not an atlas.
- Use matched examples to expose tradeoffs: crossings versus detours, compactness versus readability, stable edits versus a rebuild, scope versus pins, and layout versus routing.
- Every public option must map to a visual or a justified nonvisual explanation. Editor-only operations need a reproducible starting document and action sequence.
- Do not recommend a new custom documentation framework if the existing Markdown/live-example system can do the job.

## Scope and constraints

This is Draftably, a personal SolidJS/TypeScript project. Use pnpm. Preserve its readable `.draft` format and current docs system. Do not add compatibility infrastructure, a new layout dependency, or a generic playground builder without a concrete need. Do not turn this into another general website usability audit. Existing audit reports concern broader site issues; focus on exhaustive layout/routing explanation and visual proof.

Commands verified from this checkout:

```sh
pnpm install --frozen-lockfile
pnpm site:dev
pnpm draftably check example.draft --metrics
pnpm draftably inspect example.draft --svg
pnpm draftably vary example.draft --try engine=layered,tree,grid --out tmp/atlas
pnpm draftably vary example.draft --try crossing-penalty=0,360,900 --out tmp/routes
pnpm shoot example.draft tmp/example.png
pnpm shoot --sheet tmp/sheet.png Label::a.draft b.draft
pnpm check:fast
pnpm check
pnpm site:build
pnpm prove:site
```

These commands exist. The packet does not contain installed dependencies or built assets. State whether you actually ran them. A `docs/DSL.md` change must update `skills/draftably/SKILL.md` in the same PR or justify why the skill stays unchanged. Shipped source, examples, or DSL reference changes need a changeset. Use existing screenshot tooling.

## Deliverables

Attach downloadable files and link every one in your final reply. A ZIP is useful for multiple fixtures; full inline text is acceptable if file creation fails.

1. **`report.md`**: decision first; answers to the ranked questions; source-backed gap review; rejected documentation designs; limits and open questions.
2. **`coverage.csv`**: one row per public control or operation. Include stable ID, surface, syntax/label, values, context-specific default, applicability, persistence, source, current docs, gap, proposed page, and visual IDs. Include an exclusion section in the report for internal flags and aliases.
3. **`visual-atlas.md` and `examples/`**: a numbered visual storyboard, actual runnable `.draft` companions, clear before/after or sweep instructions, changed lines, intended observation, and rendering status. Include actual rendered SVG/PNG files only when generated by Draftably. Cover the full inventory, including settings that need unchanged geometry or an editor pass.
4. **`page-drafts.md`**: substantial proposed reader-facing documentation, including engine selection, routing selection, complete parameter explanations, and symptom-led repair guidance. Identify each destination page or existing section. Keep proposals distinct from current capabilities.
5. **`implementation-plan.md`**: small, shippable milestones with files, exact example requirements, tests/proofs, acceptance criteria, main failure mode, and dependencies. Make separate milestones for the atlas content, minimal renderer support if needed, and product defects.
6. **`recommendations.md`**: stable recommendation IDs, each classified Build, Explore, Defer, or Avoid, with evidence, a one-line reason, and destination milestone.

End with access status, files read, checks actually run, deliverable links, and essential open questions. Work autonomously within these constraints. Do not ask the owner to choose routine documentation decisions.
