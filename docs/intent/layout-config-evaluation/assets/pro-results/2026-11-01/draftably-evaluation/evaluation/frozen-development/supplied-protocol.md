# Layout and routing surface evaluation

This is the handoff protocol, not a report of completed experiments. Pro must record the actual
protocol and deviations in its results. Baseline: `f14d9b891adba75de6cc172b190017ea5a5ca091`.

## Decision rule

Find the smallest algorithm and control portfolio that preserves useful outcomes across graph
families, tasks, and preferences. Measure the quality lost by deleting each option. Separate
implementation retention from main UI exposure. Do not assume fewer controls always wins.

Use hard validity gates before soft quality scores. A candidate cannot trade incorrect connections,
non-finite geometry, forbidden movement, missing objects, or constraint violations for fewer bends.
Report layout failures and routing failures separately. An unavoidable crossing is a soft cost.

## A. Inventory and metric calibration

Trace every visible or source-level option into the code that consumes it. Include conditional
controls, warm-start actions, explicit ports, direction, fit, fold, scope, manual placement,
protection, and structural recipes. Identify aliases, inert inputs, clamps, and numerical effort.
An apparent no-op needs a targeted witness before a removal recommendation.

Calibrate metrics on at least eight tiny fixtures with known outcomes: overlapping boxes,
one obstacle, unavoidable crossing, avoidable crossing, explicit sides, fixed pin, disconnected
nodes, and a relabel with no topology change. Add label ownership and group title cases.
Check translation invariance and edge-count normalization. Do not normalize by zero edges.
Record exact geometric expectations where possible. Separate metric bugs from product defects.

## B. Corpus and user jobs

Create 72 base diagrams, grouped into 12 families with six independent cases each:

| Family                   | Required variation and user job                                                           |
| ------------------------ | ----------------------------------------------------------------------------------------- |
| Pipelines                | Short, long, branching, folded; explain a reading sequence                                |
| DAGs                     | Fan-out, fan-in, diamonds, dense joins; trace dependencies                                |
| Hierarchies              | Balanced, unbalanced, forest, cross-links; locate ownership                               |
| Architecture             | One-level groups, nested groups, many boundary links; explain systems                     |
| Cycles                   | Retries, feedback, bidirectional and undirected edges; explain lifecycle                  |
| Networks                 | Sparse mesh, clusters, hub-and-spoke; inspect relationships without forced flow           |
| Disconnected             | Isolated objects, components, sparse boards; pack a useful overview                       |
| Routing congestion       | High degree, parallel and opposing edges, narrow corridors; trace one edge                |
| Containers               | Deep nesting, labels near borders, group endpoints, soft/collapsed groups where supported |
| Presentation constraints | Wide/slide/square/page/tall, heterogeneous sizes and long labels                          |
| Authored placement       | Pins, relative hints, manual arrangements, local scope repair                             |
| Structural recipes       | Row, column, lanes, sequence, cells, mixed group-scoped recipes                           |

Use all relevant existing corpus, heldout, example, and regression fixtures as source material.
Include at least 24 real or existing cases and at least 24 new synthetic/adversarial cases.
Keep real and generated provenance distinct. Cases can share motifs, but never count simple renames
as independent diagrams. Use 4–12, 13–35, and 36–100 nodes across the corpus. Add two 150–250-node
stress cases as optional scale tests; they do not receive extra weight in quality means.
Include at least one empty and one single-node sanity fixture outside the main 72.

Attach a job card to every base: task, intended reading order, constraints, acceptable ambiguity,
target format, common/niche assumption, expected invariants, and pass criteria. Use neutral initial
placement for cold runs. Do not bias generated geometry toward a preferred engine.

Split within each family into four development and two heldout cases: 48/24 total. Group variants
and edits by base. Never split siblings across development and heldout. Fix the split before tuning.
The old repository heldout set has already informed past development; label it historical,
not fresh unseen evidence. Reserve genuinely new cases for the new heldout portion.

Make these preference profiles explicit: readable directional flow, compact presentation,
traceable connections, stable incremental edits, and specialist structure preservation.
Do not estimate their population frequency. Analyze equal-family, common-job-heavy (80/20),
niche-heavy (50/50), and worst-family results. Define common/niche labels before outcomes.

## C. Engine and recipe screening

Run every applicable rebuild engine on each base, in both RIGHT and DOWN where meaningful.
Keep router settings constant. Run recipe baselines separately, including default/no layout line.
Do not force sequence or cells through unrelated graph algorithms and call the result a failure.
Record each applicability rule before running. A user task still counts against coverage when no
retained method can serve it. Test `separate`, `tidy`, and other repair behavior in warm runs.

Use the shipped cold rebuild path, settings, and stopping conditions. Report iterations and
termination. Repeat deterministic geometry on a stratified 12-case sample. Compare graph structure,
not JSON timing fields. Test ID renaming and harmless declaration-order changes separately;
file order can be an intentional tie-breaker and is not automatically a defect.

Compute equivalence classes from node/group geometry, selected ports, and paths. Use a documented
tolerance (suggested 1 px); distinguish exact equality from visually immaterial differences.
Report how often apparently distinct engines produce equivalent outcomes, and where they diverge.
Measure time separately from geometry; warm up and use at least five samples on 12 representative
cases. Give medians and tails without implying cloud timings prove the desktop's 200 ms budget.

## D. Setting sensitivity and interactions

For each public layout parameter, test default plus two meaningful alternative levels on at least
12 relevant development cases, across at least two families. Cover categorical values and root
choices explicitly. Use engine-specific controls only where consumed. Test pass-only and protection
settings in warm states. Screen active controls before expensive interaction trials.

Freeze positions on 24 stratified routing fixtures. For all twelve public routing parameters,
run default plus meaningful low/high levels (categorical/integer levels as appropriate).
Count one shared baseline, not twelve baseline duplicates. Include forced sides, diamonds,
fan-in/out, groups, tight obstacles, labels, returns, and narrow corridors. Separate port choice,
path search, repair passes, and aesthetic rounding effects.

For port stability, run a shared prior state followed by a small edit. For every candidate, use
the same prior routes; never carry history from a previous candidate. Test empty history too.
Corner radius may have no path-metric effect; evaluate appearance without declaring it useless.
Test explicit port overrides against the best automatic result on at least 12 fixtures.
Internal debug flags are diagnostic ablations, not additional proposed user controls.

Run six 3×3 routing interaction grids on at least eight relevant development fixtures each:

- crossing penalty × bend penalty;
- clearance × standoff;
- edge gap × parallel penalty;
- port gap × fan-out penalty;
- shared penalty × passes;
- port stability × crossing penalty, with shared history.

Include at least three layout interactions: aspect × fold, rank gap × node gap, and
boundary pull × hierarchy sweeps. Use four relevant cases per interaction with a 3×3 grid,
or a documented categorical design. Then cross the best three layout choices with the best
three routing policies on at least 12 development cases. This checks whether a routing control
merely compensates for a weak layout. Preserve adverse combinations and timeout rows.

## E. Incremental editing

Choose 24 bases across at least eight families. Build four edits for each: relabel or resize,
add a node/edge, regroup or move a local region, and change direction/fit or remove an element.
Use appropriate task-specific constraints. Include a color-only negative control outside the four.

Compare today's behavior and at least two proposed smaller policies. Test both source recompilation
and actual warm engine inputs; do not confuse cold rebuild stability with warm tidy stability.
Include fixed pins, manual nodes, selected scope, collapsed containers, and prior port choices.
Record raw and translation-adjusted displacement, order flips, changed sides, changed routes,
constraint compliance, local versus distant movement, and time. A direction change should not be
penalized for moving the whole diagram when that is the requested result.
If real drag/save UI behavior cannot be executed, mark it untested and avoid claiming UI stability.

## F. Quality and human inspection

Use the repository's defect categories and FEEL.md. Retain raw measurements for:

- Hard defects, blocked routes, violated authored sides/pins/scope, lost nodes or edges.
- Label ownership and collisions, route-through-node/title, border and obstacle clearance.
- Crossings, shared segments, lane spacing, bends, tiny jogs, hooks, wrong-side arrivals.
- Route length and detour ratio, group compactness, aspect error, area, alignment and dead space.
- Edit movement, ordering and route churn, deterministic outcomes, and runtime.

Report per-case values, per-family medians, failure rates, upper tails, and worst cases. DI is
one diagnostic index. Predefine at least three alternative weightings and practical-equivalence
bands. A proposed starting band is DI within 1 per ten edges, area within 10%, and route length
within 10%, with zero new hard defects or required-intent failures. Validate bands visually on
development cases before freezing them. Keep each component visible instead of hiding tradeoffs
inside one score. Clearly distinguish borrowed thresholds from experimentally calibrated ones.

Inspect at least 48 matched image pairs. Include random stratified cases, all proposed removal
witnesses, major metric disagreements, unique niche wins, and worst regressions. Include heldout
pairs after policies are frozen. Shuffle left/right and hide engine names during judgments; retain
the mapping in the outputs. Use better/same/worse with reason, severity, and confidence. This is a
single expert model's assessment, not independent human validation. Follow FEEL.md when a score
rewards large detours. Save false alarms and missed defects; do not silently rescore heldout results.

## G. Portfolio selection and config ablation

Define the candidate result pool on development data. Compare:

1. Current documented defaults and current UI policy.
2. Best single global method with fixed defaults.
3. Fixed portfolios of sizes 2, 3, 4, and 5, keeping specialist recipes separately visible.
4. A simple graph-feature selector using only information available before layout.
5. A small goal-based UI with internal presets and an optional advanced escape hatch.

For each preference profile, define acceptable outcomes from the validity gates and quality bands.
Find a small portfolio with set cover or exhaustive subset search over the ten engine IDs.
Select presets and a simple selector only on development data. Report theoretical oracle coverage
separately from actual selector performance and user selection effort. Show the quality/coverage
versus portfolio-size curve, per-family regret, and the cost of each additional option.

Use leave-one-engine-out and leave-one-control-out ablations. For each removal, compare both
fixed defaults and a replacement retuned on development data. Keep tuning budgets comparable.
Distinguish unique wins from tiny numeric wins inside practical equivalence. Publish witness
diagrams for every retained niche method and every disputed removal. A control that matters only
in combination must survive individual sensitivity screening if the interaction shows value.

Freeze the final candidate policies and evaluate once on the 24 heldout bases and their assigned
edit sequences. Do not retune after reading heldout results. Show paired differences and uncertainty
by resampling base diagrams or families, never counting correlated edits/trials as independent users.
Give sensitivity to family weights, metric weights, and equivalence bands. Do not claim significance
from a synthetic benchmark as proof of user preference.

Recommend a default UI only if it reduces visible choices while keeping at least 95% of the current
pool's acceptable common-job coverage on heldout cases, loses no supported specialist task without
an explicit escape hatch, and adds no hard-defect case where today's policy was valid. Report exact
counts as well as percentages. This is a proposed decision threshold, not a target to game. If it
fails, recommend the smallest defensible compromise and state the missing evidence.

## H. User effort and implementation decision

Compare at least three interface policies: current advanced controls, goal-based presets, and
automatic selection plus compare/override. Script at least eight jobs: first architecture render,
shorten a long pipeline, change reading direction, remove a crossing, space crowded fan-out,
preserve a hand-tuned region, fit a slide, and obtain a niche tree/network/sequence arrangement.

Count visible choices, required decisions, steps, technical terms, undo/reset paths, and manual
tuning attempts under a declared strategy. Keep these as cognitive-load proxies; do not invent
completion times or satisfaction. State which controls need immediate access versus rare source
overrides. Show source round-trip, undo, preview, compare, and scope implications.

Finish with an exact inventory disposition and implementation plan. Retain a modest internal
portfolio when its cost is low and its unique value is clear. Remove inert public configuration
only after targeted tests establish why it is inert. Identify unresolved behavior for follow-up.
