# Access and source-reading ledger

Review baseline: `af70d8317797d5a522acffdd604819376a3ec893`. Repository: <https://github.com/byronwall/draftably>. The attached packet is authoritative for this review; the published site is a separate observation surface.

`PACKET.md` was read first, followed by the complete mission. The packet provides all decisive current implementation files. Its **335 supplied members are byte-identical before and after the work**. Hashing all members is an integrity check, not a claim that every unrelated source file was read line by line. The detailed domain audits distinguish complete readings from targeted symbol-following.

## Required reading route

| Area | Files and depth | Review purpose |
| --- | --- | --- |
| Project contracts | `AGENTS.md`, `README.md`, `package.json`, `docs/ARCHITECTURE.md`, `docs/CHECKS.md`, `docs/RELEASING.md`, `docs/intent/diagram-quality/FEEL.md` | Architecture, scripts, exact test/release/changeset rules, quality expectations |
| Documentation system | `docs/DSL.md` layout/routing/refinement/diagram-kind/tool sections; `skills/draftably/SKILL.md`; complete `site/docs/content.ts`, `Docs.tsx`, `Example.tsx`, `site/live/LiveEditor.tsx` | Existing Markdown page boundaries, live examples, syntax/skill coupling, preparation/cache behavior |
| DSL and compilation | Complete `src/dsl/syntax.ts`, `compile.ts`, `channels.ts`, `lanes.ts`, `cells.ts`, `layout-edits.ts`; followed `project.ts`, `translate.ts`, `frame.ts` | Public grammar, all registries/defaults, specialized geometry, hierarchy/scopes, pins/refinements, source serialization |
| Engine/model layer | Complete `src/model/types.ts`, `static-scene.ts`, `routes.ts`; all four engines and declarations: `layout-engine`, `routing-engine`, `explorer-engine`, `sculpt-engine`; relevant `document.ts`, `edits.ts`, `geometry.ts` | Exact algorithms, router costs/finishing stages, native operations, scene conversion and metric boundaries |
| State and operations | Complete `src/state/layout.ts`, `scene.ts`, `comparison.ts`, `sculpt.ts`, `file-session.ts`, `commands.ts`, `launch.ts`; followed `actions.ts`, `pointer.ts`, `files.ts` and `src/lib/engine-tasks.ts` | Source/native dispatch, preview/keep/discard, Compare capability differences, holds, timeline/brush persistence |
| Public controls | Complete `src/components/LayoutLab.tsx`, `Menus.tsx`, `LayoutPreviewBar.tsx`, `comparison/ComparisonSidebar.tsx`, `comparison/ComparisonDialog.tsx`, `sculpt/TimelineDeck.tsx`, `sculpt/BrushDock.tsx`; relevant `Inspector.tsx`, `StartScreen.tsx`, `Toolbar.tsx` | Labels, values, default UI states, actions, disabled/unsupported contexts and control-to-source mapping |
| CLI | Complete `src/cli/variants.ts`, `vary.ts`, `main.ts`; relevant `svg.ts`, `png.ts`, and screenshot/browser proof scripts | Exact sweep keys, duplicate/ranking semantics, fresh source compile, artifact output and diagnostics |
| Planning and examples | Complete `docs/intent/layout-in-files/plan.md`; packet `evidence/grouped.draft`, `engine-variants.json`; representative flat, grouped, multi-region, sequence, lane, cell and change examples | Existing design intent, attached real metrics, family selection and regression cases |
| Tests | Layout-engine/DSL/recipes/refinements/fit/fold/sequence/cells/lanes/group packing/order/growth; all routing test families, return/wrap lanes, edge constraints/labels/halos; `site-docs.test.ts`, `layout-edits.test.ts`, `vary.test.ts`, engine parity/layout/sculpt tests | Supported contracts, existing coverage, counterexamples and focused future regression seams |

The prompt names `src/cli/index.ts`; that path is absent. The actual entry is `src/cli/main.ts`, which was read completely. This is a path-name mismatch, not a missing decisive implementation.

## Detailed source and evidence records

- [Layout audit](layout-source-audit.md): complete compiler/recipe/engine readings and relevant test families.
- [Routing audit](routing-source-audit.md): complete router/model routing readings and warning/metric boundaries.
- [Editor/CLI/docs audit](editor-source-audit.md): complete UI/state/CLI/docs system readings, plus followed serialization symbols.
- [Baseline hashes](baseline-source-hashes.json): original ZIP hash, every supplied member hash, and 162 relevant implementation/dependency hashes enforced by the portable runner.
- [Published-site observations](live-observations.md): only the browser actions actually performed.
- [Final positive-companion execution](final-cli-reproduction.json): exact commands, return codes, source hashes, geometry, metrics and frozen-comparison outcomes.

## Missing materials and their effect

The packet intentionally omits Git metadata, dependencies/build output and historical/private audit data. Dependencies and generated output were produced locally without changing the supplied members. Missing historical/reference materials still affect full-repository gates: `reference/v7/source/*-engine.js`, `.changeset` release metadata, the `srcly-release/v0.draft` quality corpus, and the `regionshot-capture/v0.draft` / `v2ctx-pipeline/v0.draft` held-out growth cases. These are required for Codex's complete-checkout integration proof; they do not conceal a missing current implementation on which the inventory depends.

The work made no repository source edits, commits, pushes, PRs or public deployments. Runnable companions, reports and review tooling are separate artifacts.
