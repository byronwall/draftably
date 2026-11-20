# Issue sweep baseline — main at 927f0839 (2026-11-20)

This is the base for every heuristic PR in the sweep of byronwall/draftably #586–#608, and for
the combined result at the end of the sweep. It is a measurement only: no review ledger, no
fixes.

- **Code:** main at `927f0839` (#584).
- **Script:** metric version 6 ([RUBRIC.md](../RUBRIC.md#automatic-metrics-scriptsdiagram-auditmjs)):
  round 5's script plus `edge-on-node-border`, `off-center-gap`, `edge-through-title` and
  `non-facing-ports`.
- **Sets:** corpus (15 diagrams, 45 renders), heldout (11 diagrams, 23 renders), examples (32),
  issues (24 reproductions, [issues/](../issues/)).

Reproduce, and compare the end of the sweep against it:

```bash
pnpm audit:compare --base 927f0839 --gate=flat     # main against itself: every rule PASS, issues WARN
pnpm audit:compare --base 927f0839 --gate=flat --shots  # the combined result, with compare sheets
```

## Mean defect index

| Set      | Renders | Mean DI (v6) | Same renders, v5 metrics only |
| -------- | ------- | ------------ | ----------------------------- |
| corpus   | 45      | 8.47         | 7.91                          |
| heldout  | 23      | 9.20         | 8.67                          |
| examples | 32      | 10.83        | 10.08                         |
| issues   | 24      | 9.07         | 8.00                          |

The v5 column removes the four new metrics' weight, so it compares with round 5's corpus 8.2 and
held-out 5.8. Held-out has grown from 10 to 23 renders since round 5.

## Gate, main against itself

| Rule                                                         | Result | Evidence                   |
| ------------------------------------------------------------ | ------ | -------------------------- |
| Hard defects: no new instance                                | PASS   | –                          |
| Mean DI: corpus rises ≤ 0.05                                 | PASS   | 8.47 → 8.47 (0)            |
| Mean DI: heldout rises ≤ 0.05                                | PASS   | 9.20 → 9.20 (0)            |
| Mean DI: examples rises ≤ 0.05                               | PASS   | 10.83 → 10.83 (0)          |
| Mean DI: issues falls                                        | WARN   | 9.07 → 9.07 (0), unchanged |
| Each issue kind (corpus+heldout+examples) rises ≤ max(1, 5%) | PASS   | –                          |
| Each render worsens ≤ 1.0 DI                                 | PASS   | –                          |

## Issue kinds

Counts per set. "Guarded" is corpus + heldout + examples, the sum that the per-kind gate rule
checks.

| Kind                   | Corpus | Heldout | Examples | Issues | Guarded |
| ---------------------- | ------ | ------- | -------- | ------ | ------- |
| arrives-below          | 3      | 3       | 2        | 0      | 8       |
| back-edge              | 45     | 16      | 18       | 2      | 79      |
| crossing               | 32     | 24      | 20       | 9      | 76      |
| edge-hugs-node         | 62     | 64      | 45       | 33     | 171     |
| edge-in-slot           | 12     | 6       | 8        | 4      | 26      |
| edge-near-group-border | 24     | 10      | 34       | 18     | 68      |
| edge-on-group-border   | 5      | 0       | 2        | 9      | 7       |
| edge-on-node-border    | 4      | 1       | 0        | 4      | 5       |
| edge-through-group     | 0      | 0       | 5        | 1      | 5       |
| edge-through-title     | 0      | 0       | 2        | 2      | 2       |
| edges-too-close        | 0      | 2       | 0        | 0      | 2       |
| empty-area             | 20     | 7       | 14       | 6      | 41      |
| empty-band             | 7      | 2       | 5        | 2      | 14      |
| expectation-failed     | 11     | 6       | 0        | 0      | 17      |
| group-staircase        | 1      | 1       | 2        | 1      | 4       |
| hook                   | 2      | 5       | 11       | 2      | 18      |
| jog                    | 5      | 4       | 0        | 0      | 9       |
| label-beside-line      | 0      | 0       | 5        | 0      | 5       |
| label-detached         | 6      | 0       | 0        | 0      | 6       |
| label-near-node        | 6      | 5       | 1        | 0      | 12      |
| label-on-edge          | 1      | 1       | 0        | 0      | 2       |
| label-on-group-border  | 12     | 0       | 2        | 1      | 14      |
| label-on-group-title   | 0      | 0       | 0        | 1      | 0       |
| label-through-text     | 2      | 0       | 0        | 2      | 2       |
| labels-too-close       | 0      | 0       | 1        | 0      | 1       |
| long-edge              | 14     | 15      | 12       | 10     | 41      |
| low-contrast           | 0      | 4       | 2        | 0      | 6       |
| many-bends             | 26     | 24      | 19       | 9      | 69      |
| node-overlap           | 0      | 0       | 2        | 2      | 2       |
| non-facing-ports       | 7      | 4       | 7        | 5      | 18      |
| off-axis-port          | 7      | 4       | 13       | 9      | 24      |
| off-center-gap         | 13     | 7       | 6        | 3      | 26      |
| padding-varies         | 4      | 1       | 1        | 3      | 6       |
| ragged-bends           | 20     | 16      | 10       | 4      | 46      |
| sparse-group           | 4      | 0       | 2        | 1      | 6       |
| tight-group-gap        | 0      | 0       | 3        | 3      | 3       |
| uneven-channel         | 11     | 10      | 10       | 2      | 31      |
| uneven-group-gap       | 14     | 1       | 10       | 7      | 25      |
| uneven-padding         | 5      | 1       | 6        | 2      | 12      |
| uneven-ports           | 3      | 2       | 0        | 2      | 5       |
| wide-aspect            | 0      | 0       | 7        | 0      | 7       |

## Issue reproductions

The defect index and issues of each reproduction at the base. [issues/README.md](../issues/README.md)
says which kind measures each issue.

| Reproduction              | DI   | Issues                                                                                                                                                                                                   |
| ------------------------- | ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| i586-cells-exit           | 3    | edge-on-group-border, edge-on-node-border                                                                                                                                                                |
| i586-frame-right-port     | 3    | edge-on-group-border, edge-on-node-border                                                                                                                                                                |
| i586-perpendicular-exit   | 9    | edge-through-group, edge-on-node-border, tight-group-gap ×2, long-edge                                                                                                                                   |
| i587-label-hides-routes   | 18.3 | many-bends, edge-hugs-node ×3, edge-near-group-border, edge-in-slot, uneven-channel, off-axis-port, label-through-text ×2, empty-band                                                                    |
| i588-upward-column        | 2    | edge-in-slot, back-edge ×2                                                                                                                                                                               |
| i589-group-fill-crossing  | 0    | –                                                                                                                                                                                                        |
| i590-header-to-header     | 15   | many-bends, edge-hugs-node ×3, edge-near-group-border ×2, off-center-gap, uneven-group-gap, hook, long-edge, empty-area                                                                                  |
| i590-table-header-entry   | 2    | off-axis-port ×2                                                                                                                                                                                         |
| i591-column-insets        | 4    | uneven-padding, padding-varies                                                                                                                                                                           |
| i592-two-groups-feed      | 4    | uneven-group-gap, empty-area                                                                                                                                                                             |
| i594-group-frame-arrows   | 3    | uneven-ports, empty-band                                                                                                                                                                                 |
| i595-gap-center           | 2    | edge-near-group-border, off-center-gap                                                                                                                                                                   |
| i596-bottom-center-port   | 8    | edge-hugs-node ×4, edge-on-group-border, off-axis-port ×2, long-edge                                                                                                                                     |
| i597-sibling-alignment    | 24   | many-bends ×2, edge-hugs-node ×5, edge-near-group-border ×2, edge-in-slot ×2, off-center-gap, non-facing-ports, uneven-padding, group-staircase, tight-group-gap, uneven-group-gap, empty-area, crossing |
| i599-port-swap-crossing   | 20   | many-bends ×3, edge-hugs-node ×4, uneven-channel, ragged-bends, uneven-ports, uneven-group-gap, long-edge, empty-area, crossing ×7                                                                       |
| i601-down-detour          | 8    | edge-hugs-node, edge-near-group-border, non-facing-ports ×2, off-axis-port ×2                                                                                                                            |
| i601-straight-chain       | 0    | –                                                                                                                                                                                                        |
| i602-forward-exit         | 14   | many-bends, edge-hugs-node ×5, edge-near-group-border ×3, uneven-group-gap, hook, long-edge                                                                                                              |
| i603-soft-group-seams     | 26   | node-overlap ×2, edge-hugs-node, edge-on-group-border, edge-on-node-border, sparse-group, long-edge                                                                                                      |
| i604-title-stroke         | 6.9  | edge-near-group-border ×4, edge-on-group-border, edge-through-title, uneven-group-gap                                                                                                                    |
| i605-fold-branch-crossing | 8.5  | edge-near-group-border ×4, edge-on-group-border, edge-through-title, uneven-group-gap, long-edge, crossing                                                                                               |
| i606-facing-ports         | 12   | edge-hugs-node, non-facing-ports, ragged-bends, padding-varies ×2, off-axis-port, empty-area                                                                                                             |
| i607-label-soft-heading   | 16   | edge-hugs-node ×2, edge-on-group-border ×3, non-facing-ports, ragged-bends, label-on-group-title, label-on-group-border, long-edge, empty-area                                                           |
| i608-detour-vs-crossing   | 9    | many-bends, edge-hugs-node ×4, ragged-bends, off-axis-port, long-edge ×2                                                                                                                                 |

## Not measured

- #589 and #603 are rendering defects (group fill at a crossing, seams between soft-group
  pieces). Check them by eye on the compare sheet.
- #588, #597 (partly), #601 (`i601-straight-chain`) and #605 ask for an advisory or an arrangement
  offer, not a different default drawing. Their PRs prove themselves with a `check` test.
- #593, #598 and #600 have no layout to measure.
