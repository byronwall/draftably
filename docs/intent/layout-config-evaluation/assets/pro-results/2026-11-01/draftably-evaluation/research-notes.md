# Decision-relevant primary research

Baseline under evaluation: `f14d9b891adba75de6cc172b190017ea5a5ca091`. Sources accessed **2026-11-01**. These notes motivate the evaluation design and explain limits; they are not measurements of Draftably, and none of the external implementations substitutes for its shipped engines.

## Decisions supported by research

### 1. Retain separate readability measures; a crossing score is not an overall quality oracle

**External evidence.** Purchase's 1997 controlled graph-reading study found edge crossings more consequential than bends or symmetry for its tested tasks. The university's author record provides the abstract, not the full experimental materials. [Purchase, *Which aesthetic has the greatest effect on human understanding?*](https://eprints.gla.ac.uk/35804/), DOI [10.1007/3-540-63938-1_67](https://doi.org/10.1007/3-540-63938-1_67).

**Implication for this evaluation (inference).** Crossings receive explicit counts and a heavier traceability weighting. They do not outrank hard connection validity or authored intent, and do not alone select a universal engine. Draftably's `FEEL.md` explicitly accepts an honest crossing over an unnecessarily long detour. Keep route length, detour ratio, hooks, and label ownership visible alongside crossing counts.

**External counterweight.** Kobourov, Pupyrev, and Saket tested automatically generated straight-line drawings at different sizes and densities. Crossing increases harmed task performance, but the reported effect was significant for their small graphs and not their large graphs. This does not establish a safe crossing count for Draftably's orthogonal diagrams. [Authors' paper, *Are Crossings Important for Drawing Large Graphs?*](https://www2.cs.arizona.edu/~kobourov/crossings.pdf).

**Design consequence.** Report family/size results and disagreements, not a pooled scalar as proof of human readability. The synthetic family frequencies are experimental sampling choices, not estimates of customer demand.

### 2. Stable editing is task-specific; minimal displacement alone is insufficient

**External evidence.** Archambault and Purchase's review distinguishes several definitions of mental-map preservation and cautions that minimum movement had not shown a general comprehension benefit across dynamic-graph series. The accessible university record provides the abstract. [*The “Map” in the mental map: experimental results in dynamic graph drawing*](https://eprints.gla.ac.uk/108356/), DOI [10.1016/j.ijhcs.2013.08.004](https://doi.org/10.1016/j.ijhcs.2013.08.004).

**External qualification.** Their orientation-task experiment found mental-map preservation helped users locate places and routes in evolving graphs. This is narrower than a claim that every graph edit should minimize all movement. [*Mental map preservation helps user orientation in dynamic graphs*](https://eprints.gla.ac.uk/78675/), DOI [10.1007/978-3-642-36763-2_42](https://doi.org/10.1007/978-3-642-36763-2_42).

**Implication (inference).** A requested direction change can move the entire drawing successfully. A color-only edit should not. Preserve pins/scope as correctness requirements; separately measure raw displacement, translation-adjusted displacement, order flips, side churn, and route churn. A translation is not the same as local reordering. A cold source recompile is not evidence about a drag or a warm tidy pass. The experiment should not infer actual editor stability where real drag/save behavior was not exercised.

### 3. Treat obstacle avoidance, route search, port assignment, and finishing passes as different mechanisms

**External evidence.** Wybrow, Marriott, and Stuckey's orthogonal-routing paper separates visibility-graph construction, route search, and subsequent positioning/nudging of shared segments. Its optimality claim is for a specified length/bend objective and a particular routing model, not every visual criterion. [Authors' full paper, *Orthogonal Connector Routing*](https://users.monash.edu/~mwybrow/papers/wybrow-gd-2009.pdf); [publisher metadata via the authors' institution](https://research.monash.edu/en/publications/orthogonal-connector-routing/).

**Implication (inference).** Freeze nodes while screening routing parameters. Report whether a setting changes ports, polylines, repair decisions, or only corner appearance. A no-op in one stage does not prove a setting is useless in another. Evaluate clearance/standoff, bend/crossing, lane separation, and prior-side history in combinations.

**Boundary on the comparison.** Draftably's router says it is an original local implementation, not `libavoid` (`src/engines/routing-engine.js`, file header). No guarantee in this paper transfers to Draftably. Its `blocked` flag, geometry, and measured runtime must be evaluated directly.

### 4. Explicit port constraints express authored meaning

**Official implementation evidence.** ELK exposes separate port constraints for free placement, fixed side, fixed order, fixed ratio, and fixed position; its port-side option defines north/east/south/west placement. [ELK Port Constraints](https://eclipse.dev/elk/reference/options/org-eclipse-elk-portConstraints.html), [ELK Port Side](https://eclipse.dev/elk/reference/options/org-eclipse-elk-port-side.html).

**Implication (inference).** Draftably's `from=`/`to=` sides should remain authored constraints with a visible per-edge escape hatch. They are not merely weights to delete after an automatic policy appears good on average. The relevant test compares best automatic routing with explicit sides on targeted fixtures and records correctness separately. ELK is a semantic comparison here, not a proposed library swap.

### 5. Separate the portfolio oracle from a selector that can actually run

**Primary framing.** Rice formulated algorithm selection as its own problem; the author report is available through Purdue. [Rice, *The Algorithm Selection Problem*](https://docs.lib.purdue.edu/cstech/99/). The 1975 technical report precedes the 1976 *Advances in Computers* publication.

**Primary implementation example.** SATzilla chooses constituent algorithms per instance using features and learned performance models, with an objective defined over the instance distribution. [Xu, Hutter, Hoos, and Leyton-Brown, *SATzilla: Portfolio-based Algorithm Selection for SAT*](https://new.aaai.org/Papers/JAIR/Vol32/JAIR-3214.pdf), DOI [10.1613/jair.2490](https://doi.org/10.1613/jair.2490). A related earlier portfolio paper is accessible in the [IJCAI proceedings](https://www.ijcai.org/Proceedings/03/Papers/268.pdf).

**Implication (inference).** A small set's oracle coverage answers “does one retained result work?” A graph-feature selector answers “can available pre-layout information pick that result?” A compare UI asks the user to choose after rendering, which carries a different effort and runtime cost. Publish all three separately. Learn presets and the selector only on development bases; freeze before heldout evaluation. Set-cover/exhaustive subset results bound what a portfolio could achieve; they are not deployed selector results.

### 6. Simplify exposure before deleting useful capability

**Primary design guidance.** Nielsen recommends exposing important choices first and making advanced choices discoverable. The initial/secondary split and a clear advanced entry point matter; the guidance recommends task analysis and usage evidence to decide that split. [Nielsen, *Progressive Disclosure*](https://www.nngroup.com/articles/progressive-disclosure/).

**Implication (proposal).** Group editor controls around outcomes and preservation: arrange, reading direction, target shape, improve locally, compare, and an explicit advanced override. Do not require the user to distinguish research-family names to render an architecture diagram. Preserve source-only specialist structures and per-edge side constraints. Choice counts, technical-term counts, and scripted step counts in this assignment are burden proxies, not observed satisfaction or completion time.

### 7. Engine names do not communicate all user jobs

**Primary observation.** Mooney and colleagues describe graph-drawing stress as depending on distances in the underlying graph, and experimentally investigate whether novices and experts can perceive it. [*The Perception of Stress in Graph Drawings*](https://arxiv.org/abs/2409.04493v2), 2024 preprint/version 2.

**Implication (proposal).** If a stress engine earns a retained place, label its goal in ordinary language in the main UI, while keeping the exact engine ID in the advanced inspector and source. This is a naming/design inference, not evidence that Draftably's local stress solver is better than its force or layered implementation.

## What external sources do not establish

- Which exact Draftably algorithm wins or deserves deletion. Only shipped-source trials can answer that.
- The population frequency of common or niche jobs.
- A universal bend/crossing/area exchange rate.
- The desktop interaction budget from cloud execution timings.
- Actual usability of a proposed preset or automatic selector.
- That a node family name implies a full published algorithm implementation.

## Local source facts that affect measurement

- `src/engines/explorer-engine.js::candidate` resets every candidate to a copied baseline and accepts a shared `priorRoutes` state. This supports independently replayed warm-history port experiments.
- `src/engines/explorer-engine.js::ROUTE_PARAMS` contains eleven entries and omits `standoff`; `RouteLab.settings` and `RouteLab.defaults` expose all twelve. The harness must test `standoff` directly.
- `src/engines/routing-engine.js::settings` clamps numeric values and rounds `passes`. Sensitivity levels must be distinct after this transformation.
- `src/engines/routing-engine.js::port` uses a 10px corner offset clamp and shape-dependent pill/diamond/ellipse insets. `src/model/routes.ts::portPoint` uses a 12px margin and a different pill treatment. Endpoint correctness checks must follow the actual router's returned terminal geometry, not assume the two helpers are identical.
- `src/model/routes.ts::routeInput` substitutes terminals for open-group/cell endpoints; sequence messages bypass the raw router. `drawRoutes` restores special cell segments and sequence message routes, then places labels using `placeEdgeLabels`.
- `src/model/routes.ts::drawRoutes` creates the rounded visual path using `cornerRadius`. Polyline metrics alone cannot detect the intended effect of that parameter.
- `scripts/diagram-audit.mjs::measure` normalizes its defect index by `max(1, edgeCount / 10)`. For fewer than ten edges this is the raw weighted count. The evaluation emits that legacy normalization and a literal per-ten-edge version separately, with a zero-edge convention.
- `docs/intent/diagram-quality/NEXT.md` already identifies false alarms and missed defects. Historical corpus annotations are evidence to inspect, not a fresh heldout sample.

## Research access ledger

| ID | Source | Access actually obtained |
| --- | --- | --- |
| EXT-01 | Purchase 1997 | Author-university abstract/metadata; full text unavailable there |
| EXT-02 | Kobourov et al., crossings | Author-hosted full PDF |
| EXT-03 | Archambault/Purchase mental-map review | Author-university abstract/metadata |
| EXT-04 | Archambault/Purchase orientation experiment | Author-university abstract/metadata |
| EXT-05 | Wybrow/Marriott/Stuckey orthogonal routing | Author-hosted full PDF and institutional metadata |
| EXT-06 | ELK port constraints/side | Official current reference pages |
| EXT-07 | Rice algorithm selection | Purdue report metadata and download link |
| EXT-08 | SATzilla | Publisher/society-hosted paper search content and abstract; no experiment rerun |
| EXT-09 | Nielsen progressive disclosure | Author's full article |
| EXT-10 | Mooney et al. stress perception | Author-submitted versioned preprint abstract/metadata |

The Stanford mirror of the 2003 portfolio paper timed out when opened; the IJCAI proceedings source was located as an alternate. No claim depends on inaccessible mirror content.
