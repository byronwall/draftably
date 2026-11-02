# E06 — Chrome multi-process architecture, Figure 8

## Verdict and visual evidence

**v0 readability versus reference: worse.** The five process names survive, but v0 makes a tall column with return routes and loses the source illustrated thread/activity explanation. The reference makes process position and multiplicity much easier to scan. All ratings below are visual judgments of actual unchanged-baseline renders. Semantic completeness, standalone communication quality, and reference fidelity are separate axes. The anchors are 1 misleading/unreadable, 3 useful but visibly compromised, 5 publication-ready; a quality 5 would not imply pixel identity.

| Stage | Semantic completeness | Communication quality | Fidelity |
| --- | ---: | ---: | ---: |
| v0 | 3 | 3 | 2 |
| v1 | 3 | 4 | 3 |
| v2 | 3 | 3 | 2 |

Inspected the full original, v0, v1, v2, and publication comparison. `comparison.png` retains full content and aspect ratios; `detail-selection.json` names a specific detail region for the supplied screenshot crop workflow. No raw pixel-difference score is claimed. The original source and attribution are in [source.md](source.md). Primary page: https://developer.chrome.com/blog/inside-browser-part1.

## Independent dimensions

**Semantics and grouping.** Five process classes and all six undirected links remain. Renderer and plugin use native count=many stacks, honestly conveying multiplicity. The browser/renderer thread loops and responsibility illustrations are not reproduced; these carry meaningful information in the source, so semantic completeness is 3 rather than 5.

**Composition, reading path, spacing, and containment.** v1 stress layout plus near constraints approximates the reference topology well. The first valid v2 preserves topology but is unnecessarily tall with empty process rectangles, so communication quality regresses. The third attempt tried a compact source-like offset; its negative pin is invalid and is retained as a rejected trial.

**Typography.** Labels are clear, centered Inter. The reference has a friendly hand-drawn face and top-aligned captions above miniature thread illustrations. No exact font match, top label mode, or icon placement was invented in .draft.

**Routes, arrowheads, and annotations.** Dashed undirected native links retain adjacency; dashes are a visual approximation to the source dotted IPC lines, not an assertion about async behavior. Native routes are orthogonal. The source endpoint dots, diagonal links, and busy thread paths are absent.

**Color, contrast, borders, and finish.** Monochrome outlines and count badges are useful native defaults, and the stack treatment is a real feature win. Native stack plates use a standard treatment rather than the exact source offsets. The valid v2 is not publication-ready at the same footprint as the reference.

## Actual iteration history

Confirmation case: audited now, reserved from numerical tuning of future fixes. v1 is compact. The valid second refinement is v2. Third-cycle source and four exit-1 logs are in trials/v2-third-cycle-negative-pin. A snapshot of the earlier successful source/render is in trials/v2-first-refinement and was restored verbatim; its validation hash matches the final source.

**Refinement cycles after v0: 3. Stopping reason: effort limit.** The final source is not a guarantee that another allowed native design could not improve it. It is the closest completed attempt within this explicit protocol. For communication, prefer v1 over the valid but over-tall v2.

## Effort and source resilience

| Stage | Non-comment lines | Declarations | Layout/refinement lines | Pins | Nudges | Manual-size lines | Styling lines / assignments |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| v0 | 13 | 11 | 1 | 0 | 0 | 0 | 0 / 0 |
| v1 | 19 | 11 | 5 | 0 | 0 | 0 | 7 / 16 |
| v2 | 25 | 11 | 11 | 5 | 0 | 5 | 7 / 16 |

Counts use `scripts/aggregate.py:effort`: declarations are node/group/edge; manual-size lines also include minimum dimensions and explicit note widths. Styling assignments count theme selection/attributes, family swatch attributes, and node/group color/shade. Categories intentionally overlap and should not be summed as a total. Exact count data is in `effort.json`; global `effort.csv` is recomputable. **Authoring time was not measured.** Execution timings below are measured command durations, not human effort.

**How nasty did the DSL become?** Low to moderate for the valid sources: five pins and five exact sizes in v2. The final attempted cycle used x=-40 and failed validation. Rather than spend an unauthorized fourth cycle, the earlier successful v2 is restored. v1 is the better compact communication result.

```draft
node renderer "Renderer Process" count=many color=process
edge rg renderer -> gpu directed=false kind=async
pin renderer x=0 y=420
size renderer width=250 height=180
```

## Residual losses and implementation evidence

- Thread loops and responsibility illustrations are missing, reducing semantic completeness.
- The valid v2 is over-tall; v1 is the preferred communication version.
- No top-positioned component captions, endpoint dots, or source hand-drawn line treatment.
- Third-cycle negative pin failed; the earlier successful v2 was restored without a fourth edit.

Provisional gap keys: I-VISUAL-VOCAB, I-LABEL-EXPOSURE, I-TYPE. These map to the cross-corpus audit; a single case does not establish a common gap. Implementation grounding: `src/dsl/syntax.ts` native shape and pin parsing; `src/model/types.ts` `ShapeKind`, `LabelMode`; `src/cli/svg.ts` stack/count rendering; `docs/DSL.md` Counts and Undirected connections. Distinguish native source exposure from internal capability: model label offsets/leaders, image kinds, and edge waypoints exist in places but are not therefore authorable in this baseline's .draft syntax. Future fixes and visual proof suggestions are in the main gap audit, not implemented here.

## Execution status

All three delivered source hashes match successful check/inspect/SVG/shoot manifests. Check exit 0 may still contain warnings, enumerated below. v0's hash remains frozen. References are original third-party bytes; PNG reference previews are conversions only when the original is SVG/JPEG. No source image is imported into a native diagram.

- **v0:** check=0, inspect=0, svg=0, shoot=0; total command execution 4.431 s. `logs/chrome-process-architecture/v0/20261102T032016634194Z`. Check output: OK: 5 nodes, 0 groups, 6 connections.
- **v1:** check=0, inspect=0, svg=0, shoot=0; total command execution 4.059 s. `logs/chrome-process-architecture/v1/20261102T032404769317Z`. Check output: OK: 5 nodes, 0 groups, 6 connections.
- **v2:** check=0, inspect=0, svg=0, shoot=0; total command execution 4.044 s. `logs/chrome-process-architecture/v2/20261102T033529728819Z`. Check output: OK: 5 nodes, 0 groups, 6 connections.
