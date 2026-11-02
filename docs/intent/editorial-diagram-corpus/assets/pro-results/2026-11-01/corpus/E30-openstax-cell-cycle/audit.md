# E30 audit · The cell cycle

## Outcome

Six labeled native nodes and two groups preserve the ordered phase sequence and daughter-cell text outcome. v0 is a strong clear schematic on its own merits. v1 adds meaningful colors. v2 attempts a circular arrangement with soft membership, but the Interphase tint splits into two pieces and the radial band/sector model remains absent. Greater visual imitation did not improve quality.

**v0 readability versus reference: comparable.** The default is a clear grouped phase sequence with an explicit cycle-return edge and daughter-cell outcome. It is comparable for reading phase order, while the source is substantially better at communicating continuous cyclic form and phase extent. The latter loss is reflected in semantic and fidelity scores.

The ratings are independent visual judgments: 1 means misleading/unreadable, 3 useful but visibly compromised, and 5 publication-ready. Fidelity scores resemblance and preservation of the source’s graphic mechanism; quality scores communication on the attempt’s own merits. A successful check is not a visual-quality rating.

| Stage | Quality | Fidelity | Semantics | Lines | Declarations | Layout/refinement | Pins | Sizes | Style attrs | Crossings |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| v0 | 4 | 2 | 3 | 16 | 14 | 1 | 0 | 0 | 0 | 1 |
| v1 | 4 | 2 | 3 | 24 | 14 | 3 | 0 | 0 | 30 | 0 |
| v2 | 3 | 2 | 3 | 36 | 14 | 14 | 6 | 6 | 30 | 0 |


## Independent dimensions

**Semantic completeness and correctness.** G₁ growth, S DNA synthesis, G₂ growth, mitosis, cytokinesis, and formation of two daughter cells are all represented. The reference’s daughter-cell result is a text label, not a cell illustration. Native groups preserve the intended membership in source, but the final rendered Interphase group is disconnected, with its title only by one component. The source’s continuous ring and narrow mitotic sector encode phase grouping and qualitative extent; no numerical duration is inferred or reproduced. A sequence graph alone does not fully preserve that spatial meaning.

**Composition, reading path and containment.** v0 groups the three interphase stages and two mitotic stages into tidy rectangles and puts the outcome beside them. v1 is wider and remains explicit. v2 pins the stages around a rough loop. Soft framing does not form a radial band; instead it separates G₂ from G₁/S, as the native soft-split information diagnostic reports. This is an observed consequence of the attempted composition, not a newly established soft-frame algorithm defect.

**Typography and label hierarchy.** The source has direct phase labels, an outer bracket and short leader lines to slim sectors. Native centered titles inside boxes are readable but cannot target the small physical sector independently. Subscripts are preserved in the Unicode phase names. The baseline’s clear heading and wrapping are strengths; exact source typeface matching is not necessary for useful phase ordering.

**Routes, arrowheads and annotations.** Native directed edges preserve cycle order and the outcome branch. Final manual ports give zero measured crossings. The source uses red circular arrows running in the outer band, plus black leaders and a red bracket. One native global connection style cannot represent that entire annotation system. Orthogonal corners rounded to 16 pixels do not become circular arcs.

**Color, contrast and finish.** Phase colors are approximately reproducible with four custom swatches. The source’s peach mitotic wedge and gray outer interphase band are geometric areas rather than colored boxes; hue matching cannot restore their meaning. The broken soft tint remains conspicuous in the final render.

## What is still missing

- No annular sectors, radial bands or phase-sized wedges.
- Interphase soft group is visibly split in v2; check reports this with one informational warning counted in metrics.
- No radial arrow path, sector leader lines or phase bracket.
- The outcome is retained as text; no daughter-cell illustration existed to reproduce.
- v2 quality is lower than the simpler default despite increased authoring effort.

These residuals separate native representational limits from authoring decisions. The preserved full reference and full native images remain the basis of comparison; detail crops do not replace them. No registered pixel-error score was calculated because graphic models and type layouts differ substantially.

## Effort and maintainability

**How nasty did the DSL become?** Moderate source cost, weak payoff. Six sizes and pins and six port pairs are understandable, but cannot express a continuous cyclic band. v0 is the most maintainable explanation of ordering. This held-out confirmation case supports testing future features, not choosing numerical routing or layout constants.

```draft
group interphase "Interphase" frame=soft
node g2 "G₂ · Cell growth" in=interphase color=g2color shade=100
size g2 width=220 height=80
pin g2 x=120 y=100
```

Predicted, not exercised: v0 automatic group sizing is more resilient to wording changes than final fixed boxes. v2 source group membership is unambiguous to an editor, but the rendered disconnected tint can mislead a reader. A future native radial grouping primitive would need semantic tests, not only prettier geometry.

Refinement cycles after the frozen default: **2**. Stopping reason: **unsupported primitive**. The initial v0 SHA-256 still matches its freeze record: **true**. v1 is retained as the intermediate attempt; there were no discarded native render cycles.

Authoring time was **not measured**. `effort.json` records exact statement/attribute counts and measured command elapsed times. Pins, sizes, appearance attributes and explicit endpoint choices are visible in native source. Command duration is not an estimate of drawing labor. Label-edit resilience above is predicted, not tested.

## Execution evidence and source-grounded limits

- `v0`: `../../logs/E30-openstax-cell-cycle/v0/20261102T032040163923Z/`; all four final commands exited 0; metrics warnings: 0.
- `v1`: `../../logs/E30-openstax-cell-cycle/v1/20261102T032146529335Z/`; all four final commands exited 0; metrics warnings: 0.
- `v2`: `../../logs/E30-openstax-cell-cycle/v2/20261102T032635494581Z/`; all four final commands exited 0; metrics warnings: 1.

The commands were the unchanged baseline CLI `check`, `inspect --json --metrics`, `inspect --svg`, and supplied `pnpm shoot`. The `comparison.png` sheet uses the supplied `shoot --sheet`. The comparison shows complete content at proportional equal column width; it does not equalize letter size or conceal mismatches. The original file is actual downloaded media, documented in [source.md](source.md).

`src/dsl/syntax.ts::ModelObject.frame` provides soft/none alternatives to the box frame. `docs/DSL.md` under Soft groups explicitly describes split tints and the lack of a layout/position of their own. `src/dsl/frame.ts` and `src/cli/svg.ts::outline` do not provide annular sectors; `ModelEdge` does not provide curved annotations or separate leaders/brackets.

Primary source: https://openstax.org/books/biology-2e/pages/10-2-the-cell-cycle. Observed license: **CC BY-NC-SA 4.0**; details and attribution are in `source.md`. This is a reserved confirmation case; its audit informs coverage but its measurements are not used to choose numerical tuning values.
