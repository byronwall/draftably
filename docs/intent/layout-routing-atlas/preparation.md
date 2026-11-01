# Preparation and direction

Goal: help readers see every layout and routing choice, then select the right fix for their diagram.

## Current state

Baseline: `af70d8317797d5a522acffdd604819376a3ec893`.
The worktree was clean and detached. Work now uses `codex/layout-routing-visual-docs` in the existing checkout.

The current reference has an engine table, an engine-settings table, a complete router-settings table, and repair advice.
It has one rendered example in each engine and routing section. It does not show all option values or effects.
The site derives reference pages from `docs/DSL.md`. Existing `draft` fences support rendered, editable examples.

Source observations:

- `LayoutLab.algorithms`: 11 operations, including `separate`.
- `ENGINES`: 10 file engines; `separate` is deliberately excluded.
- `ENGINE_PARAMS`: 15 attributes, plus common layout attributes. A source-count check corrected the initial manual count of 16.
- `ROUTING_PARAMS`: 12 attributes.
- Editor settings, compiler defaults, and API options have different boundaries.

## Diagnosis

Scores concern this documentation task, not the entire site.

| Lens                       | Score | Evidence                                                                          |
| -------------------------- | ----: | --------------------------------------------------------------------------------- |
| Option coverage            |  5/10 | Engine and router tables exist; editor and API boundaries need reconciliation.    |
| Visible causal differences |  2/10 | One live engine example and one routing example cannot show all controls.         |
| Choice guidance            |  6/10 | The reference has engine choices and symptom advice, but few matched comparisons. |

## Ideas

1. Remove duplicate parameter lists; link one canonical reference.
2. Remove internal engine switches from ordinary user choices.
3. Create a source-backed coverage matrix with one row per public option.
4. Put a visual selection atlas before parameter detail.
5. Compare engines on one unchanged graph, plus graph families that expose differences.
6. Freeze positions when explaining routing controls.
7. Add low/default/high sweeps for numeric settings.
8. Show no-effect cases and explain applicability.
9. Map symptoms to the smallest useful control.
10. Link source syntax, editor labels, CLI options, and saved behavior.
11. Add exact downloadable fixtures and changed-line explanations.
12. Check new options against coverage and compile the published fixtures.

## Direction comparison

Scores are provisional design judgments. Ten means the approach fully serves the named outcome.

| Approach                               |         Complete option coverage |              Visible causal differences |                           Choose a repair |
| -------------------------------------- | -------------------------------: | --------------------------------------: | ----------------------------------------: |
| Extend the current tables              |         8: can list all controls |                 3: effects remain prose |    5: reader translates names to symptoms |
| Add a large image gallery              | 6: omissions remain hard to find | 7: comparisons help, but input can vary |          6: pictures lack a decision path |
| Source-backed atlas plus symptom guide |  10: every row has a destination | 9: matched inputs and controlled sweeps | 9: symptoms link to controls and examples |

Choose the third approach. Reuse the current Markdown and live-example system.
Ask Pro to challenge this choice and identify the smallest missing renderer support.

## Decisions for you

- Treat all supported public layout and routing controls as the scope, across source, CLI, and editor.
- Explain internal flags in contributor material only when useful. Do not advertise them as file syntax.
- Show important interactions, not every possible parameter combination.
- Separate documentation repairs from proposed engine behavior changes.
- Use one Pro message and at most one follow-up for a material gap.

The 10x pass applies to the handoff and documentation design. It does not request a general site redesign.

## Baseline proof

All ten file engines ran through `draftably vary --try` on the same grouped service graph.
`boundary-align` removed one crossing and increased area by 82%.
`compound-spring` removed one crossing and increased area by 91%.
`layered` produced the same result as `compound-flow` on this fixture.
These are fixture results, not general engine rankings.

The contact sheet was opened and inspected. The published engine lesson was read in Chrome.
The source packet includes the exact baseline fixture and all variant source and metrics.
Working screenshots and the input ZIP remain in ignored `tmp/pro/layout-routing-atlas/`.
The machine-read [baseline options](baseline-options.json) record engine metadata, defaults, public attributes, Compare options, and brush defaults.
The [baseline render results](baseline-renders.json) preserve the exact source, variant edits, and measured comparisons.
