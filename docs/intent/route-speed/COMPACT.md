# Compact routing on resize · #715

The compact grid passed all 360 primary and confirmation resizes. At 60 lines its median was 68.0 ms on the primary set and 66.1 ms on confirmation. Across all 540 resizes, weighted cost improved on 523, tied on 6 and increased on 11. The grid produced zero shared pixels between unrelated lines on every frame. The reserved set missed the all-frame quality target. Its worst loss was 6.03%.

## What changed

A caller with fixed left or right row ports can pass `route({ ...graph, resize: 'compact' }, previous)`. The first call can be an ordinary full route. The compact path requires full quality, unlabelled lines between rectangular cards, and a previous result from the same runtime. Switching back to guarded reuse starts with the ordinary full router. The previous result alone still selects guarded reuse.

The checkpoint charged eight times the usual price for every shared grid segment. This discouraged unrelated lines from stacking, but it also punished several lines leaving the same card through one port. They took long detours, and moving them individually could lock in the arrangement. The revised search charges the usual price for sharing between lines with a common card. All lines still pay the normal parallel-lane and crossing penalties.

The grid tests a straight or two-bend connection alongside its search result. For unrelated shared runs, it tests a sideways move of a half or full lane. At a port it preserves the terminal stub. Every accepted path must reach the original row, have valid terminal directions, clear the inflated obstacles and avoid self-intersection. Before returning, the router checks the rounded drawing against the cards.

On 13–32 lines it revisits the eight most expensive lines after their neighbors have moved. It tries the ordinary router’s line search and shorter elbows. Above 32 lines it uses one grid sweep. On up to 12 lines it compares the compact drawing with a fresh full route because a single extra crossing can dominate the score. The 10-line timings include this full computation. A grid above 120,000 cells or a failed geometry check uses ordinary routing. All cutoffs depend on geometry or counts.

## Diagnosis at the checkpoint

I replayed `11c13e7c` and traced the initial full search, improve, repair, nudge, tidy and centre. For each loss, I compared complete drawings and substituted each fresh line into the compact drawing on its own. This identifies affordable single-line changes and cases that needed several lines to move together. Row ports were fixed throughout.

- **Sparse fans.** On 10/102/4, the grid saved 24 shared pixels but added two crossings and four bends. Full improve found a two-bend path for `use7`. Substituting any single fresh line failed to lower the grid’s total. Rebuilding a fan in reverse order and restarting an empty grid both reduced some sparse losses. Neither cleared the set. The small-graph comparison covers these cases.
- **Long detours.** On 30/104/6, substituting full improve’s four-point `rel4` alone saved 955 cost units. On 30/401/11, full’s initial search drew `use23` straight. The checkpoint gave it four bends. Direct connections and the targeted second pass address these detours.
- **Displaced lanes.** On 10/103/8, full tidy’s placement of `use5` saved 560 units when substituted alone. On 60/101/11, full nudge’s `use31` saved 1,191. Pricing a common terminal correctly lets neighbors occupy their intended lanes.
- **Unrelated sharing.** On 60/101/10 and 60/101/11, `use25` and `use59` coincided for 12 and 10 px. On 60/403/10, the checkpoint added 60 px of unrelated sharing. Moving a run, keeping the port fixed and checking the full pairwise overlap removed these losses.

Each row below is one checkpoint frame that failed either test. Deltas are relative to a fresh full route. The full-search phase names the first stage that produced the indicated final line coordinates. The two primary criteria flagged 13 cases across 12 distinct frames. The confirmation set had another 13 distinct frames.

| Lines / seed / step | Checkpoint cost Δ | Revised cost Δ | Unrelated px Δ, checkpoint → revised | Cause visible in the full and compact drawings                                   |
| ------------------- | ----------------: | -------------: | -----------------------------------: | -------------------------------------------------------------------------------- |
| 10/102/4            |           +208.00 |              0 |                              +0 → +0 | Two extra crossings in the shared fan. Full improve straightened use7.           |
| 10/103/6            |           +115.58 |        -502.00 |                              +0 → +0 | Two extra crossings. Full’s initial use4 had two fewer bends.                    |
| 10/103/7            |           +199.58 |        -482.00 |                              +0 → +0 | The two crossings persisted. Full tidy shifted rel0.                             |
| 10/103/8            |           +211.58 |        -472.00 |                              +0 → +0 | Full tidy moved use5 to a lower-cost lane.                                       |
| 30/104/5            |           +486.52 |      -3,336.66 |                              +0 → +0 | The grid added 19 crossings. Full tidy’s use28 had 14 fewer bends.               |
| 30/104/6            |         +1,113.52 |      -5,973.84 |                              +0 → +0 | Full improve removed four bends on rel4.                                         |
| 30/104/11           |           +811.02 |     -10,636.32 |                              +0 → +0 | The grid added 5,412 px. Full’s initial rel11 had ten fewer bends.               |
| 30/105/8            |         +1,786.70 |      -9,090.88 |                              +0 → +0 | The grid added 2,624 px and five crossings. Full nudge repositioned use18.       |
| 30/105/9            |           +546.20 |     -14,302.14 |                              +0 → +0 | The grid added 1,912 px and seven crossings. Full improve shortened rel7.        |
| 60/101/10           |           +443.00 |     -12,952.06 |                             +12 → +0 | The use25/use59 collision and a 22-bend rel5 detour.                             |
| 60/101/11           |        -13,960.80 |      -9,811.70 |                             +10 → +0 | The same unrelated pair still shared 10 px. Full nudge repositioned use31.       |
| 60/101/12           |         +1,545.82 |     -10,630.00 |                            -23 → -33 | Long outer runs. Full began with a straight use51 and tidy shortened use45.      |
| 30/401/10           |         +1,602.96 |      -8,910.30 |                             +13 → +0 | Full began with straight rel1 and use23. Compact also overlapped use24 and rel7. |
| 30/401/11           |         +5,497.62 |      -6,818.22 |                              +0 → +0 | The grid carried 90 extra bends. Full drew use23 straight.                       |
| 30/401/12           |         +5,935.18 |      -4,787.24 |                              +0 → +0 | The compressed fan retained 60 extra bends after re-expansion.                   |
| 30/402/8            |           +159.16 |      -6,899.92 |                              +0 → +0 | Length and bends outweighed three fewer crossings. Full improve shortened rel5.  |
| 30/403/10           |         +1,420.52 |      -5,487.96 |                              +0 → +0 | Full improve found a lower-cost track for rel9.                                  |
| 30/403/11           |           +528.70 |      -5,708.98 |                              +0 → +0 | Full improve removed six bends from rel8.                                        |
| 30/404/7            |           +893.44 |        -667.68 |                              +0 → +0 | Full tidy drew use19 with two fewer bends.                                       |
| 30/404/11           |         +2,332.86 |      -1,580.40 |                              +0 → +0 | The same use19 detour persisted after re-expansion.                              |
| 30/405/9            |         +4,680.88 |      -7,825.90 |                              +0 → +0 | The grid added 84 bends and 17 crossings. Full improve simplified rel3.          |
| 30/405/10           |           +199.84 |     -11,891.54 |                              +0 → +0 | The grid added 82 bends. Full drew rel8 straight.                                |
| 60/401/10           |        -16,092.98 |     -29,659.00 |                              +3 → +0 | Unrelated use31 and use29 coincided for 3 px.                                    |
| 60/403/10           |        -36,640.84 |     -52,824.46 |                            +60 → -39 | Three unrelated pairs added 60 px. Full drew rel21 with two bends.               |
| 60/405/10           |         +5,176.84 |     -13,236.92 |                            -22 → -49 | The grid took 19,356 extra pixels. Full nudge repositioned rel21.                |

## Replay results

Each frame received the preceding call’s result. A separate process routed the identical new card positions from scratch. Each row covers five seeds and twelve resizes. The score is the engine’s `total()`. Unrelated shared length counts pairs with no common endpoint card. The replay also checks every line for blocked status, row position and card penetration.

### Primary and confirmation

| Set          | Lines | Mean cost, fresh → compact | Cost better / tied / worse | Mean unrelated px, fresh → compact | Sharing better / tied / worse |
| ------------ | ----: | -------------------------: | -------------------------: | ---------------------------------: | ----------------------------: |
| Primary      |    10 |      17,736.91 → 16,965.14 |                 57 / 3 / 0 |                        0.00 → 0.00 |                    0 / 60 / 0 |
| Primary      |    30 |    140,037.81 → 126,527.30 |                 60 / 0 / 0 |                        2.98 → 0.00 |                    8 / 52 / 0 |
| Primary      |    60 |    588,142.95 → 550,806.53 |                 60 / 0 / 0 |                       19.12 → 0.00 |                   36 / 24 / 0 |
| Confirmation |    10 |      17,956.42 → 16,713.89 |                 60 / 0 / 0 |                        0.00 → 0.00 |                    0 / 60 / 0 |
| Confirmation |    30 |    124,529.65 → 115,730.62 |                 60 / 0 / 0 |                        0.27 → 0.00 |                    1 / 59 / 0 |
| Confirmation |    60 |    584,298.82 → 549,212.66 |                 60 / 0 / 0 |                       32.00 → 0.00 |                   34 / 26 / 0 |

| Set          | Lines | Compact median / p95 / max (ms) | Fresh median / p95 / max (ms) |
| ------------ | ----: | ------------------------------: | ----------------------------: |
| Primary      |    10 |            74.5 / 128.5 / 218.5 |            45.9 / 68.1 / 75.2 |
| Primary      |    30 |           100.1 / 174.2 / 407.6 |         310.0 / 442.4 / 486.7 |
| Primary      |    60 |            68.0 / 107.6 / 140.1 |   1,716.8 / 2,152.4 / 2,414.3 |
| Confirmation |    10 |              55.6 / 82.4 / 84.0 |           51.7 / 89.8 / 103.7 |
| Confirmation |    30 |             69.6 / 90.5 / 110.5 |         318.7 / 391.7 / 460.1 |
| Confirmation |    60 |            66.1 / 100.5 / 167.8 |   1,811.8 / 2,432.8 / 2,883.0 |

### Reserved seeds and dimensions

I committed seeds 701–705 and the twelve pitches and widths at `a0ab29eb` before running them. The algorithm was frozen at `a25c1b7e` before opening this set. The pitch spans 230–414 px and the width spans 176–272 px. The previous sets spanned 270–360 px and 200–240 px. The initial geometry was the same 320 px pitch and 220 px width in all three sets.

| Set      | Lines | Mean cost, fresh → compact | Cost better / tied / worse | Mean unrelated px, fresh → compact | Sharing better / tied / worse |
| -------- | ----: | -------------------------: | -------------------------: | ---------------------------------: | ----------------------------: |
| Reserved |    10 |      15,594.56 → 14,885.76 |                 57 / 3 / 0 |                        0.00 → 0.00 |                    0 / 60 / 0 |
| Reserved |    30 |    128,182.47 → 118,336.68 |                 56 / 0 / 4 |                        1.10 → 0.00 |                    3 / 57 / 0 |
| Reserved |    60 |    550,520.87 → 531,037.05 |                 53 / 0 / 7 |                       18.50 → 0.00 |                   24 / 36 / 0 |

| Set      | Lines | Compact median / p95 / max (ms) | Fresh median / p95 / max (ms) |
| -------- | ----: | ------------------------------: | ----------------------------: |
| Reserved |    10 |              44.3 / 58.9 / 69.0 |           42.7 / 55.8 / 101.7 |
| Reserved |    30 |              64.5 / 81.4 / 84.7 |       345.8 / 637.5 / 1,122.9 |
| Reserved |    60 |             53.0 / 71.4 / 116.6 |   1,963.6 / 3,300.3 / 4,784.1 |

Times are synchronous wall time for the packaged public call, including validation, local repairs and any fresh fallback. Each row excludes the five initial calls. P95 is the nearest rank.

### Remaining frames

11 frames failed at least one quality check. Each percentage uses that frame’s fresh drawing cost as the denominator. All 18,000 line instances reached their assigned rows and cleared the cards.

| Set      | Lines / seed / step | Pitch / width | Fresh cost | Compact cost |     Cost Δ | Cost Δ as % of fresh | Unrelated px, fresh → compact |
| -------- | ------------------- | ------------: | ---------: | -----------: | ---------: | -------------------: | ----------------------------: |
| Reserved | 60/705/10           |     312 / 204 | 594,251.02 |   630,081.04 | +35,830.02 |              +6.029% |                         0 → 0 |
| Reserved | 60/705/3            |     414 / 272 | 561,396.06 |   586,624.70 | +25,228.64 |              +4.494% |                        35 → 0 |
| Reserved | 60/701/11           |     382 / 252 | 465,844.58 |   477,705.40 | +11,860.82 |              +2.546% |                        33 → 0 |
| Reserved | 30/701/6            |     258 / 192 | 102,403.18 |   104,703.28 |  +2,300.10 |              +2.246% |                         0 → 0 |
| Reserved | 60/705/1            |     374 / 244 | 593,803.60 |   604,622.48 | +10,818.88 |              +1.822% |                         7 → 0 |
| Reserved | 30/705/10           |     312 / 204 | 126,908.86 |   128,868.56 |  +1,959.70 |              +1.544% |                         0 → 0 |
| Reserved | 30/701/9            |     254 / 186 |  99,513.68 |   100,971.36 |  +1,457.68 |              +1.465% |                         0 → 0 |
| Reserved | 30/703/10           |     312 / 204 | 121,484.26 |   122,763.12 |  +1,278.86 |              +1.053% |                         0 → 0 |
| Reserved | 60/701/6            |     258 / 192 | 524,247.74 |   528,918.78 |  +4,671.04 |              +0.891% |                         0 → 0 |
| Reserved | 60/702/6            |     258 / 192 | 495,029.62 |   498,203.48 |  +3,173.86 |              +0.641% |                        12 → 0 |
| Reserved | 60/705/11           |     382 / 252 | 598,242.76 |   600,853.98 |  +2,611.22 |              +0.436% |                         0 → 0 |

Seed 705, step 10 was the largest percentage and absolute loss. The pitch reopened from 254 to 312 px and the card width grew from 186 to 204 px. The compact drawing added 14,534 px of line, 272 bends and 88 crossings. It reduced lane deficit by 1,391.11, but the extra crossings alone cost 31,680. Both drawings had zero unrelated shared length. Three losing frames occurred at 312 px pitch and 204 px width, back inside the primary range after narrower layouts. The right panel shows the long detours around the last two columns.

![Fresh and compact routes for the worst reserved frame](../../../tmp/compact-grid/wide/worst-comparison.png)

The algorithm stayed frozen after this replay.

## What the drawings show

On the original 60/101/10 loss, fresh cost 617,101.56 and the revised grid cost 604,149.50. Both have zero unrelated shared length. The lower total comes with a visible tradeoff. Compact drew 684 bends against 472 fresh and 683 crossings against 654. Its lane deficit fell from 15,437.42 to 12,614.75. Across the five primary dense schemas, compact averaged 675 bends versus 477 fresh. The right panel shows several longer paths around the outside cards.

![Fresh full route and compact resize on primary seed 101 at step 10](../../../tmp/compact-grid/primary-comparison.png)

## Verification and reproduction

- `pnpm check` passed, including `pnpm test:engines` and the build. The unit suite passed 1,199 tests and skipped 41. The engine parity report matched the branch base `e8a820b5` byte for byte across 320 comparisons. The geometry and brush reports matched after excluding their elapsed times.
- `pnpm bench:fresh` matched all four base digests across five runs per case. In benchmark order they were `cfffb78d`, `29e578cc`, `1171cc8e` and `4053b61c`. `pnpm bench:route` passed on all six size and quality combinations, with zero blocked lines.
- All 180 ordinary public results matched the branch base byte for byte. This covered 10, 30 and 60 lines, five seeds, omitted quality, auto, quick and full. Each combination checked an initial call, a changed layout and a guarded resize with the previous result. [Comparison log](../../../tmp/compact-grid/parity.log)
- The default diagram audit tied on all 429 renders with zero render errors. The weighted gate passed. It warned that the existing issue score stayed flat. [Audit](../../../tmp/compact-grid/audit/compare.md) · [Coverage](../../../tmp/compact-grid/audit/coverage.md)

```sh
pnpm bench:route:resize --compact
pnpm bench:route:resize --compact --holdout
pnpm bench:route:resize --compact --wide
pnpm bench:route:resize --compact --picture --frame=60/101/10
pnpm shoot --sheet tmp/compact-grid/primary-comparison.png --cols 2 --size 2100x1100 \
  'Fresh full route::tmp/compact-grid/fresh.svg' 'Compact resize::tmp/compact-grid/reuse.svg'
```

To reproduce the worst reserved screenshot, replay its full history before capturing the two panels.

```sh
pnpm bench:route:resize --compact --wide --picture --frame=60/705/10
pnpm shoot --sheet tmp/compact-grid/wide/worst-comparison.png --cols 2 --size 2100x1100 \
  'Fresh full route::tmp/compact-grid/wide/fresh.svg' 'Compact resize::tmp/compact-grid/wide/reuse.svg'
```

Each set writes its fresh reference and per-frame results under `tmp/compact-grid/`. Confirmation uses `heldout/` and the reserved set uses `wide/`. A replay writes the per-frame JSON and exits nonzero if any frame fails either quality check.
