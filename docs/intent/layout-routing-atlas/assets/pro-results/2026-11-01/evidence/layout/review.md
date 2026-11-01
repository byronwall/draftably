# Layout fixture validation and causal review

Baseline: `af70d8317797d5a522acffdd604819376a3ec893`.

## Result

**All190 positive layout fixtures compile, produce finite canonical coordinates, pass the actual CLI check without errors, and render to SVG through Draftably.** The ten defect reproductions were run separately and preserved, including expected current failures. Every one of335 files in the supplied source ZIP still has its original SHA256; no source member is changed or missing. Build/dependency directories are outside this source-integrity comparison.

`results.json` is the complete execution ledger. Every fixture has the command, exit status, elapsed wall time, metrics, diagnostic text, canonical geometry hashes, and SVG result. Raw inspect/check stdout and stderr plus per-file command records are under `logs/`, canonical JSON under `json/`, actual Draftably SVGs under `svg/`. Defect evidence is under `repros/`. `fixtures.csv` is the compact positive-fixture ledger. `sweeps.json` groups the measured results by visual ID and records equality. The source manifest was updated with final status, metrics, proof links, and warning counts.

Commands used, from the exact extracted baseline:

```sh
node dist-cli/main.js inspect path/to/example.draft --json --metrics
node dist-cli/main.js check path/to/example.draft --metrics
node dist-cli/main.js inspect path/to/example.draft --svg
```

The baseline CLI was already built and dependencies installed by root. Validation used Node24.22.1. No full suite, site proof, or screenshots were run by this subagent. SVG creation, XML presence, finite geometry, and diagnostic checks are verified here; root owns visual inspection of raster previews and the integrated atlas.

## Warnings are retained when they teach the control

Four positive fixtures have one compiler warning each:

| Fixture | Expected warning | Why it stays |
|---|---|---|
| `size-height-24.draft` | `text-overflow` | A fixed height too small for the long label demonstrates the failure case |
| `size-height-56.draft` | `text-overflow` | The statement default56 also cannot fit this label; compare heightauto |
| `stay-weight-1.draft` | `relaxed` | A low-weight stay yields34px under collision repair |
| `near-strength-prefer.draft` | `relaxed` | The requested48px relation yields to a fixed obstacle; required is a different outcome |

These are finite, renderable sources, not parser/geometry failures. `check --metrics` also adds drawing-quality warnings for crossings, aspect, detours, and similar tradeoffs. Across190 positives,66 fixtures have at least one check warning,91 warning lines in total. These quality warnings are recorded and should be shown as evidence; a clean atlas does not require every compared drawing to be an ideal drawing. All positive check exit statuses are0.

## Causal findings from the complete sweeps

Each comparison holds the source graph and labels fixed and changes only the named setting unless its manifest explicitly describes another experiment. “Same drawing” below means identical SVG after removing the embedded-source metadata, not merely similar dimensions.

| Family | Observed result | Required caption / implication |
|---|---|---|
| VL02 rank gap24/52/120 | Three distinct geometries; widths803/878/1077 | More rank space increases major-axis separation here; it is not a crossing optimizer |
| VL03 group gap24/48 | Identical drawings,1076×474 | Traffic/packing already supplies the lower separation; a smaller request cannot shrink it |
| VL03 group gap96/120/180 | All three identical,1172×474 | **Runtime confirms the packed96 cap**; values above it do not produce their requested separation |
| VL04 node gap8/24/64 | Three distinct geometries, heights422/450/530 | Sibling spacing interacts with ranked/tree extents |
| VL05 boundary pull0/65/100 | One crossing at0; zero at65/100; bounds1300×408,1393×658,1403×678 | Removing a crossing costs area; no universal winner |
| VL06 hierarchy sweeps1/2/4 | Distinct geometries, but all retain one crossing; route lengths2342/2422/2887 | More sweeps did not improve this fixture's measured route cost |
| VL07 edge length32/88/176 | Distinct; route lengths2873/2236/2544 | Preferred length is not routed length; the response is not monotonic |
| VL08 repulsion0/45/100 | Distinct; crossing counts0/1/0 | A stronger repulsion value does not mean every intermediate state is better |
| VL09 Directional flow strength0/65/100 | Distinct but at most2px node-coordinate change | A weak cold demonstration; retain it honestly and show the shared-objective supplement |
| VL09 Stress descent strength0/65/100 | Larger shared-direction effect, up to122px coordinate change between endpoints | This setting has shared solver behavior beyond the editor's primary algorithm controls; direction remains enabled at0 |
| VL10 alignment0/55/100 | Small node movement; route bends9/11/9 | Small geometric changes can alter routing. Warm repair remains the better mechanism explanation |
| VL11 compactness0/35/100 | Distinct; widths1379/1260/1258, heights296/296/318 | Compactness can trade width for height and alter crossings |
| VL12 grid strength0/45/100 | **All identical**,432×502 | Cold nodes already sit on their grid targets; a warm perturbed start is needed to reveal attraction strength |
| VL13 orderingstable/crossings | **Identical**,892×286 | Universal cold-file branch equivalence, not an unsuccessful screenshot choice |
| VL14 aspect0.75/1/1.333/1.6 plus omission | Same nine-node grid,432×502; aspect2 gives620×342 | Discrete column counts quantize target shapes; all supported states remain visible in source |
| VL15 foldauto/never |892×462 versus2620×182 | The compact automatic drawing has four bends and route length1932 versus zero bends and572 for the continuous chain |
| VL16 auto/right/down | Auto and right identical; down changes the drawing | Auto resolves right in the fixed file context |
| VL17 fit | Wide/slide share892×462; square/page/tall share492×722; omission stays244×1370 | Fit chooses among finite candidate layouts. There is no `fit=none` token: omission means no search |
| VL19 gap8 | Measured actual sibling gaps12 | The ordinary collision-repair minimum widens the requested8; cells are the appropriate touching layout |
| VL22 near prefer/required | Prefer leaves referencey0, targety72, actualgap16; required moves referencey−32, target staysy72, gap48 | A strengthened example makes the distinction visible without an impossible constraint or parser error |
| VL23 aligny prefer/required | Equal on a row already aligned in y | Do not call this a missing render; x alignment provides the nontrivial sibling example |
| VL24/VL26 coordinate controls | Different canonical coordinates can have identical individually autofitted SVGs | These need a shared world origin or coordinate overlay; do not infer a no-op from an autofitted picture |
| VL32 box/soft/none | Soft and none have equal canonical geometry but distinct SVGs | Geometry equality does not mean frame appearance is identical |
| VL33 per-group foldauto/omitted/never | Auto equals omission808×578; never552×1010 | Explicit group states are now present and clearly distinct from root recipe fold |
| VL41 box/pill | Same canonical geometry, different visible shape SVGs | Shape appearance and geometry are separate comparisons |
| VL42 diagram width160/800/1600 | Identical node/route geometry; SVG frame widths436/800/1600 | Width is a minimum output frame request and cannot squeeze existing content to160 |
| VL43 tree rootauto/top/left | Auto and top identical; left changes the forest | Automatic root already selects the source node in this case |

The full measurements, exact equality classes, diagnostics, and SVG fingerprints are in `sweeps.json`; this table is a reading guide, not a replacement ledger. File geometry hashes include nodes and routes. Visible-SVG hashes remove only the metadata source payload so that a different attribute line does not prevent detection of equal rendered output.

## Weak example repaired, and missing states added

The original near-strength pair had no obstruction, so prefer and required both achieved exactly the same relation. I retained its original source/JSON/SVG under `initial/` as evidence, then replaced only that pair with a reference, a target, and one fixed obstacle. The final examples differ only in strength. Prefer relaxes; required preserves the minimum gap by moving the unpinned reference. Both compile and render.

Thirty-two positive sources were added to the original158. The first eighteen addressed:

- Fit omitted and aspect omitted, so defaults are visible alongside all five named/numeric values.
- Explicit per-group foldauto and group-gap96/180 cap probes.
- Stress, force, and flow on one cyclic network with a disconnected node (VL44); tree and layered on one forest with a cross-link (VL45). These complement the root-owned fair ten-engine grouped comparison.
- Three stress flow-strength values to expose the shared objective behind the much smaller Directional flow cold response.
- Sequence participant-order change, independent of edge/message order.
- A paired cross-scope near example showing alignment to an inner endpoint while gap uses its enclosing group frame.
- Two nested pin examples showing that moving the parent changes the child's world position while its20,20 parent-content pin stays fixed.

The atlas therefore has exact sources for each supported finite categorical state in this layout inventory: all engine values in the root fair comparison; all ordinary recipes; all15 engine-parameter states/sweeps; auto/right/down; five fit targets plus omission; five file aspects plus omission; foldauto/never; framebox/soft/none; group foldauto/never/omission; all four near sides; both strengths; both alignment axes; bit/byte/ordinary cells; ruleron/off; node shapes plus the separate marker recipe; and the relevant order/phase/scope operations. `aspect=canvas` and warm-only effects remain editor recipes supplied by the editor audit, not invented file syntax.

## Defect reproduction results

| Repro | Actual outcome |
|---|---|
| `cells-fractional-columns` | Inspect/check exit1 with `Invalid array length` |
| `cells-fractional-span` | Inspect/check exit0 despite node widthnull; finite-coordinate proof fails |
| `sequence-empty-group` | Inspect/check exit0 despite group x/widthnull and13×13 metrics; finite-coordinate proof fails |
| `cells-ignored-ruler` | Invalid ruler and negative unit-width accepted silently without unit |
| `root-minima` | Root minima2000 accepted; actual bounds668×182 |
| `sequence-ignored-controls` | Accepted gap/direction/minima/pin do not control the final participant arrangement |
| `outside-tree-root` | Node outside selected scope accepted as root without an error |
| `scope-settings-a-first` / `scope-settings-b-first` | Reversing independent layout statements changes group B's width1064→776 and gap120→24 |
| `sequence-group-endpoint` | Accepted and rendered in canonical routing; semantic/visual policy still requires adjudication |

These are ten reproduction files, not ten expected nonzero exits. Only three currently fail the finite-geometry/command checks. The remaining cases demonstrate silent acceptance, scope interaction, or unclear semantics and should stay separate from the positive user examples.

## Rerunning the proof

`work/validate-layout-fixtures.py` runs the actual baseline CLI, checks every positive source and reproduction, and compares the baseline against the ZIP. It writes only under work. With no arguments it runs all; with source basenames it validates only those files and merges them into the existing ledger. This script is a review companion, not proposed permanent infrastructure with hard-coded scratch paths. For integration, replace its paths with package/test fixtures and keep the minimal finite-geometry plus registry/example coverage checks described in the implementation plan.

The final source manifest has190 unique filenames, and every one maps to a successful finite JSON and a real SVG. The publication gate should verify both that an ID has an example and that the example demonstrates the option or explicitly documents an observed no-effect context.


## Final QA supplements

Ten VL46 sources add the previously missing compare-panel operation, all panel directions, numeric aspect0.25/1.6/8, default labels/omission, and explicit-right no-effect cases. Four more sources expose bit/byte default column counts, a true span12 field crossing an8-column row, and omitted diagram width. The four positive alignment cases now use unequal dimensions. Every current190 positive source is revalidated in the ledger. Three separate warm starting sources and11 real native model SVG/JSON results are in `layout-warm-validation`, with exact options and UI recipes; a pin/alignment conflict is an explicitly expected diagnostic outside the happy-path counts.
