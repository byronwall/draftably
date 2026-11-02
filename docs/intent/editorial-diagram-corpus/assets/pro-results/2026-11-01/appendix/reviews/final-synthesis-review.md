# Final synthesis consistency review

**Scope:** final factual review of `report.md`, `gap-audit.md` and `effort-audit.md` against the current source, ratings, effort and diagnostic records. The generated reports were not edited. This review follows the more detailed capability-boundary review in `appendix/independent-plan-review.md` and does not reopen the recommendation design.

## One factual discrepancy reported

At the reviewed version, the E27 source-nastiness paragraph in `effort-audit.md` says “fifteen explicit port pairs.” The actual retained `corpus/E27-emf-butterfly/v2.draft` has **14** edges with explicit endpoint sides. Each has both `from` and `to`, for **28 endpoint-side assignments**. The effort table correctly reports 14 port lines. The prose originates in E27's `review.json` field `dsl_nastiness`; the generator input should be corrected before the reports are rebuilt. This is a descriptive count correction and requires no native-source or render change.

The already-known model-cells source-path typo and historical-audit path correction were being handled by the primary report author and are not additional findings from this review.

## Checks that agree

- All 30 main-report case rows match the current v0/v1/v2 quality ratings, final fidelity/semantic ratings and v2 non-comment line counts.
- All 30 per-case effort rows match `effort.csv`, including stage lines, declarations, layout/refinement counts, pins, dimensions, port lines and cycle counts.
- All 57 gap/case cost rows match the current v2 effort data. Every authored gap capability boundary, classification, severity, workaround, cost interpretation, proposed proof and risk appears unchanged in the generated gap audit.
- Stage effort totals and medians match: non-comment lines 953/1,146/1,880; medians 26.5/30.5/55; declarations 814/824/839; layout/refinement 85/154/884; final pins 376; dimensional lines 0/19/441; and port lines 0/27/180. The nineteen v1 dimensions are note widths.
- Rating medians match: quality 3/3/3, fidelity 2/2.5/3, semantics 4/4/4.5. Quality improves in 18 cases, is unchanged in ten and falls in two. Final quality has fourteen 4s and sixteen 3s. First-render readability has six comparable and 24 worse, with the named six cases correct.
- Refinement and stopping counts match: seventeen two-cycle cases, thirteen three-cycle cases; thirteen unsupported-primitive, eight effort-limit, eight diminishing-return and one good-enough stop.
- The 27 cases within the principal-object 5–30 range and the three exceptions are correct. The candidate trail's 39 records split into 30 accepted, six rejected, two not selected and one superseded acquisition.
- The final 18 literal warnings consist of sixteen text-overflow warnings and two edge-through-title warnings. E30's separate soft-split message is informational, as the report explains.

The generated synthesis preserves the necessary source boundaries: existing internal labels/leaders/waypoints versus missing native persistence; additive captions versus primary labels; state/compare panels versus arbitrary editorial scenes; quiet frame semantics versus retained layout scope; and intentional interior-cell crossings versus the narrower endpoint defects. It keeps authoring errors, two-case stress evidence, visible confirmation cases and unexecuted implementation proposals explicit. No additional concrete factual discrepancy was found in those claims.

## Integration disposition

The root integrator corrected E27's review and per-case audit prose to fourteen explicit port pairs and regenerated the effort audit. The cells module citation and historical-audit file path were also corrected in the report generator. No native source changed and no rerender was needed.
