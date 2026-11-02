# Which layout and routing controls should Draftably keep?

https://github.com/byronwall/draftably

Immutable baseline: `f14d9b891adba75de6cc172b190017ea5a5ca091`.
Handoff branch: `codex/layout-config-evaluation`. Date: 2026-11-01.
Mode: Evaluation loop, with Methods and Design outputs.

## Mission and decision

Run a substantial, reproducible evaluation of Draftably's current layout engines, port selection,
routing settings, and editor controls. Recommend the smallest useful set that covers common jobs
and important niche jobs. Measure what users gain and lose when each option disappears.

Byron suspects there is too much configuration. Treat that as a hypothesis, not the conclusion.
The primary decision is the exact algorithm portfolio and configuration surface to retain.
The second decision is what belongs in the main editing UI, advanced UI, source language, or
internal implementation. Hiding a control and deleting its implementation are different decisions.

Act as a graph-drawing researcher and diagram editor designer. Be candid about weak algorithms,
redundant controls, misleading names, metric failures, and useful niche exceptions.
Do the experiments, compute the results, and inspect rendered evidence. Do not stop at a study plan.
This is one substantial Pro assignment; use the available execution budget for real trials.

## Access and execution check

Confirm the source packet or connected GitHub exposes the baseline files below. Confirm you can
execute the actual shipped JavaScript engines and save results. The attachment contains source,
tests, examples, and relevant docs, without dependencies or build output. `SOURCE-PACKET.md` explains
its contents. Prefer the attached snapshot over a moving main branch.

If a decisive file is missing, stop and name the smallest missing input. If execution is unavailable,
report that before analysis. You may provide a provisional source review and runnable evaluation
kit, but must not present invented trials, visual inspections, or numerical conclusions as measured.
Do not replace the shipped implementations with Python approximations or external layout libraries.
If normal package installation fails, the three engine `.js` files are DOM-free ES modules;
use Node directly for engine trials. Clearly separate those results from full DSL/editor trials.

## Reading route

Read at minimum:

1. `AGENTS.md`, `README.md`, `package.json`, `docs/ARCHITECTURE.md`, `docs/CHECKS.md`.
2. `docs/intent/diagram-quality/FEEL.md`, `RUBRIC.md`, `CORPUS.md`, `NEXT.md`, the existing
   corpus and heldout folders, and `docs/intent/layout-in-files/plan.md`.
3. `src/model/types.ts`, `src/model/document.ts`, `src/dsl/syntax.ts`, `src/dsl/compile.ts`,
   `src/dsl/project.ts`, `src/dsl/layout-edits.ts`, and `docs/DSL.md`.
4. `src/engines/layout-engine.js`, `routing-engine.js`, `explorer-engine.js`, their declarations,
   and `src/engines/sculpt-engine.js`. Trace actual branches and defaults, not just descriptions.
5. `src/components/LayoutLab.tsx`, `Menus.tsx`, `LayoutPreviewBar.tsx`, the comparison components,
   `src/state/layout.ts`, `src/state/file-session.ts`, `src/state/commands.ts`, and `src/model/routes.ts`.
   Follow imports if these are not the complete route from a control to its effect.
6. `src/cli/variants.ts`, `src/cli/vary.ts`, `scripts/diagram-audit.mjs`, `scripts/bench/`,
   `scripts/prove-layout-tools.mjs`, `scripts/shoot.mjs`, `tests/engine-layout.mjs`,
   `tests/engine-recipes.test.ts`, `tests/vary.test.ts`, and `tests/routing-*.test.ts`.
7. `examples/` and `src/samples/`. Use existing regression fixtures as adversarial evidence.

Check all paths against the packet. A path error is not evidence that a capability is absent.
There is no repository `docs/research/` folder or research direction file at this baseline.

## Ranked questions

1. **What exact portfolio should remain?** For every engine, recipe, local repair action, layout
   setting, routing setting, and explicit port override, decide Keep, Merge, Automate, Hide, or
   Remove. State its user job, measurable marginal value, replacement, and lost capability.
   Distinguish rebuild engines from warm-start repair actions and structural recipes.
2. **What objective evidence supports that portfolio?** Construct and execute the attached evaluation
   protocol. Measure family-level coverage, failure tails, unique wins, regret, runtime, stability,
   and interactions. Show where a smaller portfolio fails. Preserve useful niche cases explicitly.
3. **Which defaults or automatic policy can replace user choices?** Compare today's defaults,
   a single strong global default, a small fixed portfolio, a simple structure-based selector,
   and a goal-based UI. Separate an unattainable oracle from a deployable selector.
4. **What should the editor ask users to decide?** Map common and specialist tasks to a short
   interaction. Give the exact visible controls, labels, defaults, advanced controls, and actions.
   Compare at least three viable UI policies. Measure choice burden using honest proxies and
   scripted tasks. Do not claim a usability study or observed user preferences.
5. **How should we implement the recommendation?** Give a staged plan with exact code areas,
   acceptance tests, example diagrams, documentation, main risks, and unresolved choices.
   Say which removals the evidence cannot yet support. Do not silently add compatibility layers.

## Baseline facts to verify

The model names eleven algorithm IDs. Ten are allowed by `ENGINES` for a source rebuild:
`compound-flow`, `boundary-align`, `compound-spring`, `tidy`, `stress`, `force`, `flow`,
`layered`, `tree`, and `grid`. `separate` repairs overlaps in an existing drawing.
The DSL also has `flow`, `row`, `column`, `lanes`, `sequence`, and `cells` recipes.
The recipe named `flow` and the engine named `flow` are not interchangeable labels.

`ENGINE_PARAMS` has fifteen entries, in addition to separately parsed direction and other recipe
attributes. `ROUTING_PARAMS` has twelve. `LayoutSettings` and the editor expose additional pass,
protection, scope, and effort settings. Count the live surfaces separately; do not sum aliases.
The routing explorer omits `standoff` at this baseline. Test it through the actual router API.
Read ranges and settings clamping before constructing levels. Identify ignored, clamped,
conditional, aesthetic-only, and state-dependent controls.

File compilation is a cold, deterministic rebuild followed by refinements. Editor tidy, preview,
brush, and routing history can be warm. Port stability needs a shared prior route state; an empty
history can make a useful control appear inert. Explicit `from=`/`to=` are authored constraints.
The engine descriptions describe local implementations, not full ELK, Graphviz, CoSE, or Buchheim.
Do not infer an implementation's performance from the name of its research family.

## Experiment contract

Follow `evaluation-protocol.md`. Improve details where necessary, explaining and recording changes
before the corresponding trials. Freeze metrics, graph families, splits, settings levels, and
acceptance rules before inspecting candidate wins. Run every mandatory stage. Report planned,
executed, failed, skipped, and timed-out counts separately. Keep failures in coverage denominators.

The target is thousands of actual engine runs, plus focused full-pipeline and visual review.
Use in-process batches, geometry caching, and staged screening. Avoid launching a CLI process for
every parameter combination. The explorer's twelve-candidate UI limit is not the study budget.
Set a maximum of 12,000 distinct geometry trials and a six-hour wall-clock budget. Stop expensive
optional work first. If the environment ends earlier, provide all partial data and exact resume
commands; qualify the decision instead of pretending the full study ran.

Use existing commands where applicable:

```sh
pnpm install --frozen-lockfile
node tests/engine-layout.mjs
pnpm draftably inspect examples/web-app-components.draft --svg
node scripts/diagram-audit.mjs docs/intent/diagram-quality/corpus tmp/eval-baseline --no-shots
pnpm shoot examples/web-app-components.draft tmp/architecture.png
pnpm check:fast
```

Verify example filenames before running. These are entry points, not claims that they were run
before this handoff. `scripts/draftably.mjs` builds its CLI through Vite on first use. Full checks
and browser rendering need installed dependencies; document environment limits. Use the repository
screenshot tool for PNGs. Keep SVG render artifacts if a browser is unavailable. Engine-only SVG
previews must say they omit the production label/export path.

## Evidence and research

Cite source paths and symbols for code claims. Cite primary papers, official docs, or source code
for external claims, with URLs and access dates. Research graph-drawing quality, mental-map
preservation, portfolio selection, port assignment, and progressive disclosure only where it
changes a decision. Compare named implementations when useful; do not turn this into a library swap.
Label measured findings, source facts, inferences, hypotheses, and proposals.

Do not treat DI as truth. Existing FEEL.md values can prefer an honest crossing over a large detour.
Inspect disagreements and false alarms. Report absolute counts and normalized rates. Do not call
synthetic family frequencies market prevalence. Test several explicit weighting assumptions.

## Scope

Evaluate and design. Write experimental harnesses and corpus files in your working environment,
but do not commit, push, modify the product implementation, or deploy. Codex will review the
results and make repository changes. We use pnpm, TypeScript/TSX, SolidJS, and local JS engines.
Preserve meaningful niche coverage. A recommendation may simplify the UI while retaining a cheap,
useful internal algorithm. Avoid compatibility machinery unless a concrete need justifies it.

## Deliverables

Attach downloadable files and link every file in your final answer. A ZIP is welcome for the corpus,
data, renders, and code. Also link the report and plan individually. Preserve relative file paths.

1. `report.md`: Start with a firm portfolio and UI recommendation, exact before/after counts,
   evidence strength, and the most consequential loss. Answer the ranked questions. Include the
   execution environment, process, deviations, limitations, and decisive primary sources.
2. `inventory.csv`: Every engine, recipe, setting, action, and authored constraint. Include surfaces,
   effective conditions, defaults/ranges, decision, replacement, witness case, marginal gain/loss,
   runtime impact, uncertainty, and relevant source symbols. Use stable recommendation IDs.
3. `evaluation-method.md`: Actual protocol, corpus design, splits, metrics, thresholds, preference
   profiles, trial budgets, selection procedure, and all departures from the supplied protocol.
4. `corpus/`: Runnable diagrams, graph/route fixtures when needed, task expectations, edit sequences,
   family/split metadata, and any seeded generators. Preserve original real fixtures separately
   from generated cases. Include both good and adverse witnesses for contested choices.
5. `data/`: Machine-readable trial-level settings, metrics, failures, timeouts, timing samples,
   selection results, ablations, and summary tables. Include actual completed data, not examples.
6. `evaluation/`: Source for all harnesses and analyses, exact replay and resume commands, environment
   requirements, and logs that identify actual runs. Do not depend on hidden notebook state.
7. `visual-review.md` and `renders/`: Blinded pairwise judgments, defect ledger, metric disagreements,
   and labeled contact sheets or SVGs. Distinguish production renders from engine-only previews.
8. `ui-recommendation.md`: Current-to-proposed control map and task walkthroughs. Include a compact
   wireframe, choice counts, suggested labels, and advanced/source-only escape hatches.
9. `implementation-plan.md`: Shippable milestones with files/modules, checks, examples, docs, and
   risk. Classify recommendations as Build, Explore, Defer, or Avoid, with a one-line reason.

Finish with access status, files read, actual experiment counts by stage, what you checked versus
what you propose, deliverable links, and open questions. Do not end after merely proposing this work.
