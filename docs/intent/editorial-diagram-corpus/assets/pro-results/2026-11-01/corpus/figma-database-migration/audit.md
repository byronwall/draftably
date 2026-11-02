# E04 — Prepare, replicate, pause, reroute

## Verdict and visual evidence

**v0 readability versus reference: worse.** The first render shifts corresponding stores between rows and routes stage progression through the next panel. This obscures the small connection changes that the source makes easy to compare. All ratings below are visual judgments of actual unchanged-baseline renders. Semantic completeness, standalone communication quality, and reference fidelity are separate axes. The anchors are 1 misleading/unreadable, 3 useful but visibly compromised, 5 publication-ready; a quality 5 would not imply pixel identity.

| Stage | Semantic completeness | Communication quality | Fidelity |
| --- | ---: | ---: | ---: |
| v0 | 4 | 2 | 2 |
| v1 | 5 | 3 | 3 |
| v2 | 5 | 4 | 4 |

Inspected the full original, v0, v1, v2, and publication comparison. `comparison.png` retains full content and aspect ratios; `detail-selection.json` names a specific detail region for the supplied screenshot crop workflow. No raw pixel-difference score is claimed. The original source and attribution are in [source.md](source.md). Primary page: https://www.figma.com/blog/how-figma-scaled-to-multiple-databases/.

## Independent dimensions

**Semantics and grouping.** All four stages and nineteen service/store instances remain. Prepare connects both poolers to the original. Replicate adds the original-to-replica connection. Pause removes the second pooler output. Reroute connects that pooler to the promoted store and reverses replication. The absence of the paused path is intentional, not a missing render.

**Composition, reading path, spacing, and containment.** v1 recovers strong role color and moves stage-progress arrows to top ports. v2 gives corresponding objects the same coordinates in each panel; the pause and reversal now read by comparison. Stage headers remain much smaller and farther left than the source headings.

**Typography.** The source uses a broad heading scale and simple centered component labels. Native labels are consistent, but exact-size panels do not increase type scale; at a narrow publication width the full four-panel figure still needs the supplied detail view. The chosen fixed sizes and gaps also contribute to that scale problem; it is not entirely imposed by the tool.

**Routes, arrowheads, and annotations.** The v0 next1 route crosses two nodes and is reported by check. v1/top ports remove those warnings. v2 chooses top/bottom component ports and left/right replication ports; every path is visible and the graph is correctly directed. Source drop shadows and some stylized route treatment are absent.

**Color, contrast, borders, and finish.** Green canvas, yellow poolers, white app blocks, and blue stores retain the visual grammar. Pills are explicitly used as the closest native store silhouette; at the chosen aspect ratio they look nearly circular, not cylindrical. There is no native cylinder or extrusion in the DSL/CLI outline set.

## Actual iteration history

v0 crosses the next stage. v1 styling and explicit stage ports remove that warning. v2 locks repeated geometry and store alignment. No third refinement was spent trying to fake cylinders with extra graph nodes.

**Refinement cycles after v0: 2. Stopping reason: unsupported primitive.** The final source is not a guarantee that another allowed native design could not improve it. It is the closest completed attempt within this explicit protocol. 

## Effort and source resilience

| Stage | Non-comment lines | Declarations | Layout/refinement lines | Pins | Nudges | Manual-size lines | Styling lines / assignments |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| v0 | 50 | 44 | 5 | 0 | 0 | 0 | 0 / 0 |
| v1 | 62 | 44 | 12 | 0 | 0 | 0 | 28 / 47 |
| v2 | 93 | 44 | 43 | 19 | 0 | 23 | 28 / 47 |

Counts use `scripts/aggregate.py:effort`: declarations are node/group/edge; manual-size lines also include minimum dimensions and explicit note widths. Styling assignments count theme selection/attributes, family swatch attributes, and node/group color/shade. Categories intentionally overlap and should not be summed as a total. Exact count data is in `effort.json`; global `effort.csv` is recomputable. **Authoring time was not measured.** Execution timings below are measured command durations, not human effort.

**How nasty did the DSL become?** High but transparent: nineteen pins and nineteen exact node sizes duplicate a five-component coordinate template across four panels. The layout remains readable in source, but the author owns every panel dimension and shared coordinate.

```draft
pin replicate.pg1 x=0 y=200
pin replicate.pg2 x=180 y=200
pin replicate.original x=0 y=400
pin replicate.replica x=180 y=400
```

## Residual losses and implementation evidence

- Native pills cannot reproduce database cylinders and their top ellipses.
- Large centered stage headings and offset black shadows are absent.
- Many fixed coordinates and sizes are required for panel correspondence.

Provisional gap keys: I-PANEL-GEOMETRY, I-TYPE, I-VISUAL-VOCAB, I-GROUP-ROUTING. These map to the cross-corpus audit; a single case does not establish a common gap. Implementation grounding: `src/dsl/syntax.ts` `DSL_SHAPES`; `src/cli/svg.ts` `outline`; `src/model/routes.ts` group routing and port handling; `docs/DSL.md` Refinements. Distinguish native source exposure from internal capability: model label offsets/leaders, image kinds, and edge waypoints exist in places but are not therefore authorable in this baseline's .draft syntax. Future fixes and visual proof suggestions are in the main gap audit, not implemented here.

## Execution status

All three delivered source hashes match successful check/inspect/SVG/shoot manifests. Check exit 0 may still contain warnings, enumerated below. v0's hash remains frozen. References are original third-party bytes; PNG reference previews are conversions only when the original is SVG/JPEG. No source image is imported into a native diagram.

- **v0:** check=0, inspect=0, svg=0, shoot=0; total command execution 3.849 s. `logs/figma-database-migration/v0/20261102T032029174228Z`. Check output: warning Edge next1 (prepare -> replicate) runs through replicate.pg1. The layout could not avoid it; move or resize a neighbour. [edge-through-node] warning Edge next1 (prepare -> replicate) runs through replicate.pg2. The layout could not avoid it; move or resize a neighbour. [edge-through-node] Warnings: 19 nodes, 4 groups, 21 connections.
- **v1:** check=0, inspect=0, svg=0, shoot=0; total command execution 3.601 s. `logs/figma-database-migration/v1/20261102T032410720634Z`. Check output: OK: 19 nodes, 4 groups, 21 connections.
- **v2:** check=0, inspect=0, svg=0, shoot=0; total command execution 3.822 s. `logs/figma-database-migration/v2/20261102T032725933866Z`. Check output: OK: 19 nodes, 4 groups, 21 connections.
