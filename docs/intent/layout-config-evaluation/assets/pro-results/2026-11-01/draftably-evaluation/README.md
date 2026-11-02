# Draftably evaluation — completed evidence bundle

**Recommendation:** retain all ten rebuild engines, Separate, six structural recipes, current source-rendering defaults, and current router defaults. Simplify the main editing surface while preserving Advanced/source access. The tested reduced engine portfolios and automatic selector failed the fresh heldout coverage gate.

**Actual execution:** 8,203 registered trials; 7,731 completed, 452 timed out, twenty failed. All failures remain in the denominators. There are 72 bases in twelve families, including 24 genuinely new heldout bases, and 63 frozen blinded image-pair judgments. The original 451 baseline files are unchanged.

## Start here

| File | Purpose |
| --- | --- |
| [report.md](report.md) | Decision, exact counts, source facts, measured results, uncertainty and limits |
| [inventory.csv](inventory.csv) | All 175 stable recommendation IDs, controls/actions, conditions, dispositions and evidence |
| [implementation-plan.md](implementation-plan.md) | Build, Explore, Defer and Avoid milestones, modules and acceptance checks |
| [ui-recommendation.md](ui-recommendation.md) | Exact control map, wireframe and ten scripted task comparisons |
| [evaluation-method.md](evaluation-method.md) | Actual protocol, freezes, metrics, applicability and departures |
| [visual-review.md](visual-review.md) | All 63 unblinded verdicts, metric disagreements and defect ledger |
| [evaluation/README.md](evaluation/README.md) | Replay/resume commands and environment requirements |

## Focused evidence

- [Heldout portfolio evidence](reports/heldout-portfolio-evidence.md), including failed reduced portfolios and concrete witnesses.
- [Configuration findings](config-findings.md) and [control replacement ablations](layout-control-ablation.md).
- [Context and native warm evidence](context-findings.md).
- [Development edits](edit-findings-development.md) and [heldout edits](edit-findings-heldout.md).
- [Heldout routing measurements](heldout-routing-findings.md) and [strict routing decision](heldout-routing-decision.md).
- [Primary research notes](research-notes.md).
- [Final independent audit](evaluation/final-accounting-audit.md) and [stage counts](data/execution-summary.csv).

## Directories and preservation

`corpus/` contains original and generated `.draft` files, manifests, jobs, edits and generators. `data/` contains actual canonical JSONL, failures, duplicate attempts, complete gzip geometry, separately marked layout checkpoints, caches, settings, timing, frozen policies, statistics and witnesses. `evaluation/` contains the adapter, worker, runner, analyses, checks, read ledgers and exact replay instructions. `renders/` contains production diagram evidence, charts and explicitly proposed design diagrams. `baseline-packet/` preserves the original attached source ZIP; installed dependencies and browser binaries are excluded.

Extract the complete archive to keep relative links intact. Its top directory is `draftably-evaluation/`. The checksum list `MANIFEST.sha256` covers every included file except itself. On a system with `sha256sum`, run the following from that directory:

```bash
sha256sum -c MANIFEST.sha256
```

The original run is historical evidence. Use `evaluation/prepare-replay.py` to create a separate, newly clocked reproduction. Recreating renders does not recreate an independent visual judgment. No product code was modified, committed, pushed or deployed in this assignment.
