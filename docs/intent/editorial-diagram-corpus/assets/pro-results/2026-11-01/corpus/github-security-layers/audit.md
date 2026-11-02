# E10 — Agentic Workflows security layers

## Verdict and visual evidence

**v0 readability versus reference: worse.** v0 produces a valid three-by-three layer grid, but mixes component titles and mechanism captions into one uniformly bold label. The source makes the layer, component, and explanation hierarchy much faster to scan. All ratings below are visual judgments of actual unchanged-baseline renders. Semantic completeness, standalone communication quality, and reference fidelity are separate axes. The anchors are 1 misleading/unreadable, 3 useful but visibly compromised, 5 publication-ready; a quality 5 would not imply pixel identity.

| Stage | Semantic completeness | Communication quality | Fidelity |
| --- | ---: | ---: | ---: |
| v0 | 5 | 3 | 2 |
| v1 | 5 | 4 | 3 |
| v2 | 5 | 4 | 3 |

Inspected the full original, v0, v1, v2, and publication comparison. `comparison.png` retains full content and aspect ratios; `detail-selection.json` names a specific detail region for the supplied screenshot crop workflow. No raw pixel-difference score is claimed. The original source and attribution are in [source.md](source.md). Primary page: https://github.blog/ai-and-ml/generative-ai/under-the-hood-security-architecture-of-github-agentic-workflows/.

## Independent dimensions

**Semantics and grouping.** All three layers, nine components, and nine mechanism captions remain. There are no invented dependency arrows. v0 already preserves grouping completely. v1/v2 separate captions as native notes; v2 reserves space inside each layer so captions remain visibly contained.

**Composition, reading path, spacing, and containment.** v0 supports the main row-within-column grid naturally. v1 puts captions outside the short layer frames; v2 expands each frame and widens cards. The final layout is orderly, but source centered large layer headings and individual pale card backplates are absent.

**Typography.** Sans component names and mono annotations reproduce two type roles. Layer headers are still fixed small and left aligned, with a group glyph. The original caption scale/line breaks and large centered headings cannot be independently set through the baseline native language.

**Routes, arrowheads, and annotations.** No graph routes are required. Nine anchored notes use the documented placement search. Reserving frame height lets them fit inside without overlap; this is a useful native workaround, but notes have no own layout footprint and remain dependent on author-managed space.

**Color, contrast, borders, and finish.** Quiet pale layer surfaces and blue component cards are restrained and readable. Native note bars/panels replace the original captions inside pale backplates. Contrast is strong; fidelity remains visibly approximate rather than pixel-perfect.

## Actual iteration history

Confirmation case: reserved from numerical tuning of future fixes. v1 separates component and caption type roles. v2 adds card widths and layer room so notes remain inside. No third cycle and no failed trial.

**Refinement cycles after v0: 2. Stopping reason: diminishing returns.** The final source is not a guarantee that another allowed native design could not improve it. It is the closest completed attempt within this explicit protocol. 

## Effort and source resilience

| Stage | Non-comment lines | Declarations | Layout/refinement lines | Pins | Nudges | Manual-size lines | Styling lines / assignments |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| v0 | 17 | 12 | 4 | 0 | 0 | 0 | 0 / 0 |
| v1 | 29 | 12 | 4 | 0 | 0 | 9 | 15 / 30 |
| v2 | 38 | 12 | 13 | 0 | 0 | 21 | 15 / 30 |

Counts use `scripts/aggregate.py:effort`: declarations are node/group/edge; manual-size lines also include minimum dimensions and explicit note widths. Styling assignments count theme selection/attributes, family swatch attributes, and node/group color/shade. Categories intentionally overlap and should not be summed as a total. Exact count data is in `effort.json`; global `effort.csv` is recomputable. **Authoring time was not measured.** Execution timings below are measured command durations, not human effort.

**How nasty did the DSL become?** Moderate. Nine notes and nine exact node sizes plus three reserved layer heights recreate component/caption pairs. No pins are needed. A longer caption can exceed reserved room, so the source is less resilient than a true card-with-caption recipe.

```draft
layout planning row gap=40 min-height=250
size safe width=230 height=90
note "GitHub write operations" near=safe side=below width=230
```

## Residual losses and implementation evidence

- Fixed left-aligned group headers lack the source centered hierarchy.
- Native note panels replace true attached card captions/backplates.
- Reserved caption room and exact card widths need manual upkeep.

Provisional gap keys: I-TYPE, I-LABEL-EXPOSURE, I-NOTE-LAYOUT, I-PANEL-GEOMETRY. These map to the cross-corpus audit; a single case does not establish a common gap. Implementation grounding: `src/model/note.ts` `placeNotes`/`noteMarkup`; `src/cli/svg.ts` `sceneMarkup`; `src/dsl/syntax.ts` native appearance fields; `tests/themes.test.ts`. Distinguish native source exposure from internal capability: model label offsets/leaders, image kinds, and edge waypoints exist in places but are not therefore authorable in this baseline's .draft syntax. Future fixes and visual proof suggestions are in the main gap audit, not implemented here.

## Execution status

All three delivered source hashes match successful check/inspect/SVG/shoot manifests. Check exit 0 may still contain warnings, enumerated below. v0's hash remains frozen. References are original third-party bytes; PNG reference previews are conversions only when the original is SVG/JPEG. No source image is imported into a native diagram.

- **v0:** check=0, inspect=0, svg=0, shoot=0; total command execution 3.553 s. `logs/github-security-layers/v0/20261102T032009013291Z`. Check output: OK: 9 nodes, 3 groups, 0 connections.
- **v1:** check=0, inspect=0, svg=0, shoot=0; total command execution 3.200 s. `logs/github-security-layers/v1/20261102T032401173963Z`. Check output: OK: 9 nodes, 3 groups, 0 connections.
- **v2:** check=0, inspect=0, svg=0, shoot=0; total command execution 3.404 s. `logs/github-security-layers/v2/20261102T032711519068Z`. Check output: OK: 9 nodes, 3 groups, 0 connections.
