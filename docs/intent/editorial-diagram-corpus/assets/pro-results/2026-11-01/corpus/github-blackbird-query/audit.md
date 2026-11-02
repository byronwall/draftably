# E03 — Blackbird query architecture

## Verdict and visual evidence

**v0 readability versus reference: worse.** v0 stacks all objects in one column and its Redis note overlaps the following Git region. The source full-width bands make hierarchy immediately apparent without introducing flow arrows. All ratings below are visual judgments of actual unchanged-baseline renders. Semantic completeness, standalone communication quality, and reference fidelity are separate axes. The anchors are 1 misleading/unreadable, 3 useful but visibly compromised, 5 publication-ready; a quality 5 would not imply pixel identity.

| Stage | Semantic completeness | Communication quality | Fidelity |
| --- | ---: | ---: | ---: |
| v0 | 4 | 2 | 1 |
| v1 | 5 | 3 | 3 |
| v2 | 5 | 3 | 4 |

Inspected the full original, v0, v1, v2, and publication comparison. `comparison.png` retains full content and aspect ratios; `detail-selection.json` names a specific detail region for the supplied screenshot crop workflow. No raw pixel-difference score is claimed. The original source and attribution are in [source.md](source.md). Primary page: https://github.blog/engineering/the-technology-behind-githubs-new-code-search/.

## Independent dimensions

**Semantics and grouping.** GitHub.com, the query service, Redis, Git, the search-engine boundary, and all four shards are retained. No service arrows were invented: the reference is a containment/layer diagram. Both support captions remain native notes. v0 obscures one caption and nearby content; v1/v2 remove that collision.

**Composition, reading path, spacing, and containment.** v1 uses near/align to form a lower service row. v2 stretches the two top bands and places the engine beside Redis and Git, closely restoring the reference composition. Native captions sit in panels rather than on thin leader lines. At equal publication width, labels remain small relative to the large bands.

**Typography.** Uniform centered node titles and the small left-aligned engine heading do not reproduce the source hierarchy. The custom wide bands grow geometrically while font size remains a theme-level type token. The chosen oversized bands are an authoring decision that contributes to the loss; missing local type controls do not excuse that choice.

**Routes, arrowheads, and annotations.** There are no graph edges in this figure. The important routing issue is annotation association: native notes can be placed near a target but the .draft language does not expose model label leaders or their exact offsets. v0 check correctly reports note-overlap; refined checks have no drawing warnings.

**Color, contrast, borders, and finish.** Quiet gray web/support blocks, blue query/engine regions, and yellow shards are close in role and hue. Rounded native frames and the group glyph remain visible. The diagram is structurally faithful, with a weaker editorial type scale.

## Actual iteration history

v0 warning retained. v1 soft structure resolves the collision. v2 adds exact band dimensions and service placement. The remaining fidelity difference is not hidden by a crop or an image replacement.

**Refinement cycles after v0: 2. Stopping reason: diminishing returns.** The final source is not a guarantee that another allowed native design could not improve it. It is the closest completed attempt within this explicit protocol. 

## Effort and source resilience

| Stage | Non-comment lines | Declarations | Layout/refinement lines | Pins | Nudges | Manual-size lines | Styling lines / assignments |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| v0 | 14 | 9 | 2 | 0 | 0 | 0 | 0 / 0 |
| v1 | 24 | 9 | 7 | 0 | 0 | 2 | 14 / 29 |
| v2 | 32 | 9 | 15 | 5 | 0 | 10 | 14 / 29 |

Counts use `scripts/aggregate.py:effort`: declarations are node/group/edge; manual-size lines also include minimum dimensions and explicit note widths. Styling assignments count theme selection/attributes, family swatch attributes, and node/group color/shade. Categories intentionally overlap and should not be summed as a total. Exact count data is in `effort.json`; global `effort.csv` is recomputable. **Authoring time was not measured.** Execution timings below are measured command durations, not human effort.

**How nasty did the DSL become?** Moderate. Five pins and eight exact node sizes establish two full-width bands and one service row. Two notes need explicit wrap widths. It is legible source, but changing the shard count or long layer label requires revisiting width assumptions.

```draft
pin github x=0 y=0
size github width=1200 height=64
pin engine x=420 y=210
note "Validate blob accessibility" near=git side=below width=160
```

## Residual losses and implementation evidence

- Small text relative to oversized layer panels at publication width.
- Native note panels replace fine annotation leaders.
- Fixed group-header glyph, placement, and scale differ from the quiet source.

Provisional gap keys: I-TYPE, I-LABEL-EXPOSURE, I-PANEL-GEOMETRY, I-NOTE-LAYOUT. These map to the cross-corpus audit; a single case does not establish a common gap. Implementation grounding: `src/model/note.ts` `placeNotes` and `noteMarkup`; `src/model/types.ts` `LabelLayout`; `src/cli/svg.ts` `sceneMarkup`; `src/dsl/syntax.ts` native node attributes. Distinguish native source exposure from internal capability: model label offsets/leaders, image kinds, and edge waypoints exist in places but are not therefore authorable in this baseline's .draft syntax. Future fixes and visual proof suggestions are in the main gap audit, not implemented here.

## Execution status

All three delivered source hashes match successful check/inspect/SVG/shoot manifests. Check exit 0 may still contain warnings, enumerated below. v0's hash remains frozen. References are original third-party bytes; PNG reference previews are conversions only when the original is SVG/JPEG. No source image is imported into a native diagram.

- **v0:** check=0, inspect=0, svg=0, shoot=0; total command execution 3.458 s. `logs/github-blackbird-query/v0/20261102T032005301090Z`. Check output: warning line 11: The note beside redis covers part of the drawing. Try another side=, a smaller width=, or a note without near= in the frame. [note-overlap] Warnings: 8 nodes, 1 group, 0 connections.
- **v1:** check=0, inspect=0, svg=0, shoot=0; total command execution 3.282 s. `logs/github-blackbird-query/v1/20261102T032357621982Z`. Check output: OK: 8 nodes, 1 group, 0 connections.
- **v2:** check=0, inspect=0, svg=0, shoot=0; total command execution 3.358 s. `logs/github-blackbird-query/v2/20261102T032706485461Z`. Check output: OK: 8 nodes, 1 group, 0 connections.
