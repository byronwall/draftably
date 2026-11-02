# Layout and routing configuration: decision and evidence

**Simplify the main editor. Retain the existing algorithms and exact source controls for now.**
The tested smaller portfolios lost useful results on unseen diagrams. A simpler interface can keep
those methods available in Advanced and source without making users choose among them routinely.

This is a research recommendation, ready for implementation review. No product behavior changes
are included. Baseline: `f14d9b891adba75de6cc172b190017ea5a5ca091`.

| Surface                                  | Current        | Recommended next implementation                                            |
| ---------------------------------------- | -------------- | -------------------------------------------------------------------------- |
| Basic layout fields                      | 4              | 3: Scope, Reading direction, Format                                        |
| Numeric routing sliders in the main menu | 9              | 0; exact values remain in Advanced/source                                  |
| Comparison presentation                  | 6 alternatives | Current drawing plus up to 3 distinct alternatives; More keeps full access |
| Rebuild engines                          | 10             | Retain 10 internally; no engine choice in the basic panel                  |
| Local overlap repair                     | Separate       | Retain as a local action                                                   |
| Structural recipes                       | 6              | Retain flow, row, column, lanes, sequence, cells                           |
| Source engine/router parameters          | 15 / 12        | Retain; disclose controls only where the selected operation consumes them  |

Move corner shape to Appearance. Keep pins, exact sizes, group membership, and endpoint sides in
the context inspector. Keep local Improve separate from a new source arrangement. Preserve the
current rendering and routing defaults. These UI choices are proposals, not measured user preferences.

## What Pro actually evaluated

The study used 72 bases across 12 families, with 48 development and 24 new heldout diagrams.
It combined existing examples, generated graphs, fixed-position routing fixtures, and edit sequences.
It tested cold engines, warm actions, all public engine/router parameters, interactions, bounded
replacement tuning, explicit ports, history, runtime, and identity stability. It recorded 63 blinded
image-pair judgments from one expert model.

All 8,203 registered trials have outcomes: 7,731 completed, 452 timed out, and 20 failed.
Completed output is not the same as valid geometry. Failures remain in coverage denominators.
Seven duplicate attempts are retained separately. Of the timeouts, 433 have a completed layout
checkpoint followed by a routing/label timeout.

## Why deletion is premature

The development-selected six-engine pool was boundary-align, tidy, force, layered, tree, and grid,
plus native recipes and dependency-safe authored source. Its heldout accepted common-base counts
were **11, 12, 11, 10, 10 out of 12** across the five profiles. The stricter eleven-configuration
restriction achieved **10, 12, 10, 8, 8**. The deployable graph-feature selector achieved only
**5, 4, 3, 3, 3**, despite a hard-validity fallback.

The six-engine result assumes perfect selection after seeing the outputs. It is an availability
upper bound, not an automatic chooser. Compound-spring, compound-flow, and flow provide concrete
excluded-method witnesses on architecture-05, cycles-06, and routing-06.

The 95% rule is an operational decision threshold, not a perceptual constant. With twelve feasible
common cases, it requires 12/12 in every profile. Area and route length must also remain within
10% of the profile oracle. The small sample and tight bands warrant caution. Current defaults also
score poorly against that retrospective oracle. Keeping them avoids an unvalidated replacement;
it does not declare them optimal or prove that every retained engine is uniquely necessary.

## Configuration has value, but exposure is excessive

Distinct spacing controls cannot all become one scalar. In bounded replacement trials, fixing node
gap reduced acceptable cases from 10/12 to 3/12; fixing flow strength reduced 9/12 to 4/12.
Some controls matter only in warm state or interactions. Corner radius changes appearance without
changing the polyline. A finite no-effect result for shared penalty does not establish dead code.

The frozen routing alternatives—clearance 4, clearance 22, and port gap 28—are useful comparison
experiments. They do not justify new defaults. Clearance 22 makes six of sixteen currently valid
heldout source drawings invalid. Keep exact values, current output, preview, and explicit side
constraints visible when evaluating such alternatives.

## Collection review and limits

Codex verified archive hashes, parsed all successful artifacts, checked every saved geometry
signature, and independently checked 6,360 heldout acceptance rows. See
[collection-validation.json](collection-validation.json). This review did not rerun the 8,203 trials
or execute downloaded programs.

Source inspection confirms that file routing Compare ignores `autoPorts`, recipe replacement drops
`fit=`, and fit search can override a requested direction. These support the first implementation
milestone. The archive's broad repository checks were limited by omitted website files and a
fallback browser. The complete local checkout passed `pnpm check` before collection.

Metrics omit some text ink, annotation collisions, clipping, and intent checks. Numerical/visual
agreement is only 39/63 under balanced DI. There are two heldout bases per family and no new heldout
lane case. UI effort figures are scripted proxies. Cloud timings do not prove desktop latency.
The proposed three-card presentation has not been tested with users.

## Read and act

- [Implementation plan](implementation-plan.md): small shippable milestones and acceptance criteria.
- [Recommendation dispositions](dispositions.md): review decisions, with all 175 IDs in a CSV.
- [Original Pro assets](assets/pro-results/2026-11-01/README.md): reports, corpus, raw data, renders,
  source companions, and replay instructions. Original bytes are preserved.
- [Prompt](pro-prompt.md), [protocol](evaluation-protocol.md), and [run record](run-record.md).
- [Pro conversation](https://chatgpt.com/c/6ae7c1f0-6374-83e8-b87d-d1c7d398226d).

The external research supports the distinctions used here: [ELK](https://eclipse.dev/elk/reference/options/org-eclipse-elk-portConstraints.html)
separates authored port constraints, and [Nielsen](https://www.nngroup.com/articles/progressive-disclosure/)
describes primary and advanced controls. Those sources do not select a winning Draftably engine.
