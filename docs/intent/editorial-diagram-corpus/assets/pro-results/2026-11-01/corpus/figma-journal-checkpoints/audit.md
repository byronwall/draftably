# E09 — Checkpoints and incremental journal entries

## Verdict and visual evidence

**v0 readability versus reference: worse.** v0 shows all state memberships but gives panels wildly different sizes, expands all shapes into labeled objects, and does not fade prior journal content. It obscures whole-state versus incremental-state comparison. All ratings below are visual judgments of actual unchanged-baseline renders. Semantic completeness, standalone communication quality, and reference fidelity are separate axes. The anchors are 1 misleading/unreadable, 3 useful but visibly compromised, 5 publication-ready; a quality 5 would not imply pixel identity.

| Stage | Semantic completeness | Communication quality | Fidelity |
| --- | ---: | ---: | ---: |
| v0 | 3 | 2 | 1 |
| v1 | 4 | 3 | 2 |
| v2 | 4 | 3 | 3 |

Inspected the full original, v0, v1, v2, and publication comparison. `comparison.png` retains full content and aspect ratios; `detail-selection.json` names a specific detail region for the supplied screenshot crop workflow. No raw pixel-difference score is claimed. The original source and attribution are in [source.md](source.md). Primary page: https://www.figma.com/blog/making-multiplayer-more-reliable/.

## Independent dimensions

**Semantics and grouping.** All four checkpoint/current-state scenes and five journal entries retain their shape memberships. v1/v2 color previous journal content gray and new content brightly. A diamond explicitly stands for the octagon and a pill for the freeform path. Source circle overlap, detailed canvas appearance, and exact placement are lost; geometric state is only approximated.

**Composition, reading path, spacing, and containment.** v0/v1 panel widths depend on how many objects they contain, undermining cross-panel comparison. v2 gives checkpoint and entry rows stable panel dimensions and uses repeated local positions. It remains taller than the source and avoids intentional overlap, so it cannot reproduce the actual canvas composition.

**Typography.** The reference relies on large row labels and modest panel captions. Native group glyphs and small left-aligned headers add visual noise, while colored objects need readable fallback names. Empty canvas is represented by a labeled native box, an explicit conceptual stand-in.

**Routes, arrowheads, and annotations.** This reference has no graph arrows; the important geometry is overlapping canvas content and a dashed current-state border. There is no attempt to claim a routing improvement. Native fixed group frames do not expose the dashed-border styling used by the current state.

**Color, contrast, borders, and finish.** Lavender canvas and four bright object colors recover the main tone. The gray prior-state objects now correctly differentiate incremental changes. Seven custom family names trigger informational many-colors lint, including neutral region/panel/muted surfaces; color meanings are documented.

## Actual iteration history

Refinement 1 incorrectly used per-node state=muted and all four commands failed. It is preserved under trials/v1-invalid-state-attribute as an authoring mistake. Refinement 2 (the delivered v1) uses an explicit muted color. Refinement 3 (v2) adds all fixed geometry; no further cycle.

**Refinement cycles after v0: 3. Stopping reason: unsupported primitive.** The final source is not a guarantee that another allowed native design could not improve it. It is the closest completed attempt within this explicit protocol. 

## Effort and source resilience

| Stage | Non-comment lines | Declarations | Layout/refinement lines | Pins | Nudges | Manual-size lines | Styling lines / assignments |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| v0 | 46 | 32 | 12 | 0 | 0 | 0 | 0 / 0 |
| v1 | 54 | 32 | 12 | 0 | 0 | 0 | 38 / 71 |
| v2 | 96 | 32 | 54 | 21 | 0 | 30 | 38 / 71 |

Counts use `scripts/aggregate.py:effort`: declarations are node/group/edge; manual-size lines also include minimum dimensions and explicit note widths. Styling assignments count theme selection/attributes, family swatch attributes, and node/group color/shade. Categories intentionally overlap and should not be summed as a total. Exact count data is in `effort.json`; global `effort.csv` is recomputable. **Authoring time was not measured.** Execution timings below are measured command durations, not human effort.

**How nasty did the DSL become?** Very high. Twenty-one pins and twenty-one sizes plus nine panel minimum dimensions maintain only nine temporal scenes. Native geometry is duplicated for every snapshot. A label or shape change needs repeated edits. The original red octagon and green freeform path still cannot be expressed.

```draft
pin j4.b x=0 y=0
size j4.b width=80 height=80
pin j4.g x=100 y=110
size j4.g width=90 height=80
```

## Residual losses and implementation evidence

- Red octagon, green freeform path, and overlapping canvas geometry are substituted explicitly.
- Current-state dashed border and full canvas motif are missing.
- Forty-two object geometry lines plus nine minimum-sized panels are brittle.

Provisional gap keys: I-VISUAL-VOCAB, I-PANEL-GEOMETRY, I-TYPE. These map to the cross-corpus audit; a single case does not establish a common gap. Implementation grounding: `src/dsl/syntax.ts` `DSL_SHAPES` and state declarations; `src/cli/svg.ts` `outline`/group frame rendering; `docs/DSL.md` Emphasis states and Refinements. Distinguish native source exposure from internal capability: model label offsets/leaders, image kinds, and edge waypoints exist in places but are not therefore authorable in this baseline's .draft syntax. Future fixes and visual proof suggestions are in the main gap audit, not implemented here.

## Execution status

All three delivered source hashes match successful check/inspect/SVG/shoot manifests. Check exit 0 may still contain warnings, enumerated below. v0's hash remains frozen. References are original third-party bytes; PNG reference previews are conversions only when the original is SVG/JPEG. No source image is imported into a native diagram.

- **v0:** check=0, inspect=0, svg=0, shoot=0; total command execution 4.002 s. `logs/figma-journal-checkpoints/v0/20261102T032021106932Z`. Check output: OK: 21 nodes, 11 groups, 0 connections.
- **v1:** check=0, inspect=0, svg=0, shoot=0; total command execution 3.177 s. `logs/figma-journal-checkpoints/v1/20261102T032427074966Z`. Check output: info    line 22: 7 accent colors (region, panel, blue, yellow, red, green, muted). Use two to four, each for one role, with slate or stone for the rest, and say what each one means with legend lines. OK: 21 nodes, 11 groups, 0 connections.
- **v2:** check=0, inspect=0, svg=0, shoot=0; total command execution 3.386 s. `logs/figma-journal-checkpoints/v2/20261102T032721124778Z`. Check output: info    line 22: 7 accent colors (region, panel, blue, yellow, red, green, muted). Use two to four, each for one role, with slate or stone for the rest, and say what each one means with legend lines. OK: 21 nodes, 11 groups, 0 connections.
