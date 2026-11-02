# E24 audit · How do we decide if El Niño conditions are present?

## Outcome

This is the strongest adjacent native recreation. The final native file keeps all three tests, both evidence explanations and the common negative outcome, and recovers the reference’s diagonal progression. It is useful on its own and substantially resembles the source. Four compact-diamond fit warnings remain visible and documented after the allowed third refinement cycle.

**v0 readability versus reference: worse.** The default remains logically readable, but oversized yes/no diamonds and narrow multi-line evidence ellipses turn a compact diagonal chart into a long portrait. It requires far more scanning than the original.

The ratings are independent visual judgments: 1 means misleading/unreadable, 3 useful but visibly compromised, and 5 publication-ready. Fidelity scores resemblance and preservation of the source’s graphic mechanism; quality scores communication on the attempt’s own merits. A successful check is not a visual-quality rating.

| Stage | Quality | Fidelity | Semantics | Lines | Declarations | Layout/refinement | Pins | Sizes | Style attrs | Crossings |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| v0 | 3 | 2 | 5 | 25 | 23 | 1 | 0 | 0 | 0 | 0 |
| v1 | 3 | 3 | 5 | 31 | 23 | 2 | 0 | 0 | 35 | 0 |
| v2 | 4 | 4 | 5 | 54 | 23 | 25 | 11 | 11 | 35 | 0 |


## Independent dimensions

**Semantic completeness and correctness.** All 11 objects and 12 logical connections are represented. Wording is shortened, but the monthly anomaly threshold, persistence over several seasons, weakened Walker circulation, central-Pacific wetness and Indonesian dryness are retained. Yes and no remain distinct intermediate nodes because the source deliberately uses separate decision marks.

**Composition, reading path and containment.** The automatic v0/v1 stacks are much taller than the reference. v2 pins the three questions down a diagonal stair, gathers negative branches at lower left and places the positive result at lower right. A third-cycle compaction reduces the first v2’s excessive whitespace. This is a manual solution to a deliberate editorial composition, not evidence that the automatic layout is defective for all decision trees.

**Typography and label hierarchy.** The final question/evidence labels are readable and wrap into short lines. The baseline does not expose separate scale/weight spans for the reference’s emphasized threshold and atmospheric phrases. Centered text and one face remain. The 52-pixel yes/no diamonds visibly contain their short words, but check emits four text-overflow warnings; the measure function requires at least a 40-pixel wrapping width plus line height and padding. Do not report this final file as warning-free.

**Routes, arrowheads and annotations.** The graph is crossing-free in all stages. Final explicit sides reduce measured bends from 19 to 5 and preserve the common negative collector. Stroke weight, double outlines, flattened diamonds and exact arrowhead proportions differ. No arbitrary saved bends were used.

**Color, contrast and finish.** Custom charcoal, pale gray and pale pink families reproduce the source’s meaningful distinction well. The source’s thin inner white keylines around dark panels and its mixed bold/red atmospheric phrase are not reproduced. Those finish differences are lower priority than the reading path.

## What is still missing

- Four text-overflow warnings on final 52-pixel yes/no diamonds; visible words remain inside the outlines.
- Native diamonds are square, whereas source yes/no marks are flatter.
- No inline weight/color emphasis or panel double outlines.
- Manual placement and fixed heights reduce resilience to longer labels.

These residuals separate native representational limits from authoring decisions. The preserved full reference and full native images remain the basis of comparison; detail crops do not replace them. No registered pixel-error score was calculated because graphic models and type layouts differ substantially.

## Effort and maintainability

**How nasty did the DSL become?** Moderate. Eleven sizes, eleven pins and explicit ports on all twelve edges are required to recover the stair. Three complete custom swatches are verbose for a small palette. The source is readable, but a diagram that is visually simple has accumulated substantial geometry.

```draft
edge e11 insufficient -> nope from=bottom to=bottom
size n1 width=52 height=52
pin n1 x=0 y=10
size persistent width=260 height=94
pin persistent x=280 y=130
```

Predicted, not exercised: longer decision or evidence wording can break fixed heights. The compact diamonds already trigger fit warnings. Width/height=auto could improve resilience but would change the carefully placed reference composition.

Refinement cycles after the frozen default: **3**. Stopping reason: **effort limit**. The initial v0 SHA-256 still matches its freeze record: **true**. Earlier rejected/failed v2 files and rationale are retained in `trials/`.

Authoring time was **not measured**. `effort.json` records exact statement/attribute counts and measured command elapsed times. Pins, sizes, appearance attributes and explicit endpoint choices are visible in native source. Command duration is not an estimate of drawing labor. Label-edit resilience above is predicted, not tested.

## Execution evidence and source-grounded limits

- `v0`: `../../logs/E24-noaa-enso/v0/20261102T032005662687Z/`; all four final commands exited 0; metrics warnings: 0.
- `v1`: `../../logs/E24-noaa-enso/v1/20261102T032114913677Z/`; all four final commands exited 0; metrics warnings: 0.
- `v2`: `../../logs/E24-noaa-enso/v2/20261102T032915145039Z/`; all four final commands exited 0; metrics warnings: 4.

The commands were the unchanged baseline CLI `check`, `inspect --json --metrics`, `inspect --svg`, and supplied `pnpm shoot`. The `comparison.png` sheet uses the supplied `shoot --sheet`. The comparison shows complete content at proportional equal column width; it does not equalize letter size or conceal mismatches. The original file is actual downloaded media, documented in [source.md](source.md).

`src/model/labels.ts::diamondMeasure` reserves DIAMOND_PAD=6 and requires width>=40; this explains why a short centered label can look contained while the requested small diamond is flagged. `src/dsl/syntax.ts::ModelObject` has no per-label font-size or rich-text fields; `docs/DSL.md` states that a diamond stays square.

Primary source: https://www.climate.gov/media/15232. Observed license: **unknown**; details and attribution are in `source.md`. This case belongs to the development/evaluation subset.
