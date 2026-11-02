# Blinded routing review

Recorded: 2026-11-01T23:16:53.697674+00:00

Ten matched production image pairs were opened and inspected against `FEEL.md`. The reviewer saw only A/B labels, the named pair PNGs, the routing manifest, and the standing rubric. Engine/settings identities, trial rows, scores and the pairing key were not read. All verdicts below were recorded before unblinding. This is **one expert model’s assessment, not independent human validation**.

## Result

**3 A-better, 1 B-better, 6 same.** “Same” means no material tracing advantage at the reviewed size, not pixel identity. Severity is the between-candidate consequence: 0 none, 1 polish, 2 noticeable tracing/ownership cost, 3 misleading or hidden connection. Common defects are retained in the ledger even when the verdict is same.

| Pair | Verdict | Severity / confidence | Reason |
| --- | --- | --- | --- |
| P001 | same | 0 / 0.98 | The return and local retry remain clear in both images. A has square bends and B rounded bends; the visible style change does not change connection tracing for this case. |
| P002 | B-better | 3 / 0.99 | A sends the a-to-b connection behind both tall obstacle boxes, so a reader loses the connection through the middle. B takes a clear outer path and sends c-to-d through the central passage. The longer outer path is justified by avoiding hidden connections. |
| P003 | A-better | 1 / 0.96 | Both avoid the central obstacle, but B adds an extra sideways step immediately above a before reaching the top corridor. A has the simpler continuous exit and is easier to trace. |
| P004 | A-better | 2 / 0.98 | A keeps sources leaving right and targets receiving from the left, with a readable central crossing region. B replaces that organization with long loops around the outside, backward-facing exits and arrivals from several sides. The reduced visual crossing concentration is not worth the tracing detours. |
| P005 | same | 0 / 0.99 | Both show separated parallel request, audit and reply lines with the same apparent labels, endpoints and long a-to-d branch. No meaningful tracing difference is visible. |
| P006 | same | 0 / 0.95 | A spreads the three hub exits farther apart than B. Both remain symmetric, separated and immediately traceable to a, b and c; neither provides a material task advantage in this sparse fan. |
| P007 | same | 0 / 0.98 | Both keep the same clear fan-in, fan-out and second fan-in structure. The paths and spacing appear equivalent at the supplied review size, with labels and endpoints equally legible. |
| P008 | same | 0 / 0.91 | Both expose the read, write and extra-branch relationships in the same arrangement. Neither resolves the cramped write arrival along b’s left edge or the small blocker’s awkward label wrap. No material difference is visible. |
| P009 | A-better | 2 / 0.99 | A keeps “return inside group” attached to the short return loop. B shortens the connection to a straight line but leaves that label floating well above it. The small, clear loop is preferable to uncertain label ownership. |
| P010 | same | 0 / 0.98 | The connection pattern and label placements appear the same. Both remain traceable, but the two long top labels and “cancel pending” stand noticeably above their short straight lines; neither candidate improves this label-association cost. |

## Visual defect ledger

These are visual observations. No metric caught/missed designation has been assigned while blinded.

- **P002 A · severity 3 · routing-obstacle:** The horizontal a-to-b line disappears behind the left and right tall boxes; it reads as interrupted or connected to those obstacles.
- **P002 A · severity 2 · routing-detour:** The c-to-d line goes around the far right despite the visible passage between the two obstacles.
- **P003 B · severity 1 · routing-order:** An unnecessary small stair step above a interrupts an otherwise simple route around the blocker.
- **P004 B · severity 2 · routing-detour:** Several connections wrap around the entire outside of the six-node drawing.
- **P004 B · severity 2 · routing-ports:** a2 leaves toward the left margin and b0 receives a line from below; endpoint sides no longer consistently communicate left-to-right relationships.
- **P004 A · severity 1 · routing-clearance:** The middle crossing region is busy, but the halo breaks and consistent endpoint direction still permit tracing.
- **P008 both · severity 2 · routing-clearance:** The write line runs directly along b’s left border before its arrow arrives, weakening the distinction between connector and box outline.
- **P008 both · severity 1 · label-placement:** The blocker label breaks as “block” / “er” in a very narrow box.
- **P009 B · severity 2 · label-placement:** “return inside group” is separated from its straight b-to-a line and can read as a free annotation.
- **P010 both · severity 2 · label-placement:** Long labels above a-to-b, b-to-c and d-to-e are visually detached from the short lines they describe.

## What practical equivalence must preserve

- **Appearance can differ while task performance appears equivalent.** P001 changes corner treatment; P006 changes visible port spread. Neither changes the tracing verdict here. Path-only identity cannot mean identical appearance.
- **Fewer apparent crossings can produce worse tracing.** P004 favors the organized central crossings over long outside loops and inconsistent arrivals. The rubric’s detour warning is observable in this pair.
- **A shorter path can weaken label ownership.** P009 favors a modest loop that carries its label over a direct segment with a detached label.
- **Hard visibility failures overwhelm compactness.** P002 favors a longer visible path because the alternative disappears behind obstacles.
- **Same does not mean clean.** P008 and P010 preserve common routing/label defects in both candidates.

These statements validate the need to inspect component metrics and visual differences. They do not change frozen score weights or thresholds, and they do not assert agreement or disagreement with unseen trial data. Unblinding and metric comparison belong in a separate append-only analysis.

## Evidence

The manifest is `data/visual-manifest-routing.json`; machine-readable judgments and inspected-image hashes are `data/visual-judgments-routing.json`. Pair images are `renders/blinded/P001.png` through `P010.png`. Every pair uses the production SVG renderer and the unchanged repository screenshot command. No new layout or routing experiment was run for this review.
