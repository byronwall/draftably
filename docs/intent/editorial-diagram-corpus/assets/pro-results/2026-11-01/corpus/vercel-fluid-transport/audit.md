# E05 — Fluid custom transport layer (dark figure)

## Verdict and visual evidence

**v0 readability versus reference: worse.** v0 lays almost the entire architecture on one row and routes two group connections through Node.js. The source separates the high-level request path from the lower execution boundary and colors the response tunnel. All ratings below are visual judgments of actual unchanged-baseline renders. Semantic completeness, standalone communication quality, and reference fidelity are separate axes. The anchors are 1 misleading/unreadable, 3 useful but visibly compromised, 5 publication-ready; a quality 5 would not imply pixel identity.

| Stage | Semantic completeness | Communication quality | Fidelity |
| --- | ---: | ---: | ---: |
| v0 | 4 | 3 | 2 |
| v1 | 4 | 2 | 3 |
| v2 | 4 | 3 | 3 |

Inspected the full original, v0, v1, v2, and publication comparison. `comparison.png` retains full content and aspect ratios; `detail-selection.json` names a specific detail region for the supplied screenshot crop workflow. No raw pixel-difference score is claimed. The original source and attribution are in [source.md](source.md). Primary page: https://vercel.com/blog/fluid-how-we-built-serverless-servers.

## Independent dimensions

**Semantics and grouping.** Client, proxy, router, Lambda API, Lambda VM, Rust Core, and Node.js are retained with all request/response directions and nesting. The native fallback distinguishes responses by dashes and words rather than green/blue hue. That is an explicit alternate encoding, not a claim that transport is asynchronous. However, the global note overgeneralizes solid arrows as request/invocation: the Lambda VM-to-API return is also solid. The original gray duplex HTTP exchange is neutral to the green/blue client-traffic key. This is a retained authoring/legend qualification, so semantic completeness is rated 4, not 5.

**Composition, reading path, spacing, and containment.** v1 restores the upper path/lower VM arrangement using near rules. The first pinned v2 was too tall and shared the TCP return channel with HTTP. The final third cycle widens the composition and separates the TCP route; labels still look small inside the oversized boxes at equal publication width. Those oversized dimensions were author choices, distinct from the absence of local type controls.

**Typography.** The source has large light component labels with icons. Native Inter remains readable at full size, but the per-object type scale and icon-text compositions are not expressible in this native source. Global heading and note also add height relative to the source.

**Routes, arrowheads, and annotations.** v0 reports two edge-through-node warnings; v1 reports the tunnel through API. Final v2 has no drawing warning. Its TCP return remains orthogonal and the paired Lambda/API exchange remains two routes; the original diagonal TCP line and true two-headed connector are not reproduced.

**Color, contrast, borders, and finish.** Dark custom surfaces now match the source tone. v1 revealed pale-on-pale notes: noteMarkup uses slate shade 50 with look.text. Final v2 sets that native color shade to a dark surface, restoring contrast. Per-edge blue/green color and component icons remain absent.

## Actual iteration history

v0 and v1 warnings are retained. A successful but over-tall second refinement is preserved in trials/v2-first-refinement, including PNG/SVG/geometry/logs. The final v2 is cycle 3 and was rendered and visually reviewed. No additional cycle is implied.

**Refinement cycles after v0: 3. Stopping reason: effort limit.** The final source is not a guarantee that another allowed native design could not improve it. It is the closest completed attempt within this explicit protocol. 

## Effort and source resilience

| Stage | Non-comment lines | Declarations | Layout/refinement lines | Pins | Nudges | Manual-size lines | Styling lines / assignments |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| v0 | 17 | 15 | 1 | 0 | 0 | 0 | 0 / 0 |
| v1 | 26 | 15 | 5 | 0 | 0 | 0 | 11 / 27 |
| v2 | 35 | 15 | 13 | 5 | 0 | 8 | 12 / 30 |

Counts use `scripts/aggregate.py:effort`: declarations are node/group/edge; manual-size lines also include minimum dimensions and explicit note widths. Styling assignments count theme selection/attributes, family swatch attributes, and node/group color/shade. Categories intentionally overlap and should not be summed as a total. Exact count data is in `effort.json`; global `effort.csv` is recomputable. **Authoring time was not measured.** Execution timings below are measured command durations, not human effort.

**How nasty did the DSL become?** Moderate to high. Five object pins, five exact node sizes, two minimum-sized containers, explicit ports, a custom dark palette, and a special note-surface override. Paired reverse edges and a dash legend replace source semantics that one colored/two-headed connector should carry.

```draft
theme-color slate shade=50 fill="#202020" stroke="#404040" ink="#eeeeee"
edge tunnel rust -> router "TCP response" constraint=false kind=async from=right to=left
pin lambda x=500 y=180
```

## Residual losses and implementation evidence

- Global connection color cannot preserve green request and blue response paths.
- Two directed edges replace one duplex connector; the diagonal TCP route becomes an orthogonal return.
- Small labels relative to manual box sizes; missing component icons.
- v1 dark-note contrast failed and needs a case-specific slate-50 override.
- The solid-arrow legend overgeneralizes the neutral duplex API/VM exchange; lambda_return is solid too. This is an authoring residual, not a tool gap.

Provisional gap keys: I-EDGE-COLOR, I-DUPLEX, I-LABEL-EXPOSURE, I-TYPE, I-VISUAL-VOCAB, I-DARK-NOTE, I-GROUP-ROUTING. These map to the cross-corpus audit; a single case does not establish a common gap. Implementation grounding: `src/dsl/syntax.ts` `ModelEdge` and edge allow-list; `src/model/routes.ts` `EdgeLayout` use; `src/model/note.ts` `noteMarkup`; `src/cli/svg.ts` `sceneMarkup`. Distinguish native source exposure from internal capability: model label offsets/leaders, image kinds, and edge waypoints exist in places but are not therefore authorable in this baseline's .draft syntax. Future fixes and visual proof suggestions are in the main gap audit, not implemented here.

## Execution status

All three delivered source hashes match successful check/inspect/SVG/shoot manifests. Check exit 0 may still contain warnings, enumerated below. v0's hash remains frozen. References are original third-party bytes; PNG reference previews are conversions only when the original is SVG/JPEG. No source image is imported into a native diagram.

- **v0:** check=0, inspect=0, svg=0, shoot=0; total command execution 3.824 s. `logs/vercel-fluid-transport/v0/20261102T032029618172Z`. Check output: warning Edge lambda_return (lambda -> api) runs through nodejs. The layout could not avoid it; move or resize a neighbour. [edge-through-node] warning Edge tunnel (rust -> router) runs through nodejs. The layout could not avoid it; move or resize a neighbour. [edge-through-node] Warnings: 5 nodes, 2 groups, 8 connections.
- **v1:** check=0, inspect=0, svg=0, shoot=0; total command execution 3.373 s. `logs/vercel-fluid-transport/v1/20261102T032412081129Z`. Check output: warning line 24: Edge tunnel (rust -> router) runs through api. Remove the near on line 24, or move api 32px up. [edge-through-node] Warnings: 5 nodes, 2 groups, 8 connections.
- **v2:** check=0, inspect=0, svg=0, shoot=0; total command execution 4.179 s. `logs/vercel-fluid-transport/v2/20261102T032940638206Z`. Check output: OK: 5 nodes, 2 groups, 8 connections.
