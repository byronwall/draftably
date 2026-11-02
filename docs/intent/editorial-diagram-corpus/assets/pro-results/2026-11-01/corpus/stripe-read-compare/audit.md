# E08 — Online migration: read and compare results

## Verdict and visual evidence

**v0 readability versus reference: worse.** The default preserves the two data sources and convergence but makes nested data look like nested service boxes. The source type hierarchy and sweeping arrows communicate record structure much more directly. All ratings below are visual judgments of actual unchanged-baseline renders. Semantic completeness, standalone communication quality, and reference fidelity are separate axes. The anchors are 1 misleading/unreadable, 3 useful but visibly compromised, 5 publication-ready; a quality 5 would not imply pixel identity.

| Stage | Semantic completeness | Communication quality | Fidelity |
| --- | ---: | ---: | ---: |
| v0 | 4 | 3 | 2 |
| v1 | 4 | 3 | 3 |
| v2 | 4 | 3 | 3 |

Inspected the full original, v0, v1, v2, and publication comparison. `comparison.png` retains full content and aspect ratios; `detail-selection.json` names a specific detail region for the supplied screenshot crop workflow. No raw pixel-difference score is claimed. The original source and attribution are in [source.md](source.md). Primary page: https://stripe.com/blog/online-migrations.

## Independent dimensions

**Semantics and grouping.** Customer Lisa Spiers retains a subscriptions field and tv/internet/phone values; the separate subscription store retains all three corresponding identifiers. Two reads converge on the compare result. v1/v2 use native cells/text shapes for actual record values, not fake annotation nodes. The source stack marks plausibly signal collections or record multiplicity; that cue is not preserved. Because its exact intended semantics are not independently stated, the conservative semantic score is 4 throughout, even though every named field and read relation remains.

**Composition, reading path, spacing, and containment.** v0 has excessive framed nesting and an off-center comparison. v1 reduces value box noise but sends the right read around the top. v2 pins the records and convergence, uses bottom exits, and final cycle restores the shorter right record. The left panel still has too much unused space at equal publication width. That minimum-height choice is an authoring residual; it is not evidence that the tool forces empty panels.

**Typography.** The source deliberately contrasts large light headings, a bold entity, normal field name, and italic values. Native theme-level sans text is uniform and substantially smaller within the panels. This is the main remaining communication/fidelity loss, not a font rasterization issue.

**Routes, arrowheads, and annotations.** Final v2 has two clear directed reads with no check warning. Their long orthogonal paths and terminal orientation differ from the source sweeping curves. The lower-right arrow ends beside the comparison text rather than reproducing the exact angled convergence.

**Color, contrast, borders, and finish.** Final colors are quiet warm and mint surfaces, closer than the stronger first v2. The source collection/record stack cue, field indentation rule, and italic value styling are absent. The stack cue may be semantic rather than decorative; its loss is counted in the semantic qualification, not dismissed as finish alone.

## Actual iteration history

The first pinned v2 made both record panels too tall. Its successful source, SVG/PNG, geometry and logs are preserved in trials/v2-first-refinement. The final third cycle restores the right panel natural height and quiets the palette; all native commands succeeded. No fourth refinement.

**Refinement cycles after v0: 3. Stopping reason: effort limit.** The final source is not a guarantee that another allowed native design could not improve it. It is the closest completed attempt within this explicit protocol. 

## Effort and source resilience

| Stage | Non-comment lines | Declarations | Layout/refinement lines | Pins | Nudges | Manual-size lines | Styling lines / assignments |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| v0 | 15 | 13 | 1 | 0 | 0 | 0 | 0 / 0 |
| v1 | 25 | 13 | 5 | 0 | 0 | 0 | 11 / 33 |
| v2 | 29 | 13 | 9 | 3 | 0 | 5 | 11 / 33 |

Counts use `scripts/aggregate.py:effort`: declarations are node/group/edge; manual-size lines also include minimum dimensions and explicit note widths. Styling assignments count theme selection/attributes, family swatch attributes, and node/group color/shade. Categories intentionally overlap and should not be summed as a total. Exact count data is in `effort.json`; global `effort.csv` is recomputable. **Authoring time was not measured.** Execution timings below are measured command durations, not human effort.

**How nasty did the DSL become?** Moderate. Four nested scopes, quiet custom shades, two cell recipes, three pins, one exact node size, and several minimum widths express what is largely typographic record layout. The hierarchy stays readable in source, but the workaround is verbose and exact typography remains unavailable.

```draft
layout nested cells direction=down min-width=254
layout subscriptions cells direction=down min-width=350
pin compare x=285 y=480
size compare width=330 height=64
```

## Residual losses and implementation evidence

- Uniform small bold type loses entity/field/value hierarchy and italic values.
- Large manual panels contain excessive blank area.
- Curved read paths and indentation details are absent.
- Source stack marks may indicate collection/record multiplicity; that cue is lost and semantic ratings are conservatively 4.

Provisional gap keys: I-TYPE, I-LABEL-EXPOSURE, I-PANEL-GEOMETRY. These map to the cross-corpus audit; a single case does not establish a common gap. Implementation grounding: `src/dsl/cells.ts`; `src/dsl/syntax.ts` theme and node attributes; `src/cli/svg.ts` node/group text rendering; `src/model/types.ts` `EdgeLayout` exposes internal waypoints not serialized by native source. Distinguish native source exposure from internal capability: model label offsets/leaders, image kinds, and edge waypoints exist in places but are not therefore authorable in this baseline's .draft syntax. Future fixes and visual proof suggestions are in the main gap audit, not implemented here.

## Execution status

All three delivered source hashes match successful check/inspect/SVG/shoot manifests. Check exit 0 may still contain warnings, enumerated below. v0's hash remains frozen. References are original third-party bytes; PNG reference previews are conversions only when the original is SVG/JPEG. No source image is imported into a native diagram.

- **v0:** check=0, inspect=0, svg=0, shoot=0; total command execution 3.664 s. `logs/stripe-read-compare/v0/20261102T032005303106Z`. Check output: OK: 7 nodes, 4 groups, 2 connections.
- **v1:** check=0, inspect=0, svg=0, shoot=0; total command execution 3.522 s. `logs/stripe-read-compare/v1/20261102T032357613164Z`. Check output: info    line 9: lisa, nested repeat their containers’ colors. Drop the color to inherit it, or give the member a family of its own. OK: 7 nodes, 4 groups, 2 connections.
- **v2:** check=0, inspect=0, svg=0, shoot=0; total command execution 3.506 s. `logs/stripe-read-compare/v2/20261102T032940571977Z`. Check output: info    line 9: lisa, nested repeat their containers’ colors. Drop the color to inherit it, or give the member a family of its own. OK: 7 nodes, 4 groups, 2 connections.
