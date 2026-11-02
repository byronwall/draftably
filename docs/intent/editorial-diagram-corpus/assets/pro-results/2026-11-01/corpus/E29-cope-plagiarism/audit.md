# E29 audit · Plagiarism in a submitted manuscript

## Outcome

The native attempts capture the substantive editorial decision process with 24 roles and 29 relationships. Muted semantic colors and manual four-branch composition make v2 recognizable, reducing measured crossings from five to one. The result remains a useful but visibly compromised process chart, with condensed wording and less typographic hierarchy.

**v0 readability versus reference: worse.** The default carries a large amount of usable decision content, but dense boxes and longer multi-line titles slow scanning relative to the original’s icons, balanced branches and separated prose. Five measured crossings add ambiguity.

The ratings are independent visual judgments: 1 means misleading/unreadable, 3 useful but visibly compromised, and 5 publication-ready. Fidelity scores resemblance and preservation of the source’s graphic mechanism; quality scores communication on the attempt’s own merits. A successful check is not a visual-quality rating.

| Stage | Quality | Fidelity | Semantics | Lines | Declarations | Layout/refinement | Pins | Sizes | Style attrs | Crossings |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| v0 | 3 | 2 | 4 | 57 | 53 | 1 | 0 | 0 | 0 | 5 |
| v1 | 3 | 3 | 4 | 63 | 53 | 2 | 0 | 0 | 46 | 3 |
| v2 | 3 | 3 | 4 | 112 | 53 | 51 | 24 | 24 | 46 | 1 |


## Independent dimensions

**Semantic completeness and correctness.** Evidence gathering, severity/redundancy/minor-copying/no-problem branches, author response, nonresponse, explanations, rejection/revision, institution escalation and reviewer feedback remain. Long guidance text is paraphrased; examples such as where to search current author affiliations and named unresolved-case authorities are shortened into broader wording. This is not an exact procedural substitute for the preserved COPE flowchart. The side-note policy requirement is retained. Source terminal and branch icons are omitted, but their textual meanings remain.

**Composition, reading path and containment.** v0 produces a compact vertical decision spine with return corridors; it is usable without manual placement. v1 adds restrained concern/satisfactory/terminal colors. v2 places four severity branches on one row and separates the author-response and institutional escalation paths. It does not reproduce the source’s side title/credit column, icon-centered junctions, or explanatory prose outside the route marks. More coordinates would yield diminishing gains without the missing label/icon roles.

**Typography and label hierarchy.** Default wrapping handles long prose without clipping. The source mixes a tall side title, small captions, emphasized phrases and dark uppercase terminal labels; native node text uses one principal style. The manual v2’s wider canvas makes body type smaller at equal display width, an authoring tradeoff. Exact source typography is not claimed. A separate annotation attached to an icon is different from treating the whole paragraph as a node.

**Routes, arrowheads and annotations.** Final measured crossings fall to one. Long escalation and return paths remain, but the source also has deliberately long paths; length alone is not a defect. The primary mismatch is where routes meet small pictograms while prose sits beside them. Native routes connect to the bounds of the long prose boxes. No hidden hand-drawn curves or overlays were added.

**Color, contrast and finish.** Custom muted purple, pale green and deep teal reproduce the main semantic family. Source purple/green branch text sits on white and some negative actions use solid purple; the native attempt uses pale filled boxes for consistent readability. This deliberate styling choice is not by itself a missing feature. Inline emphasis and icon appearance are the unsupported pieces.

## What is still missing

- Long source guidance is paraphrased; exact wording and some examples are in the preserved original.
- No icon-centered route nodes with separately anchored multiline captions.
- No side title/credit composition or source logo.
- Mixed font weight/size and inline emphasis are flattened.
- One final measured crossing; manual layout requires review after wording changes.

These residuals separate native representational limits from authoring decisions. The preserved full reference and full native images remain the basis of comparison; detail crops do not replace them. No registered pixel-error score was calculated because graphic models and type layouts differ substantially.

## Effort and maintainability

**How nasty did the DSL become?** High. Twenty-four manual sizes and pins plus a long order line increase cost substantially over the already-useful default. The explicit IDs make the workflow intelligible, but every wording change may need another layout review. The source is verbose because the real process is verbose; that part is legitimate content cost.

```draft
node ask "Write to corresponding author with evidence and the signed originality statement"
size ask width=260 height=auto
pin ask x=0 y=750
routing crossing-penalty=900 corner-radius=10 passes=5
```

Predicted, not exercised: most final boxes use height=auto, so modest label edits should retain legibility. Pins do not adapt neighboring positions, and the four-branch row may need spacing work after longer phrasing. The semantic graph is easier to maintain than the manually matched composition.

Refinement cycles after the frozen default: **2**. Stopping reason: **diminishing returns**. The initial v0 SHA-256 still matches its freeze record: **true**. v1 is retained as the intermediate attempt; there were no discarded native render cycles.

Authoring time was **not measured**. `effort.json` records exact statement/attribute counts and measured command elapsed times. Pins, sizes, appearance attributes and explicit endpoint choices are visible in native source. Command duration is not an estimate of drawing labor. Label-edit resilience above is predicted, not tested.

## Execution evidence and source-grounded limits

- `v0`: `../../logs/E29-cope-plagiarism/v0/20261102T032034009195Z/`; all four final commands exited 0; metrics warnings: 0.
- `v1`: `../../logs/E29-cope-plagiarism/v1/20261102T032140267149Z/`; all four final commands exited 0; metrics warnings: 0.
- `v2`: `../../logs/E29-cope-plagiarism/v2/20261102T032632173568Z/`; all four final commands exited 0; metrics warnings: 0.

The commands were the unchanged baseline CLI `check`, `inspect --json --metrics`, `inspect --svg`, and supplied `pnpm shoot`. The `comparison.png` sheet uses the supplied `shoot --sheet`. The comparison shows complete content at proportional equal column width; it does not equalize letter size or conceal mismatches. The original file is actual downloaded media, documented in [source.md](source.md).

`src/model/labels.ts::nodeLabel` has a model-side detached mode and leader flag, but native source does not expose those settings. `src/dsl/syntax.ts::ModelObject` does not support rich text or images. `src/model/fonts.ts::FACES` and appearance roles constrain the available type system; the exact COPE face is not promised.

Primary source: https://publicationethics.org/guidance/flowchart/plagiarism-submitted-manuscript. Observed license: **CC BY-NC-ND 4.0**; details and attribution are in `source.md`. This case belongs to the development/evaluation subset.
