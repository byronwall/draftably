# Frozen evaluation corpus

Baseline: `f14d9b891adba75de6cc172b190017ea5a5ca091`.

This corpus was generated and syntax-validated **before candidate geometry or winner inspection**. It contains 72 base diagrams, 120 independent one-step edit variants, two sanity inputs, and two optional scale inputs. The complete machine-readable experiment input is `manifest.json`. Every listed path is relative to the deliverable package root.

## Counts and split

| Property | Count |
| --- | ---: |
| Families | 12 |
| Bases per family | 6 |
| Development bases, IDs `01`–`04` within every family | 48 |
| Fresh heldout bases, IDs `05`–`06` within every family | 24 |
| Exact existing source diagrams, all development | 24 |
| New deterministic synthetic diagrams | 48 |
| Small bases, 4–12 nodes | 29 |
| Medium bases, 13–35 nodes | 22 |
| Large bases, 36–100 nodes | 21 |
| Common-job weighting label | 42 |
| Niche-job weighting label | 30 |
| Bases with assigned edits, IDs `03` and `05` in every family | 24 |
| Four task edits per edited base | 96 |
| Additional color-only negative controls | 24 |

All variants of one base inherit its split. Edits are independent transitions from the base, **not** a cumulative sequence. IDs `03` supply 12 development edit bases; IDs `05` supply 12 heldout edit bases. The four requested edit categories are represented by `relabel.draft`, `add.draft`, `local.draft`, and `direction_or_remove.draft`. `color_control.draft` is outside those four. The manifest records the exact changed IDs, constraints, direction-change exemption, and expected invariants for every transition.

The common/niche labels are benchmark assumptions fixed before outcomes. They do not estimate demand or market frequency. Common families are pipelines, DAGs, hierarchies, architecture, cycles, presentation constraints, and authored placement. Niche families are networks, disconnected boards, routing congestion, containers, and structural recipes. A family labeled niche can still represent an important user task.

## Source provenance

`originals/` preserves all supplied historical quality-corpus diagrams and requests, the historical heldout set, shipped examples, and sample JSON. `originals-index.json` gives exact paths and SHA-256 values and identifies which originals became main bases. Twenty-four selected base files are byte-for-byte copies. Source siblings are preserved as provenance, not counted as additional independent bases.

The historical `annotations-modules/v0.draft` is `hierarchies-02`, a **development** input. No old historical heldout file is presented as newly unseen evidence. Authored-placement inputs `hn-deploy/e1.draft` and `visual-notes-mcp-call/e1.draft` are two independent original diagrams with existing refinements; their other versions do not become other main bases.

The structural-recipes family has four existing development cases. Disconnected boards have four new development cases because the supplied examples were not representative isolated boards. Every other family has two existing and two new development cases. All 24 heldout bases are newly generated.

## Task coverage

| Family | Existing cases | New motif variations |
| --- | --- | --- |
| Pipelines | Release and ingest flows | Short chain, long labeled chain, branches, large folded chain with forward skips |
| DAGs | CI graph and CI/CD stages | Diamonds, dense layered joins, irregular long dependency, large fan-in/fan-out |
| Hierarchies | Source tree and historical extension tree | Balanced tree, forest, unbalanced ownership, advisory cross-links |
| Architecture | Offline client and Visual Notes system map | Boundary calls, nested service fabric, external subsystem, many long boundary links |
| Cycles | Consultation and order lifecycle | Retries, connected cycles, mixed bidirectional/undirected relations, reset links |
| Networks | Code layers and CLI context | Hub with peer ties, dense clusters with bridges, sparse mesh, large nonplanar mesh |
| Disconnected | None | Isolates, independent chains, star plus pairs, islands, tiny components, forest with isolates |
| Routing congestion | Saga broker and telemetry collector | Parallel/opposing routes, two collectors, diamond ports and forced sides, opposing fans |
| Containers | AWS and Kubernetes nesting | Five and seven levels, soft/invisible groups, long titles, group endpoints |
| Presentation constraints | Explicitly sized field-service example and hexagonal architecture | Wide, slide, page, tall; mixed sizes and long labels |
| Authored placement | Original viewer/source refinements | Two protected regions, local pins, required near constraints, soft stays |
| Structural recipes | Sequence, table cells, lanes, mixed rows/columns | Grouped phased sequence with self-message; mixed scopes with bit cells |

Each case's job card includes the task, intended reading order, constraints, acceptable ambiguity, target format, weighting assumption, exact node/edge/group identity expectations, and pass criteria. Existing `# expect` comments are preserved, including historical expectations already described as false alarms in `NEXT.md`. Those comments are evidence for review, not automatically hard correctness gates.

## Engine and recipe applicability

All ten shipped rebuild IDs are applicable at the root of ordinary bases. Root replacement must preserve nested layout lines and hard refinements. A cold run uses the shipped cold compilation/rebuild path, never positions chosen to help a candidate. Explicit positions appear only where authored-placement or presentation constraints are the task.

Root sequence cases (`recipes-01`, `recipes-05`) and the root lane case (`recipes-03`) are excluded from general-engine replacement because the recipe determines time or role semantics. They remain in task coverage denominators and require a retained specialist escape hatch. Sequence participants and messages are not an ordinary graph layout. A root engine on a diagram containing a nested `cells` recipe is applicable when the nested cell recipe survives: it arranges the complete table/packet as a unit.

The corpus specifies `RIGHT` and `DOWN` as engine screening directions where applicable. A caller may explicitly record an inapplicable direction if a setting is ignored by an engine. The default/no-root-layout, flow, row, and column recipe baselines are separate trials, not aliases for the engine named `flow`.

The main heldout specialist cases cover sequence and mixed bit cells. Lanes are represented by an existing development case, not a newly unseen lane case. This limits a claim of heldout coverage for every specialist subtype and supports retaining the source recipe escape hatch.

## Warm states and real UI limits

For every edited base, `warmState` names a selected scope, manual IDs, and a candidate collapsed group. These are instructions for constructing actual warm engine input from the baseline drawing. Collapse is a document/view state, not an invented `.draft` attribute. Manual markers and selection protection are also warm-state inputs. Preserve the same baseline prior routes independently for every port-stability candidate.

The source edit files do not claim to reproduce an actual browser drag/save session. That must be checked separately through the shipped editor or reported untested. Direction changes explicitly request global movement and should not receive an ordinary movement penalty. A fixed pin still has priority over the requested reading direction.

## Validation and reproducibility

```bash
# Run from the deliverable package root, beside the immutable baseline directory.
python evaluation/generate-corpus.py --baseline ../baseline
node evaluation/validate-corpus.mjs
```

`generate-corpus.py` writes all inputs and metadata deterministically from seed `20261101`. It executes no layout algorithms. `validate-corpus.mjs` calls the shipped `parseModel` through Vite; it also executes no geometry trials. Final syntax validation passed **196/196** inputs. The first authoring check found two invalid ancestor/member boundary connections (one base had five derivative edit files) and one grouped-sequence order scoped to root; these eight input errors were corrected before the corpus freeze. They are corpus-construction errors, not failures of an evaluated layout engine. The validation result is in `syntax-validation.json` and the pre-outcome content hashes in `freeze.json`.

The runtime logged an EPERM error when Vite's auxiliary WebSocket listener attempted port 24678. Parsing still completed successfully. Dependency scanning is disabled in the validation helper. This side-channel listener is unrelated to geometry execution and is not represented as a product failure.

`extras/empty.draft` and `extras/single.draft` test zero-edge normalization and finite empty/single bounds. The 180-node sparse-network and 220-node layered-DAG fixtures are optional stress tests with zero weight in quality means.
