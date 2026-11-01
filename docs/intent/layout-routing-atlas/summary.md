# Layout and routing documentation review

Build a task-led guide, a focused visual atlas, and a complete reference within the existing docs system.
Use matched inputs, common scale, exact source, and explicit persistence rules to explain each choice.
The [implementation plan](implementation-plan.md) separates documentation from proposed behavior fixes.

## What this review provides

The [original Pro package](assets-index.md) includes:

- A 197-entry [coverage matrix](assets/pro-results/2026-11-01/coverage.csv): 194 controls or operations and three derived behaviors.
- A [visual atlas](assets/pro-results/2026-11-01/visual-atlas.md): 105 visual families and four justified nonvisual groups.
- 323 positive `.draft` companions, 10 defect repros, 359 SVGs, and 13 complete page examples.
- Substantial [page drafts](assets/pro-results/2026-11-01/page-drafts.md), a detailed plan, and 34 ranked recommendations.
- Exact source, measurements, warnings, model outputs, and reproducible editor action recipes.

Collection preserved 2,457 original files. All supplied package hashes passed before preservation.
The [asset inventory](asset-inventory.csv) records every preserved file and its hash.
ZIPs remain in ignored working storage. The supplied input source ZIP is excluded from committed results.

The [current-main addendum](current-main-addendum.md) adds one missing canonical control: **Arrow / directed**.
It covers the existing native Arrow toggle and the new `directed=false` source flag.
The reviewed scope therefore has **198 entries**. Original Pro counts remain unchanged.

## Findings that decide the plan

The current docs list engines and ranges, but few examples explain causal differences.
Readers need to distinguish four operations: a source recipe, a bounded pass, a local refinement, and routing.
Each operation has different starting geometry and persistence rules.

The ten-engine comparison demonstrates real tradeoffs.
Boundary alignment removes one crossing with 81.6% more export-frame area.
Compound spring removes it with 91.4% more area.
Layered and compound flow have equal canonical geometry on this fixture.
These results support a choice guide; they do not rank engines for every graph.

A source routing edit can also move shapes through channel allocation.
Pure routing examples must prove fixed world-space rectangles.
Equal headline metrics, equal route points, and equal visible curves are separate claims.

Pro found several behavior gaps that documentation cannot repair:

- Explicit `fold=never` can be lost when the editor serializes a file recipe.
- Independent sibling recipes can inherit settings from the preceding solve.
- Fractional cell counts and empty sequence groups can produce invalid output.
- Source Compare can offer controls or values that it does not faithfully execute.
- The public `standoff` setting is absent from the routing menu and Compare axes.

The [local verification](verification.md) records reproduced findings and evidence limits.
The [dispositions](dispositions.md) give every recommendation a destination and reason.

## How the documentation should work

Start with the reader's task. Link each symptom to the smallest useful control and a focused example.
Keep reference spellings, values, units, applicability, and contextual defaults in one place.
Cross-reference source syntax, editor labels, CLI options, and saved behavior.

Compare engines on one unchanged graph, then use graph families to expose their different strengths.
Use low/default/high numeric sweeps and every finite categorical state where applicable.
Keep no-effect cases visible and explain why they occur.
Provide exact starting files and actions for editor-only operations.

Reuse the current Markdown/live-example system.
Add a small comparison component only for shared scale, source differences, and lazy preparation.
The full atlas should cover every entry; the first ten-engine gallery is an initial milestone.

## Review status and limits

This PR preserves the research, page drafts, examples, visuals, checked findings, and buildable plan.
Publishing the complete atlas and implementing engine or editor fixes are later milestones.
The original HTML viewer and helper programs remain preserved research companions; collection did not execute them.

Pro's native editor artifacts are model executions. They do not prove gestures, Apply, Undo, or save/reopen behavior.
The plan requires browser proof before publishing those lifecycle claims.
The original report names its packet-only check limits; local repository checks are recorded separately.

Source baseline: `af70d8317797d5a522acffdd604819376a3ec893`.
Current-main check: `ce7f65648e7e63021bd93f7d38a7bcc81db9fd68`.
Source: [Pro conversation](https://chatgpt.com/c/6ae6c01c-babc-83e9-bf65-d92651191324).
