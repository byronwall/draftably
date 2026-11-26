---
name: draftably-diagram-evals
description: Improve Draftably diagram rendering, evaluate a layout or routing change, or audit coverage of diagram types, options, and real authoring workflows.
---

# Draftably diagram evals

Run from the Draftably repository root. Read the [quality rubric](../../../docs/intent/diagram-quality/RUBRIC.md), [visual goals](../../../docs/intent/diagram-quality/FEEL.md), and [gate rules](../../../docs/CHECKS.md) before selecting a metric.

## Establish the baseline

Pin the starting commit and record the candidate revision, corpus revision, and command. The comparison uses the candidate checkout’s inputs, scorer, and font table on both engines. Use separate output directories for trials. Compare each accepted change with its parent and the combined result with the original baseline.

    base=$(git rev-parse origin/main)
    pnpm audit:compare --base "$base" --gate --sets corpus,heldout,examples,issues,population,options --out tmp/audit/full

Read the error counts before interpreting scores. Record the render count per set and list skipped inputs. Compare the actual inputs with the intended scope. For instance, the examples set takes top-level files. A project with a relative SQL file needs its own file-session proof.

## Check coverage before choosing a target

Read `coverage.md` beside `compare.md`. A cell counts successful renders, including follow-up edits. Inspect columns separately. Several edits of one diagram give stability evidence but supply only one authoring scenario.

- **Diagram types.** Check every recipe, including group-local tables and timelines, and every named layout engine. Link each new type to a real example with an observable success condition. For a sequence, check message order. For a schema, check that a relationship reaches the correct row.
- **Options.** The options set varies engine controls, routing limits, node shapes, endpoint markers, fit, fonts, themes, org-chart leaves, mind-map direction, and pin/stay with clearance. Inspect generated sources under `inputs/options/`. For a changed option, test its default, both ends of a numeric range, each discrete value, and an interaction that could defeat it. Pair a setting with geometry where it can change the result. A successful compile alone gives no evidence that a setting works.
- **Typical use.** Use the population column and [corpus requests](../../../docs/intent/diagram-quality/CORPUS.md) to find common workflows. Check first render and follow-up actions such as grow, branch, relabel, regroup, drag, and regenerate. Measure sparse and dense examples, grouped and flat drawings, and both reading directions when affected. Population weights come from collected repository diagrams. Record the sample date and scope when reporting typical use.
- **Gaps.** For each missing behavior, record the type, option or action, input path, expected result, and check. Add a representative example for a missing user task, an issue reproduction for a reported failure, or a generated option case for a setting. Keep new exploratory inputs out of heldout. Extend the inventory when the parser gains a recipe or an option family. Report untested combinations and entry points.

## Run one experiment

1. Pick a recurring defect from the corpus or issues. Inspect one bad render and a nearby good one. Record the object or edge IDs and what a reader should see.
2. Change one placement, routing, or labeling decision. Run the smallest set that can disprove the idea. For example:

       pnpm audit:compare --base "$base" --sets corpus --only srcly-scan-lifecycle --shots --out tmp/audit/return-lanes

3. Compare candidate variants on identical inputs. Check per-render defect index, individual defect counts, and edit expectations. Keep the scorer and weights fixed during renderer trials. To change the scorer, first collect labeled good and bad renders, including counterexamples. Rescore the same engine with both rubrics and document changed judgments before starting a fresh renderer baseline.
4. Run the full command above for a finalist. Add `--review` to generate paired drawings. Inspect the target, largest gains, every regression, and ties where visible geometry changed. Check the full metrics JSON when the summary truncates movers. Keep heldout for acceptance. If a heldout example guides another fix, record its reuse and reserve a fresh example for confirmation.
5. Exercise the affected product path. For routing, compare each previously clear arrow by ID before and after, including quick and full routes. Sweep affected states across all compilable files, such as each single-group collapse or supported theme. For editor, Compare, and export agreement, compare geometry from their actual entry points. Use the browser proofs listed in the [check guide](../../../docs/CHECKS.md) for actions such as drag, change font, Regenerate, and Apply.
6. Accept the candidate when the target improves and each regression or gate warning has a reviewed disposition. A tied score can support a visible fix if a direct geometry assertion and paired renders show it. Reject a fix that newly blocks a clear route. Retain a minimal reproduction and record why the candidate lost.

## Close the round

Report base and head, reproduction command, set sizes, build errors, pooled and per-set scores, better/tied/worse counts, and individual defect increases. Link the visual evidence, coverage report, parity denominators, and rejected trials. Record the next specific gap. Stop when the requested result or budget is reached, or when the remaining candidates fail the acceptance checks.

In the [November render climb](https://github.com/byronwall/draftably/pull/696), 46 of 250 renders improved and 204 tied. Two individual defect counts still rose. A subsequent nested-clearance trial blocked a previously clear arrow in a pinned group. This is the reason to keep both per-defect counts and per-arrow identity in the review.
