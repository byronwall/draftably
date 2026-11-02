# Source layout control removal and bounded replacement tuning

**Measured development evidence.** Each of the15source layout controls is fixed to its default, then one other consumed control is retuned over the same number of global candidate configurations as the original core sensitivity screen. The12relevant bases and original engine are unchanged. This adds336actual production-pipeline trials.

Hard-validity coverage ranks before mean score. The table uses the balanced weighting; traceable/direct sensitivity and every witness remain in the JSON. Acceptance is relative to the shared union of tested before/after alternatives. A successful replacement can be worse on individual cases even when its aggregate count improves.

| Removed control | Replacement varied | Configs before/after | Before valid / acceptable | Fixed default valid / acceptable | Retuned valid / acceptable | Newly lost acceptable cases |
| --- | --- | ---: | --- | --- | --- | --- |
| rankGap | node-gap | 3/3 | 11/12 / 7/12 | 11/12 / 9/12 | 11/12 / 9/12 | hierarchies-04 |
| groupGap | node-gap | 3/3 | 9/12 / 7/12 | 9/12 / 7/12 | 9/12 / 9/12 | architecture-04 |
| nodeGap | rank-gap | 3/3 | 10/12 / 10/12 | 10/12 / 7/12 | 11/12 / 3/12 | dags-03, hierarchies-01, pipelines-03, dags-01, hierarchies-02, hierarchies-03, pipelines-02, pipelines-04 |
| boundaryPull | hierarchy-sweeps | 3/3 | 8/12 / 5/12 | 8/12 / 2/12 | 8/12 / 5/12 | containers-01, architecture-01, architecture-02 |
| hierarchySweeps | boundary-pull | 3/3 | 8/12 / 8/12 | 8/12 / 7/12 | 8/12 / 8/12 | none |
| edgeLength | alignment | 3/3 | 10/12 / 7/12 | 10/12 / 8/12 | 10/12 / 7/12 | networks-03 |
| repulsion | edge-length | 3/3 | 11/12 / 5/12 | 11/12 / 5/12 | 11/12 / 5/12 | cycles-04 |
| flowStrength | rank-gap | 3/3 | 11/12 / 9/12 | 11/12 / 8/12 | 11/12 / 4/12 | pipelines-03, dags-03, dags-01, pipelines-02, cycles-01, pipelines-04, cycles-04 |
| alignment | edge-length | 3/3 | 10/12 / 9/12 | 10/12 / 9/12 | 10/12 / 9/12 | dags-01 |
| compactness | edge-length | 3/3 | 8/12 / 3/12 | 8/12 / 2/12 | 8/12 / 5/12 | containers-02 |
| gridStrength | aspect | 3/3 | 11/12 / 4/12 | 11/12 / 6/12 | 11/12 / 6/12 | presentation-02 |
| ordering | node-gap | 2/2 | 11/12 / 9/12 | 11/12 / 9/12 | 11/12 / 9/12 | none |
| fold | aspect | 2/2 | 11/12 / 9/12 | 11/12 / 8/12 | 11/12 / 8/12 | pipelines-03, pipelines-01, pipelines-02 |
| aspect | grid-strength | 3/3 | 11/12 / 7/12 | 11/12 / 6/12 | 11/12 / 4/12 | disconnected-03, disconnected-02, disconnected-04, pipelines-03 |
| rootId | rank-gap | 3/3 | 10/12 / 6/12 | 10/12 / 6/12 | 10/12 / 4/12 | hierarchies-01, dags-03, hierarchies-03, hierarchies-04 |

Root selection, folding, reading order and target aspect can encode user intent; recovering a numerical score cannot replace those requests. This experiment supplies deletion-loss evidence, not a blanket removal recommendation. Warm scope, pins, manual protection and action semantics stay covered by the separate warm sensitivity and edit studies.
