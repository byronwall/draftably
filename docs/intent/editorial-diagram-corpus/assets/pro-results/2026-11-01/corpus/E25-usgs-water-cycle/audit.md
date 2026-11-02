# E25 audit · The Water Cycle

## Outcome

Twenty named water pools/use sites and thirty generalized transfers form an editable schematic. Manual placement reduces measured crossings from 30 to 7 and roughly restores atmosphere, land, surface water and subsurface zones. It remains a semantic reduction of a physical cutaway, not a complete water-cycle recreation.

**v0 readability versus reference: worse.** The source uses geographic location, elevation, ocean depth and terrain to explain the system. The default box graph discards that context and introduces 30 measured crossings. Explicitly labeled transfers are useful, but do not compensate for the physical model loss.

The ratings are independent visual judgments: 1 means misleading/unreadable, 3 useful but visibly compromised, and 5 publication-ready. Fidelity scores resemblance and preservation of the source’s graphic mechanism; quality scores communication on the attempt’s own merits. A successful check is not a visual-quality rating.

| Stage | Quality | Fidelity | Semantics | Lines | Declarations | Layout/refinement | Pins | Sizes | Style attrs | Crossings |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| v0 | 2 | 1 | 2 | 55 | 50 | 1 | 0 | 0 | 0 | 30 |
| v1 | 2 | 1 | 2 | 60 | 50 | 1 | 0 | 0 | 46 | 11 |
| v2 | 3 | 2 | 2 | 101 | 50 | 42 | 20 | 20 | 46 | 7 |


## Independent dimensions

**Semantic completeness and correctness.** The source depicts a continuous landscape, water stored in different phases, varied local fluxes, water quality, human use and climate effects. Native nodes preserve the principal names, but edges are a conceptual interpretation of distributed visual transfers, not an exact digitization of every pictured arrow. For example, assigning water-supply arrows to a single river node generalizes local surface/groundwater access shown in the landscape. Footer explanations are condensed to three notes. Terrain, groundwater layering, recharge geometry, soil porosity, ocean-depth continuity and repeated local evaporation/precipitation fields are not preserved. Permafrost is retained as a named store rather than inventing an unsupported explicit transfer.

**Composition, reading path and containment.** v0 compresses all meanings into a crowded ranked graph. v1 adds meaningful colors and more vertical space but cannot reconstruct landform. v2 pins atmosphere at the top, ice/snow upslope, river and use sites in the middle, ocean and groundwater below. These choices recover broad zones while retaining a conspicuously schematic network. The large footprint was partly author-chosen to keep thirty labeled edges apart; small publication-scale type is not solely a renderer defect.

**Typography and label hierarchy.** Names are readable in the full native image. The source distinguishes pool labels, italic flux labels and extensive explanatory prose; native bold node titles and uniformly styled edge labels flatten those roles. Repeated small physical-process labels cannot be attached to arbitrary terrain locations without introducing extra layout objects or fixed annotation controls.

**Routes, arrowheads and annotations.** Seven measured final crossings remain, despite placement and a stronger crossing penalty. The source uses localized short directional marks and broad transport cues rather than a single global edge network. Native orthogonal arrows force unrelated flows through shared rectangular corridors. Reduced crossings are a useful improvement but not a valid proxy for scientific completeness.

**Color, contrast and finish.** Pale blue and teal nodes distinguish fresh/atmospheric/frozen stores from saline or mixed stores; neutral human-use boxes and a legend help. The source highlights the actual water area/volume on a pale terrain drawing. A colored box cannot reproduce that meaning. Source texture and phase-specific motifs are absent.

## What is still missing

- No geographic cutaway, continuous terrain, layered groundwater/ocean regions or physical surface geometry.
- Generalized graph transfers are not an exact transcription of every local flux in the source.
- Footer prose and water-quality/climate explanations are condensed.
- No repeated field-of-arrows motifs or variable-width/physical-flow paths.
- Seven final measured crossings; publication-width labels remain small.

These residuals separate native representational limits from authoring decisions. The preserved full reference and full native images remain the basis of comparison; detail crops do not replace them. No registered pixel-error score was calculated because graphic models and type layouts differ substantially.

## Effort and maintainability

**How nasty did the DSL become?** High and low reward. Twenty sizes and twenty pins, plus thirty edge labels and global routing settings, still produce a diagram with substantially less meaning than the source. The graph itself is understandable; maintaining a physical layout and its many routes would be laborious.

```draft
edge e18 ground -> ocean "Groundwater discharge" constraint=false
size ground width=200 height=auto
pin ground x=1050 y=1060
routing crossing-penalty=900 corner-radius=8 passes=5
```

Predicted, not exercised: width=200 with height=auto protects node text better than fixed heights, but pinned neighboring objects do not move to accommodate growth and long edge labels may collide. No claim of edit resilience was validated.

Refinement cycles after the frozen default: **2**. Stopping reason: **unsupported primitive**. The initial v0 SHA-256 still matches its freeze record: **true**. v1 is retained as the intermediate attempt; there were no discarded native render cycles.

Authoring time was **not measured**. `effort.json` records exact statement/attribute counts and measured command elapsed times. Pins, sizes, appearance attributes and explicit endpoint choices are visible in native source. Command duration is not an estimate of drawing labor. Label-edit resilience above is predicted, not tested.

## Execution evidence and source-grounded limits

- `v0`: `../../logs/E25-usgs-water-cycle/v0/20261102T032009731383Z/`; all four final commands exited 0; metrics warnings: 0.
- `v1`: `../../logs/E25-usgs-water-cycle/v1/20261102T032119880733Z/`; all four final commands exited 0; metrics warnings: 0.
- `v2`: `../../logs/E25-usgs-water-cycle/v2/20261102T032614154357Z/`; all four final commands exited 0; metrics warnings: 0.

The commands were the unchanged baseline CLI `check`, `inspect --json --metrics`, `inspect --svg`, and supplied `pnpm shoot`. The `comparison.png` sheet uses the supplied `shoot --sheet`. The comparison shows complete content at proportional equal column width; it does not equalize letter size or conceal mismatches. The original file is actual downloaded media, documented in [source.md](source.md).

`src/dsl/syntax.ts::DslShape` omits images and has no physical-region or field primitive. `ModelEdge` represents one relationship and label, without width/color/curve controls. `src/cli/svg.ts::outline` supports the fixed native shape vocabulary. These limits are distinct from the author’s generalized hydrological model.

Primary source: https://www.usgs.gov/media/images/water-cycle-png. Observed license: **Public Domain**; details and attribution are in `source.md`. This case belongs to the development/evaluation subset.
