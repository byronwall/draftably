# Configuration findings

**Measured development results, with final reporting status.** The tables in this document come from the development-only analyzer, which runs no layout or routing algorithm. They have not been recomputed using heldout outcomes. A nondefault value changing a drawing is sensitivity, not evidence that it improves the drawing. The routing configurations below were selected on development and sealed at 2026-11-01T23:58:46.719982+00:00. They remain evaluated alternatives, not a new shipped default. The completed development crossed experiment is in `context-findings.md`; frozen heldout routing confirmation is reported separately in `heldout-routing-findings.md`.

## Completed trial accounting

| File | Read rows | Planned rows | Analysis state |
| --- | ---: | ---: | --- |
| settings-routing | 984 | 984 | complete |
| interactions-routing | 432 | 432 | complete |
| settings-layout | 756 | 756 | complete |
| interactions-layout | 96 | 96 | complete |
| settings-warm | 444 | 444 | complete |

The routing setting file contains 600 fixed-position scalar trials (24 shared defaults plus 12 × 2 × 24 alternatives), 144 history/edit trials, and 240 explicit-port trials. The six 3 × 3 interaction grids add 432 trials on eight predeclared fixtures each. These are correlated experimental runs, not independent users or 1,416 independent diagrams.

## All twelve route controls

“Changed” means at least one alternative differs from its same-fixture default by more than 1 px under the contract comparator: identical object IDs, side identities and route-point sequence lengths, coordinate checks on boxes, and Euclidean distance at corresponding route points. Exact hashes and rounded-bin hashes are retained separately in the raw comparison table. Rounded-bin equality is not treated as the tolerance test. Representative counts use deterministic default-first matching because tolerance is not mathematically transitive.

| Control | Default | Alternatives | Changed / 24 | Port pair changed / 24 | Any valid gain | Default-valid fixture harmed by some level | Local oracle mean balanced gain* |
| --- | ---: | --- | ---: | ---: | ---: | ---: | ---: |
| clearance | 10 | 4, 22 | 22 | 13 | 1 | 7 | 1.692 |
| portGap | 16 | 6, 28 | 16 | 8 | 0 | 0 | 0.581 |
| edgeGap | 16 | 8, 32 | 18 | 10 | 0 | 0 | 0.455 |
| bendPenalty | 32 | 0, 80 | 18 | 17 | 0 | 0 | 1.256 |
| crossingPenalty | 360 | 0, 900 | 9 | 7 | 0 | 0 | 0.360 |
| sharedPenalty | 8 | 0, 16 | 0 | 0 | 0 | 0 | 0.000 |
| parallelPenalty | 18 | 0, 48 | 6 | 5 | 0 | 0 | 0.789 |
| portStability | 20 | 0, 100 | 1 | 1 | 0 | 0 | 0.041 |
| fanoutPenalty | 50 | 0, 120 | 1 | 1 | 0 | 0 | 0.000 |
| passes | 3 | 1, 5 | 4 | 2 | 0 | 0 | 0.170 |
| cornerRadius | 6 | 0, 12 | 0 | 0 | 0 | 0 | 0.000 |
| standoff | 20 | 0, 40 | 21 | 11 | 0 | 0 | 0.114 |

*The local oracle selects the best of the same three tested levels separately on each fixture, restricted to comparisons with valid default and valid winner. It is an upper bound; it is neither an implemented selector nor a global retuned policy. Level-by-level signed score, route length, crossing, bend, label and hard-defect changes are in `control-comparisons.csv`.

The source inventory supplies allowed ranges and normalization: the source parser rejects invalid values, while the raw settings normalizers clamp numeric values and round integer effort. All tested levels are within those declared ranges. The row tables retain the requested level and the actual normalized `routingSettings` in original trial records. No range-clamping boundary experiment is claimed here.

| Source attribute | Normalizer/source bounds | Default |
| --- | --- | ---: |
| clearance | 4–30 | 10 |
| port-gap | 6–28 | 16 |
| edge-gap | 4–48 | 16 |
| bend-penalty | 0–100 | 32 |
| crossing-penalty | 0–1200 | 360 |
| shared-penalty | 0–20 | 8 |
| parallel-penalty | 0–60 | 18 |
| port-stability | 0–150 | 20 |
| fanout-penalty | 0–160 | 50 |
| passes | 1–5, integer rounded | 3 |
| corner-radius | 0–16 | 6 |
| standoff | 0–40 | 20 |

### Appearance and hidden activity

`cornerRadius` changes no measured polyline geometry on 24 fixtures, but changes the production SVG path strings on 23/24. That is measured rendering sensitivity, not a finding that square or rounded corners are preferred. Preserve it as Appearance, outside route optimization.

`portStability` has two histories. The initial search can use explicit previous-route sides, while improvement passes call the search with their current route as `old`. The latter can activate the coefficient even when external history is empty (`routing-engine.js`, first pass near line 1231; repair call near line 1329). Therefore “no external history” does not imply “coefficient unused.”

| History after same small edit | Cases | Changed over 1 px | Valid gains from tested levels |
| --- | ---: | ---: | ---: |
| routing-edited-empty-prior | 24 | 2 | 0 |
| routing-edited-shared-prior | 24 | 3 | 0 |

All shared-history candidates receive the same original route-side state. No candidate seeds the next candidate. Empty-history and shared-history outputs are compared within their own edited-input strata. A change in stability coefficient may trade route quality against fewer side changes; raw edit metrics preserve that distinction.

## Interactions and conditional value

| Interaction | Fixtures | Rows | Conditional-only cases by factor | Joint material gains beyond either one-factor change |
| --- | ---: | ---: | --- | ---: |
| crossingPenalty*bendPenalty | 8 | 72 | crossingPenalty: 3; bendPenalty: 0 | 0 |
| clearance*standoff | 8 | 72 | clearance: 5; standoff: 4 | 2 |
| edgeGap*parallelPenalty | 8 | 72 | edgeGap: 0; parallelPenalty: 2 | 1 |
| portGap*fanoutPenalty | 8 | 72 | portGap: 0; fanoutPenalty: 0 | 0 |
| sharedPenalty*passes | 8 | 72 | sharedPenalty: 0; passes: 0 | 0 |
| portStability*crossingPenalty | 8 | 72 | portStability: 1; crossingPenalty: 0 | 0 |
| aspect*fold | 4 | 24 | aspect: 0; fold: 0 | 0 |
| rankGap*nodeGap | 4 | 36 | rankGap: 0; nodeGap: 0 | 0 |
| boundaryPull*hierarchySweeps | 4 | 36 | boundaryPull: 1; hierarchySweeps: 1 | 1 |

A conditional-only count means one tested factor level tied its default within 1 px when the other factor was at default, but diverged when the other factor changed. It is sensitivity evidence, not automatically quality value. “Joint material gain” requires a valid result that improves balanced defect score by more than one per-ten-edge score unit beyond the best tested single-axis result on that same fixture. Numeric second differences and adverse combinations are preserved in `control-interactions.json`.

The port-stability × crossing grid uses the edited geometry with shared external history; it is not pooled with unchanged, empty-history routing. Other grids cover only eight fixtures. Their unobserved sixteen fixture outcomes are never filled in, so partial combinations cannot become a global policy by missing-data advantage.

## Three numeric routing policies for the crossed development stage

Selection exhaustively searches all size-three portfolios among the 25 configurations observed on every fixed fixture: current defaults plus two alternatives for each of twelve controls. It first maximizes union hard-valid coverage, then practical acceptable case × weighting coverage, then minimizes mean oracle regret. Each case is checked under balanced, traceable and direct weights; a soft improvement cannot cover a hard failure. Choosing among the portfolio is an oracle upper bound, not an automatic runtime choice.

| Policy | Exact changes from all current defaults |
| --- | --- |
| clearance-22 | {"clearance":22} |
| clearance-4 | {"clearance":4} |
| portGap-28 | {"portGap":28} |

The selected three cover 23/24 fixtures with at least one hard-valid result and 63/72 acceptable fixture–weighting combinations. The complete 25-configuration pool covers 23/24 hard-valid fixtures and 69/72 acceptable combinations. Unresolved fixtures remain failures. They are not removed from the denominator.

The precise defaults, full twelve-number configuration for each proposal, size-one/two/three curve, family-weight sensitivity and half/double equivalence bands are in `routing-policy-proposal.json`. Its development-selected values are now sealed in `data/policy-freeze.json`, alongside the selected crossed-layout global policy and three-combination set. That completed development comparison and the heldout evaluation remain separate evidence strata. No configuration was selected again from heldout results. Single-run routing milliseconds are descriptive only and should not be used as a latency ranking; repeated timing is a separate stage.

### Leave-one-control-out result contract

`control-routing-ablations.json` compares three views of each removed coefficient: (1) selected portfolio entries that use it are replaced by defaults without other retuning; (2) exhaustive retuning to three policies from the remaining fully observed settings, with the same three-policy budget; and (3) the complete tested pool with that control fixed to its default. Loss witnesses cite original trial IDs. A surviving replacement shows redundancy within this grid and objective, not that the implementation or authored override is universally useless. Appearance-only corner rounding and history conditions are preserved outside that narrow numerical quality claim.

## Explicit ports

The file contains 24 default automatic-versus-authored pairs and 12 exhaustive sixteen-side-pair fixtures. Each sixteen-pair grid varies the nominated single edge (e0), with all other sides automatic; it is not an exhaustive all-edge port assignment search. Authored side violations are checked as hard constraints. The best explicit side pair can be compared against the best tested numeric route result, but fixtures whose source already forces sides must not be called an unrestricted automatic optimum. Full rows and this restriction are in `control-port-overrides.json`.

## Source and warm settings

Completed source and warm strata are analyzed independently. Cold source ordering is not a proxy for warm ordering; source `fit` search is not the raw engine aspect target; protected objects and scope are invocation semantics.

| Stratum | Control | Planned cases | Cases with comparable geometry | Changed over 1 px | Valid gain | Baseline-valid harmed |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| source-cold | rankGap | 12 | 11 | 10 | 0 | 1 |
| source-cold | groupGap | 12 | 12 | 5 | 0 | 1 |
| source-cold | nodeGap | 12 | 10 | 6 | 0 | 0 |
| source-cold | boundaryPull | 12 | 11 | 9 | 0 | 0 |
| source-cold | hierarchySweeps | 12 | 11 | 4 | 0 | 0 |
| source-cold | edgeLength | 12 | 10 | 7 | 0 | 0 |
| source-cold | repulsion | 12 | 11 | 11 | 0 | 0 |
| source-cold | flowStrength | 12 | 11 | 10 | 0 | 0 |
| source-cold | alignment | 12 | 10 | 2 | 0 | 0 |
| source-cold | compactness | 12 | 10 | 9 | 0 | 0 |
| source-cold | gridStrength | 12 | 12 | 10 | 0 | 0 |
| source-cold | ordering | 12 | 11 | 0 | 0 | 0 |
| source-cold | fold | 12 | 12 | 7 | 0 | 0 |
| source-cold | aspect | 12 | 12 | 11 | 0 | 0 |
| source-cold | rootId | 12 | 10 | 10 | 0 | 0 |
| source-cold | direction | 12 | 10 | 10 | 0 | 0 |
| source-cold | fit | 12 | 12 | 10 | 0 | 0 |
| source-cold | gap | 12 | 12 | 11 | 0 | 2 |
| source-cold | min-width | 12 | 11 | 0 | 0 | 0 |
| source-cold | min-height | 12 | 11 | 0 | 0 | 0 |
| raw-warm | maxMove | 12 | 12 | 10 | 0 | 1 |
| raw-warm | stability | 12 | 12 | 9 | 0 | 0 |
| raw-warm | iterations | 12 | 12 | 7 | 0 | 0 |
| raw-warm | respectDirection | 12 | 12 | 8 | 0 | 0 |
| raw-warm | respectManual | 12 | 12 | 10 | 0 | 0 |
| raw-warm | growContainers | 12 | 11 | 10 | 0 | 2 |
| raw-warm | ordering | 12 | 12 | 4 | 0 | 0 |
| raw-warm | maxIterations | 12 | 12 | 7 | 0 | 0 |
| raw-warm | scope | 12 | 11 | 9 | 0 | 9 |
| raw-warm | fixedIds | 12 | 12 | 10 | 0 | 0 |

## Completed source-control replacement ablation

The separate G-stage adds **336 actual production-pipeline trials**. For each of the 15 public source engine attributes, it fixes that input to its default and retunes one other consumed attribute on the same 12 relevant bases and engine. The before/after configuration budgets match: three for numeric/root/aspect controls, two for boolean/categorical controls with only two distinct choices. The source sensitivity table above is unchanged; this later development stage asks whether another control can compensate for the removed choice.

The strongest balanced-score losses are `nodeGap` and `flowStrength`. After bounded replacement tuning, acceptable-base counts fall from **10/12 to 3/12** when node gap is fixed and rank gap is retuned, and from **9/12 to 4/12** when flow strength is fixed and rank gap is retuned. These are net count changes; the witness ledger separately identifies eight and seven formerly acceptable bases lost, because another base can improve at the same time. A generalized Spacing preset may simplify disclosure, but it cannot justify deleting these distinct source parameters.

Aggregate equality also conceals local losses. Retuning around `edgeLength`, `repulsion`, or `alignment` recovers the same balanced acceptable count while losing the named `networks-03`, `cycles-04`, or `dags-01` witness. Retuning around `groupGap` improves the aggregate acceptable count but introduces one new hard-invalid base relative to the selected before policy. The traceable weighting still loses one acceptable base when hierarchy sweeps are fixed. Therefore no scalar deletion follows merely from the balanced aggregate.

Root, fold, aspect, and ordering have semantic or execution-context conditions. Keep root/format/folding intent; keep the warm ordering implementation even though the cold equality witness supports hiding the inactive cold presentation. The four intent/context rows are reported for transparency and are not treated as interchangeable automatic quality requests.

Full before/fixed-default/retuned counts, every signed score and hard-validity loss, replacement levels, exact trial IDs, and all three weightings are in `layout-control-ablation.md` and `data/analysis/layout-control-ablations.json`. Final `inventory.csv` and `inventory-final.json` join this evidence to the same stable recommendation IDs. All 15 source parameters and all 12 router parameters remain available in the implementation/source; the recommendation reduces routine disclosure, not the language's expressive capability.

## Limits and reproducibility

These fixed fixtures were built to exercise mechanisms and include deliberately difficult authored geometry. They do not estimate real-user frequencies. No significance claim is made from correlated scalar settings. Soft scores omit some appearance and typography judgments, so witness renders remain necessary. Inputs, hashes, counts, exact comparisons, per-level summaries, interaction details and selected configurations are downloadable alongside this text. The first terminal row is canonical for each distinct trial; later accidental attempts cannot improve coverage or selection. The manifest retains all attempt statuses, and every canonical successful archive is checked against that first row’s exact geometry hash before analysis.

Replay: `python evaluation/analyze-controls.py` from the delivered bundle, or the corresponding path from its parent. The script only opens its five development input names and refuses rows marked heldout. It never invokes a product engine. Source defaults and ranges remain in `inventory-source.json` and `evaluation/settings-spec.json`; numeric outputs here are evidence annotations, not edits to the immutable product.
