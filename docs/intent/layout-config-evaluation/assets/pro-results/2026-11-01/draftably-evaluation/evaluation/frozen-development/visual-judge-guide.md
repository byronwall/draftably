# Blinded visual judgment guide

## Purpose and limits

Judge whether each pair helps a reader trace the pictured relationships and understand its stated task. Apply the supplied baseline's `docs/intent/diagram-quality/FEEL.md`. These judgments are one expert model's assessment, **not independent human validation**, a measured usability study, a population preference estimate, or a completion-time experiment.

The reviewer knows the product's source and the standing rubric from earlier work. The blindness is to **the identities and numerical outcomes of the candidates in each reviewed pair**, not to Draftably itself. The reviewer must not infer a configuration identity and then use that inference to choose a winner.

## Permitted evidence before the judgment is frozen

- The applicable `visual-manifest-*.json` file, including pair ID, split, family, task and named image paths.
- The exact pair PNGs named by that manifest.
- The manifest's A/B SVGs when a detail crop or full-size render is needed.
- `FEEL.md` and this guide.
- Image file dimensions and SHA-256 hashes, which identify the inspected artifact without revealing its configuration.

Do not open pairing keys, candidate identity files, trial rows, control/portfolio analysis, score tables, or hidden engine names. Do not change scoring weights or evaluation thresholds while reviewing heldout pairs.

## Viewing procedure

1. Open every named PNG with the image-viewing tool. A successful file read or screenshot command is not a visual inspection.
2. Inspect the complete pair first: task flow, grouping, main connections and label ownership.
3. Trace at least the most congested or ambiguous region in each side. Include returns, fans, nested boundaries and long labels when present.
4. If a drawing is too large to judge detail at the supplied size, render or crop the named SVG or PNG with the **unchanged repository `scripts/shoot.mjs`**. Inspect that crop with the image-viewing tool too.
5. Record the verdict and ledger before reading any candidate identity or metric outcome.
6. Hash the inspected PNG and any inspected crops. Preserve the timestamps and JSON judgment as the pre-unblinding record.

## What to judge

- **Connection visibility and identity:** Can the reader follow each line to the intended endpoint? Does a connector disappear behind an unrelated object? Is an arrow misleading?
- **Reading path:** Does the drawing communicate the task's intended order? A structural network should not be penalized merely for lacking a forced flow.
- **Routing:** Prefer a clear direct path. Accept an honest crossing when avoiding it creates a distracting outer loop. Examine departure and arrival sides rather than counting bends visually as the sole objective.
- **Label ownership:** Is each label visibly attached to its own connection? A shorter path with a floating label can be worse. An offset label is not automatically unreadable; judge the association in context.
- **Groups and boundaries:** Do external connections leave a group and continue? Does a border compete with a connector? Is empty space required by structure or merely distracting?
- **Alignment and spacing:** Look for cramped fans, uneven corridor spacing, unnecessary small steps and related objects separated excessively.
- **Appearance:** Record real corner, halo and port-spread differences even when they do not change the task verdict. Polyline equivalence is not identical appearance.

Hard-looking defects in the image are recorded as visual observations. Their agreement with a programmatic hard gate remains unassessed until unblinding.

## Verdict and severity

| Field | Meaning |
| --- | --- |
| `A-better` | A is visually preferable for the stated task; the reason identifies the difference. |
| `B-better` | B is visually preferable for the stated task; the reason identifies the difference. |
| `same` | No reliable meaningful advantage is visible at the inspected scales. This does not imply pixel identity or defect-free output. |
| Severity 0 | No material between-candidate difference. |
| Severity 1 | Polish or additional visual effort; the difference should not be advertised as a major coverage win. |
| Severity 2 | Noticeable tracing difficulty, uncertain label ownership, disruptive detour, or weak reading order. |
| Severity 3 | Misleading, hidden, or unreadable connection/content. |

`confidence` is a subjective 0–1 assessment of this judgment, not a calibrated probability. A high-confidence tie is valid. Do not force a winner because the pair was selected for a suspected difference.

The pair severity describes the **between-candidate consequence**. The defect ledger can contain stronger common defects even when the verdict is `same`; common defects must not disappear from the record.

## Crop run sheet

Only the named blinded images may be used. Substitute the exact paths from the permitted manifest and coordinates based on the inspected image. No candidate source or key is required.

```bash
# Full-size rasterization of a named production SVG, if the pair sheet is too small.
PLAYWRIGHT_BROWSERS_PATH=/tmp/draftably-evaluation-browsers \
  node baseline/scripts/shoot.mjs \
  deliverables/renders/blinded/P011-A.svg \
  deliverables/renders/blinded/P011-A-full.png

# Detail crop from that same named SVG, in its rendered intrinsic pixel coordinates.
# Use the actual region found during visual inspection; these coordinates are examples.
PLAYWRIGHT_BROWSERS_PATH=/tmp/draftably-evaluation-browsers \
  node baseline/scripts/shoot.mjs \
  deliverables/renders/blinded/P011-A.svg \
  deliverables/renders/blinded/P011-A-detail.png \
  --crop 0,0,600,400
```

In this environment the repository screenshot tool requires execution outside the restricted process sandbox. The original product script and renderer remain unchanged. After rendering, opening the PNG with the viewing tool is mandatory before claiming the region was inspected.

The crop origin is the rendered image's upper-left corner. For an SVG whose viewBox starts at a negative or nonzero coordinate, its viewBox minimum maps to pixel zero; do not pass the raw geometry coordinate as though it were already an image offset.

## Freeze and later unblinding

Each batch writes `data/visual-judgments-<batch>.json` and a narrative review. Record exact inspected artifact paths and hashes, which manifest was read, whether detail crops were used, and that candidate identities and metrics remained unread.

After the JSON is frozen, a different analysis step may join it to the pairing key and numerical metrics. That step should preserve the original verdict, identify metric disagreements and false alarms, and document explanations separately. Heldout judgments must never be silently rewritten to improve agreement with scores or a selected policy.
