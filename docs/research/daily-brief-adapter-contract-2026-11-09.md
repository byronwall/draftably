# Consumer contracts for the graph layout adapters

Status: proposed investigation; documentation only. No adapter experiment or defect reproduction has
been run for this note. The implementation and its review remain owned by [#510](https://github.com/byronwall/draftably/pull/510).

```yaml
origin: repo-reading-brief
source_edition: 2026-11-09
source_url: https://chatgpt.com/space/page_6eea0b684a988191ae586db6c152d4c9
topic_id: draftably.layout-adapter-observable-contract.v1
artifact_type: assistant-generated-research
activity_ranking: excluded
repository_baseline: 379a920476300463260952fe983d0d86bc2ebb3e
inspected_adapter_head: d31ee0801061ba2560cb612497ea10ed35125a60
experiment_status: proposed-not-run
```

## Question and useful outcome

Which existing host programs can switch layout engines without changing how they read their graph,
retain application data, or handle completion and failure? Record a small, versioned compatibility
profile and test it through the host's existing reader. A narrower, explicit supported subset is a
useful outcome. This note does not propose matching the original engine's node ordering, route shape,
layout objective, performance, or every option.

The independent trigger is the November 9 graph API stack: [#506](https://github.com/byronwall/draftably/pull/506),
[#507](https://github.com/byronwall/draftably/pull/507), [#509](https://github.com/byronwall/draftably/pull/509)
and #510 are open drafts at inspection. The research branch is based on `main`, where these adapters
are not yet present. All adapter observations below refer to the separate pinned #510 head, not to
released or deployed behavior.

## Reading and transfer limit

Barbara H. Liskov and Jeannette M. Wing, [A Behavioral Notion of Subtyping](https://www.cs.cmu.edu/~wing/publications/LiskovWing94.pdf),
ACM TOPLAS 16(6), November 1994, pp. 1811–1841; [DOI](https://doi.org/10.1145/197320.197383).
Sections 5.2 and 7 are the useful reading here. Their constraint-based account relates legal values,
method preconditions and postconditions, permitted exceptions, and properties that persist over an
object's history. Checking signatures alone misses what a caller can observe through shared mutable
objects. The paper also presents an extension-map alternative with different proof obligations.

Use that distinction as a review checklist, not as a claim that these JavaScript wrappers formally
implement a subtype relation. The original libraries do not provide a complete formal specification,
and a few differential tests cannot prove substitution. Documented upstream behavior, behavior observed
in an exact pinned version, and a new Draftably promise must be recorded separately. The paper addresses safety properties, not
liveness. The completion probes below are practical compatibility checks, not a termination guarantee
derived from its subtype relation.

## What #510 already establishes

Static inspection on November 9, 2026:

- [ELK adapter](https://github.com/byronwall/draftably/blob/d31ee0801061ba2560cb612497ea10ed35125a60/src/graph-api/elk.ts):
  maps groups and ports, splits a hyperedge into source/target pairs, mirrors LEFT/UP results, returns
  node coordinates relative to parents and edge sections/labels relative to an assigned `container`.
  Object spreads retain input fields while replacing layout fields; this is not a deep-copy guarantee.
- [dagre adapter](https://github.com/byronwall/draftably/blob/d31ee0801061ba2560cb612497ea10ed35125a60/src/graph-api/dagre.ts):
  calls `layoutSync`, then assigns centres, sizes, edge points, available label centres and graph
  dimensions into existing graphlib labels. Its return also exposes the Draftably result.
- [Cytoscape adapter](https://github.com/byronwall/draftably/blob/d31ee0801061ba2560cb612497ea10ed35125a60/src/graph-api/cytoscape.ts):
  reads element data and dimensions, stores `layout.result`, and delegates positioning to the host's
  `layoutPositions`. Cytoscape still renders its own edges. `stop()` returns the layout; it does not
  establish interruptible layout work.
- [Adapter tests](https://github.com/byronwall/draftably/blob/d31ee0801061ba2560cb612497ea10ed35125a60/tests/graph-api-dropins.test.ts):
  two ELK cases check containers, a SOUTH port, outline endpoints, label width, nonnegative positions,
  unused-option warnings and the UP mirror. One dagre case uses a small graphlib-shaped test double
  to check centres, compound width, a named edge's points, a label position and graph dimensions.
- [Core tests](https://github.com/byronwall/draftably/blob/d31ee0801061ba2560cb612497ea10ed35125a60/tests/graph-api.test.ts)
  already exercise caller IDs, separate node/edge namespaces, dimension clamping with warnings and
  bad references. These should be reused rather than presented as missing core validation.

#510 reports manual comparisons with elkjs 0.12.1, dagre 0.8.5 and headless Cytoscape, including the
normal lifecycle event sequence. It explicitly says real-library comparisons do not run in CI. Those
runs and timings are author-reported evidence, not reproduced here. The checked-in adapter test file
has no Cytoscape case and no explicit arbitrary-data, aliasing or success/failure/history assertions.
That is the limited coverage observation, not a claim that no other evidence exists.

The [proposed public guide](https://github.com/byronwall/draftably/blob/d31ee0801061ba2560cb612497ea10ed35125a60/site/docs/pages/layout-api.md)
already states important limits: ports retain sides rather than fixed positions, many ELK options are
unused, and Cytoscape routing is available separately rather than rendered automatically. Preserve
those limits. Coordinate compatibility also needs an option boundary: the living
[ELK coordinate reference](https://eclipse.dev/elk/documentation/tooldevelopers/graphdatastructure/coordinatesystem.html)
(checked November 9) distinguishes default parent/container coordinates from explicit ROOT/PARENT
JSON coordinate modes. The default case alone does not establish those optional modes.

## Proposed compatibility worksheet

For each row, record the exact original package/version, Draftably commit/package entry, input,
unchanged host reader, expected observation, basis for that expectation, actual output and disposition.
Start with #510's reported elkjs and dagre versions. Record an exact Cytoscape version before running;
this note does not invent one or equate the historical dagre package with every modern distribution.

| Consumer boundary   | Small proposed case                                                                                                                  | Observation to compare                                                                                                                                                                                                                                  |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ELK coordinates     | Two nested groups, an edge inside one group and an edge crossing groups; place one edge in the root input list                       | The same reader reconstructs each result's absolute node/edge/label positions using parent and `container` offsets. Endpoints refer to the intended nodes or declared port mapping. Do not compare the two engines' absolute coordinates.               |
| Data ownership      | Add synthetic application keys to root, nodes, edges and label objects; retain references before layout                              | Input/output payload values survive according to the declared field policy. Record identity and aliasing separately from value equality. Require deep isolation only if the supported contract promises it.                                             |
| dagre write-back    | A compound graph with two named parallel edges and application-owned label fields                                                    | The existing `g.node(v)` and `g.edge(e)` reader sees updated centres/points and the correct edge identity synchronously. Retained label references see the intended updates, while unrelated values remain.                                             |
| Repeated use        | Layout, edit a label or endpoint, layout again; then compare against a fresh graph built from the edited input                       | Old geometry, diagnostics or results are not mistaken by the host for current output. Define handling of removed label geometry and last-successful diagnostics before calling a difference a defect.                                                   |
| Failure             | A small invalid-reference case, followed by a valid call on the same adapter or graph                                                | Record synchronous throw versus promise rejection, consumer-visible diagnostics, which objects changed, and whether recovery succeeds. Do not assume rollback or exact error text when upstream has not promised it.                                    |
| Cytoscape lifecycle | Use the real host with compound nodes, `animate: false` and `fit: false`; register callbacks before `run()` and repeat after an edit | The host observes expected completion events and positions, preserves application data and requested viewport behavior, and reads routes only through the declared separate result. Inspect animation/stop behavior separately if that mode is claimed. |
| Declared limits     | Request a fixed-position ELK port, an unsupported layout option and a nondefault coordinate mode                                     | Each falls into an explicit support, approximation, warning or rejection policy. A warning is useful only when the unchanged consumer can find it; it is not proof that the original semantics were preserved.                                          |

These are proposed probes, not new tests included in this PR. Begin with the smallest subset that a
real consumer uses. Add a pairwise hyperedge case only if that consumer needs it; its host reader must
understand the declared expansion rather than assuming native hyperedge routing. Add awkward legal
IDs or more direction combinations where they exercise adapter mapping beyond the existing core tests.

## How to judge a result

1. Freeze the consumer profile before observing outputs. Separate required semantics from deliberate
   approximations and out-of-scope features. For example, node-centre interpretation is required for
   the dagre reader; equal edge bend counts are not.
2. Run the original library and the adapter on independent, equivalent inputs. Keep an untouched
   payload snapshot and retained references for each run. Reuse the same reader and coordinate
   reconstruction, with no branch-specific repair code hiding a mismatch.
3. Compare topology/IDs, preserved application values, field units and origins, mutation boundaries,
   completion and failure observations. Check finite geometry and structural consistency within each
   result. Use images as supporting evidence, not a pixel-equality oracle or aesthetic score.
4. Exercise success → edit → success and success → failure → success. Record the observation after
   each step, not only the final drawing. For asynchronous ELK calls, concurrent-call and warning
   ownership behavior is a separate question if a consumer shares one instance.
5. Classify differences as a documented approximation, unspecified upstream behavior, consumer
   adaptation requirement, or reproducible incompatibility within the declared supported profile.
   A defect claim needs a minimal reproduction and the exact promise it violates. Keep undocumented
   upstream quirks separate from guarantees; matching a quirk can still be a deliberate migration choice.

The result should be a short evidence table and proposed wording for #510's supported subset. Keeping
the current adapters unchanged, narrowing the migration wording, or adding focused tests under #510
are all valid later decisions. No implementation, package installation, benchmark or consumer probe
is authorized by publishing this research note.

## Ownership and scope

#510 owns the adapters and their compatibility tests; #507 owns the common API. This supplements their
review without adding a competing implementation plan. [#452](https://github.com/byronwall/draftably/pull/452)
already owns the earlier runtime/Markdown contributor contracts, and [#332](https://github.com/byronwall/draftably/pull/332)
owns importer research. [#105](https://github.com/byronwall/draftably/pull/105) covers routing evaluation,
[#116](https://github.com/byronwall/draftably/pull/116) comparison-source fidelity, and
[#423](https://github.com/byronwall/draftably/pull/423) evaluation-run lineage. This note's distinct unit
is the existing external consumer and its state history across an engine substitution.

Only this Markdown document changes. No application code, test, fixture, dependency, lockfile, DSL,
public guide or release file changes. Repository checks validate the documentation tree, not the
proposed compatibility profile. Exclude this assistant-generated document, branch, PR, commits and
any derivative merge from future independent activity ranking. Later independent user feedback,
implementation and evaluation are separate signals. No merge, auto-merge or deployment is requested.
