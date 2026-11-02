# Editorial diagram corpus

This study compares Draftably with deliberate editorial diagrams from primary internet sources.
It measures native fidelity, first-render quality, authoring effort, and recurring capability gaps.

Status: Pro research is running. The corpus, findings, and final archive are not complete.

- [Research brief and trial contract](pro-prompt.md).
- [Run record and continuation state](run-record.md).
- [Pro conversation](https://chatgpt.com/c/6ae7ffd2-5bf0-83e9-abbf-5ab21e2395e4).

The target is 30 references across at least 10 publishers and 10 pattern families.
Most references should explain software or computing. Selected adjacent examples broaden coverage.
Every accepted reference needs its original image, three native attempts, renders, and an audit.
Default automated-engine examples do not qualify.

The baseline is `f14d9b891adba75de6cc172b190017ea5a5ca091`.
The renderer and language stay fixed during evaluation. Product fixes require later work.

## Completion contract

1. Collect and inspect every original Pro result. Keep input packets and ZIPs in ignored storage.
2. Preserve result files under `assets/pro-results/2026-11-01/` with an asset index.
3. Validate every native attempt locally. Preserve failures and any corrected trials separately.
4. Inspect comparison sheets and details. Judge fidelity separately from communication quality.
5. Record authoring costs, successful defaults, common gaps, and difficult single cases.
6. Write the summary, recommendation dispositions, and staged implementation plan.
7. Run required checks, open the review PR, and verify its contents.
8. Deliver the final ZIP with images, attempts, renders, comparisons, audits, sources, and logs.

The existing [quality rubric](../diagram-quality/RUBRIC.md) helps find drawing defects.
This study adds external design references and authoring-cost evidence.
