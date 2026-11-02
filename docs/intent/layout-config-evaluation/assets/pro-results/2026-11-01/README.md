# Original Pro results

Collected from [the Pro conversation](https://chatgpt.com/c/6ae7c1f0-6374-83e8-b87d-d1c7d398226d).
Baseline: `f14d9b891adba75de6cc172b190017ea5a5ca091`. Pro ran on 1–2 November UTC.
The run folder uses the assignment date, 2026-11-01. Original filenames retain their supplied dates.

All result bytes and relative paths are preserved. The complete archive contained 21,706 entries.
The committed result set contains 21,705 archive files plus the separate verification companion.
The only excluded entry is `draftably-evaluation/baseline-packet/source-packet.zip`, the input packet.
Input and result ZIPs stay in ignored `tmp/pro/layout-config-evaluation/` storage.

## Start here

- [Original report](draftably-evaluation/report.md).
- [Original 175-row inventory](draftably-evaluation/inventory.csv).
- [Original methods](draftably-evaluation/evaluation-method.md).
- [Original plan](draftably-evaluation/implementation-plan.md).
- [Original UI proposal](draftably-evaluation/ui-recommendation.md).
- [Archive verification companion](draftably-evaluation-2026-11-02.verification.json).
- [Every preserved artifact: path, bytes, SHA-256](asset-inventory.csv).

## Report index

| Report | Original path |
| --- | --- |
| README | [README.md](draftably-evaluation/README.md) |
| config-findings | [config-findings.md](draftably-evaluation/config-findings.md) |
| context-findings | [context-findings.md](draftably-evaluation/context-findings.md) |
| edit-findings-development | [edit-findings-development.md](draftably-evaluation/edit-findings-development.md) |
| edit-findings-heldout | [edit-findings-heldout.md](draftably-evaluation/edit-findings-heldout.md) |
| evaluation-method | [evaluation-method.md](draftably-evaluation/evaluation-method.md) |
| heldout-routing-decision | [heldout-routing-decision.md](draftably-evaluation/heldout-routing-decision.md) |
| heldout-routing-findings | [heldout-routing-findings.md](draftably-evaluation/heldout-routing-findings.md) |
| implementation-plan | [implementation-plan.md](draftably-evaluation/implementation-plan.md) |
| layout-control-ablation | [layout-control-ablation.md](draftably-evaluation/layout-control-ablation.md) |
| report | [report.md](draftably-evaluation/report.md) |
| research-notes | [research-notes.md](draftably-evaluation/research-notes.md) |
| ui-recommendation | [ui-recommendation.md](draftably-evaluation/ui-recommendation.md) |
| visual-review-development-supplement | [visual-review-development-supplement.md](draftably-evaluation/visual-review-development-supplement.md) |
| visual-review-development | [visual-review-development.md](draftably-evaluation/visual-review-development.md) |
| visual-review-heldout | [visual-review-heldout.md](draftably-evaluation/visual-review-heldout.md) |
| visual-review-routing | [visual-review-routing.md](draftably-evaluation/visual-review-routing.md) |
| visual-review | [visual-review.md](draftably-evaluation/visual-review.md) |
| heldout-portfolio-evidence | [heldout-portfolio-evidence.md](draftably-evaluation/reports/heldout-portfolio-evidence.md) |

## Companions

| Collection | Contents |
| --- | --- |
| [Corpus](draftably-evaluation/corpus/) | 431 files: diagrams, originals, jobs, edits, manifests and generators |
| [Data](draftably-evaluation/data/) | 20,792 files: trials, failures, partial checkpoints, geometry, settings, timing and analyses |
| [Evaluation code](draftably-evaluation/evaluation/) | 186 files: source companions, frozen versions, tasks, checks and replay instructions |
| [Renders](draftably-evaluation/renders/) | 270 files: production evidence, detail crops, charts and proposed designs |
| [Inventory CSV](draftably-evaluation/inventory.csv) | All stable recommendation IDs and source/evidence references |
| [Original checksum manifest](draftably-evaluation/MANIFEST.sha256) | Original archive hashes; retains the intentionally omitted input-ZIP entry |

## Preservation and replay

All 21,705 original content hashes were checked before the input ZIP was excluded from Git.
The collection review independently parsed all 7,731 successful geometry artifacts and checked
every saved node/port/path signature. It also checked 6,360 heldout acceptance rows.
See [collection validation](../../../collection-validation.json). Downloaded programs were not executed.

The original [replay instructions](draftably-evaluation/evaluation/README.md) expect the input ZIP
inside `baseline-packet/`. Run them from the complete ignored extraction, where that file remains:
`tmp/pro/layout-config-evaluation/extracted/draftably-evaluation/`. Do not treat a newly timed run
as the original experiment. A fresh clone must recover the matching input ZIP from the authorized
Pro bundle before using those unchanged replay helpers. The input ZIP hash is
`34c38648ff539731e53f719e8865faee6ae62ce1b1a92567fb069c8b1caa5dff`.

Formatting and lint exclude only this original-result folder to preserve supplied code and bytes.
The supplied checksum list remains unchanged. Its input-ZIP entry will be absent in Git by design;
use `asset-inventory.csv` to check the committed result inventory. The catalogue itself and this
index are collection metadata, not Pro-authored results.
