# Editorial corpus: findings and decisions

Draftably can produce useful diagrams from these references. Matching their deliberate design is
expensive, and closer resemblance does not always improve the explanation. The next work should
address text hierarchy, attached captions, semantic connection styles, and quiet containers.
Fix the confirmed dark-note contrast defect first. Keep the current sequence, cells, tree, and
short-pipeline defaults as controls.

This is a completed evaluation of a fixed baseline. Product fixes remain proposed work.

## Evidence

The [original study](assets-index.md) contains 30 real references from 22 independent publisher groups.
It covers 16 overlapping pattern families: 22 computing examples and eight adjacent examples.
Each case has a frozen default, a structural/style refinement, and a closest bounded native attempt.
Original media, attribution, rejected trials, logs, and full/detail comparisons are preserved.

The source baseline is `f14d9b891adba75de6cc172b190017ea5a5ca091`.
Pro used the uploaded snapshot. Codex replayed all attempts in this checkout with Node 22.21.1
and pnpm 11.9.0. All 360 local commands passed. All 90 geometry outputs and SVG files match
Pro's results exactly. PNG dimensions also match. PNG file bytes differ across the two environments;
the study does not infer pixel identity from equal geometry.

Codex inspected all 30 full comparisons and selected details. It verified decisive code claims
and checked the original Stripe, Go, and Chrome source pages. See [verification](verification.md).

## What the attempts show

| Measure                                  | Default v0 | Final v2 |
| ---------------------------------------- | ---------: | -------: |
| Median non-comment DSL lines             |       26.5 |       55 |
| Total non-comment DSL lines              |        953 |    1,880 |
| Total pins                               |          0 |      376 |
| Median reference fidelity, judged 1–5    |          2 |        3 |
| Median communication quality, judged 1–5 |          3 |        3 |
| Median semantic completeness, judged 1–5 |          4 |      4.5 |

Refinement improved communication in 18 cases, left ten unchanged, and lowered two.
Against the original references, six defaults were judged comparable and 24 worse. None was
judged better overall. These judgments concern a deliberately demanding selection, not all diagrams.

The Go slice preserves fields and the exact pointer target with little source. The React tree
establishes depth automatically. The TLS sequence and pixel pipeline are clear default explanations.
Those successes support keeping the semantic recipes concise.

The harder examples expose repeated authoring costs. Retry timing needs 15 pins and 15 sizes.
HTTP duplex links need paired directed edges. Figma checkpoint panels repeat geometry.
The agent cluster reaches 136 lines; the tram map reaches 164. Much of this extra source specifies
appearance and placement around largely unchanged content.

No attempt is claimed pixel perfect or rated publication-ready at 5/5. Some final sources remain
inferior to an earlier stage. The Double Diamond merges four phase objects into two labels.
The cell-cycle refinement splits Interphase membership. These losses remain explicit.

## Recommendation dispositions

The [gap audit](assets/pro-results/2026-11-01/gap-audit.md) supplies the per-case evidence and workarounds.
A common gap needs three cases from two independent publisher groups. G01–G08 meet that rule.
G09–G12 remain two-case stress findings. A category's recurrence does not prove every proposed
subfeature is common.

| ID                                                                   | Decision             | Reason                                                                                                 |
| -------------------------------------------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------ |
| G09: dark-note contrast                                              | Build first          | Both Vercel and NASA reproduce incompatible note foreground and surface colors.                        |
| G01: local text hierarchy                                            | Build                | Records, captions, and long prose repeatedly need distinct local roles.                                |
| G02: anchored labels/captions                                        | Build                | Existing label state needs native persistence; additive captions also need an explicit space contract. |
| G03: semantic connection styles                                      | Build                | Relation color and independent arrow ends carry meaning and can remove duplicate edges.                |
| G04: quiet retained containers                                       | Build                | Visual framing should be adjustable while preserving layout ownership.                                 |
| G11: record endpoint routing                                         | Build                | A reproduced pointer crosses the target title despite explicit side hints.                             |
| G12: fit diagnostic precision                                        | Explore, then decide | The visible warning is real, but a padding-policy warning is not automatically a clipping defect.      |
| G05: saved route controls                                            | Explore              | Waypoints exist internally; endpoint movement and coordinate ownership need a defined contract.        |
| G08: repeated panel geometry                                         | Explore              | First compare existing emphasis-state exports with the measured manual approach.                       |
| G06: curves and cyclic regions                                       | Explore separately   | Smooth paths, directed contours, and annular regions need different semantics.                         |
| G07: extra semantic shapes                                           | Explore selectively  | Each proposed outline appears once; the broad vocabulary gap does not prioritize each shape.           |
| G10: metric time                                                     | Explore              | Manual scaling works, but a shared time-axis recipe could reduce repeated arithmetic.                  |
| Exact fonts and pictorial terrain                                    | Defer                | Their fidelity cost is real; they are a larger product scope than the recurring controls.              |
| Reference backgrounds, status-color workarounds, scalar-score tuning | Avoid                | They conceal missing meaning or optimize the wrong target.                                             |

G12 is narrower here than Pro's Build recommendation. Preserve the existing safety rule until
its intended padding contract is clear. Explain the warning before relaxing any threshold.

## Limits and next step

The sources have varying reuse terms, including unknown terms. Attribution and observed notices
remain beside every reference. This study does not grant a blanket image license.

Authoring minutes were not measured. Edit resilience is assessed from source, not tested with a
controlled label-edit exercise. Some weak results reflect author choices or bounded effort.
They do not prove the best possible native reconstruction was found.

Review the [implementation plan](implementation-plan.md) before building. The first milestone is
the note contrast fix. Subsequent changes should distinguish improved defaults from reduced manual
source effort. Keep E06, E10, E16, E20, E28, and E30 as confirmation cases after design choices.

Pro conversation: [Create Editorial Corpus](https://chatgpt.com/c/6ae7ffd2-5bf0-83e9-abbf-5ab21e2395e4).
