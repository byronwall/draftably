# E01 — TLS handshake: TCP and TLS message flights

## Verdict and visual evidence

**v0 readability versus reference: comparable.** The default has stronger text contrast and a conventional top-to-bottom message order. The reference is quicker at separating TCP from TLS and showing transit time. Those gains and losses balance for reading the message names, but not for temporal fidelity. All ratings below are visual judgments of actual unchanged-baseline renders. Semantic completeness, standalone communication quality, and reference fidelity are separate axes. The anchors are 1 misleading/unreadable, 3 useful but visibly compromised, 5 publication-ready; a quality 5 would not imply pixel identity.

| Stage | Semantic completeness | Communication quality | Fidelity |
| --- | ---: | ---: | ---: |
| v0 | 4 | 4 | 2 |
| v1 | 4 | 4 | 3 |
| v2 | 4 | 4 | 3 |

Inspected the full original, v0, v1, v2, and publication comparison. `comparison.png` retains full content and aspect ratios; `detail-selection.json` names a specific detail region for the supplied screenshot crop workflow. No raw pixel-difference score is claimed. The original source and attribution are in [source.md](source.md). Primary page: https://www.cloudflare.com/learning/ssl/what-happens-in-a-tls-handshake/.

## Independent dimensions

**Semantics and grouping.** Both actors and all six drawn flights are retained, including the bundled message lists. ACK and ClientHello share the third flight. The reference colors ACK as TCP above ClientHello; the native third flight sits in the TLS band, so that boundary is explicitly schematic. The 50 ms and 110 ms values remain text; sloped transit time is not encoded.

**Composition, reading path, spacing, and containment.** v0 is a readable tall sequence. v1 adds phase bands; v2 tightens participant padding and makes bundled-message wrapping deliberate. All native attempts are much taller relative to width than the wide reference and replace its outside message blocks with labels between lifelines.

**Typography.** Native Inter is consistent and legible. The reference uses oversized side blocks and actor captions; native message labels share one annotation style. v2 line breaks improve bundle scanning. There is no claim of matching the reference font or exact text scale.

**Routes, arrowheads, and annotations.** Horizontal arrows are clear and correctly directed. They cannot represent the source sloped flights: routes.ts messageRoute explicitly assigns both endpoints the same row. Native phase duration is a caption, not an axis. Device illustrations and gradient icon strokes are absent.

**Color, contrast, borders, and finish.** The neutral v2 strokes avoid implying that every flight is blue TCP. Alternating phase surfaces replace meaningful blue/yellow message colors. The actor color family now produces visible outlines; broad canvas color and radius are adjustable.

## Actual iteration history

v0 froze before any theme edits. v1 used phase bands and a source-like canvas. v2 changed the actor outline color and explicit bundle line breaks; no trial failures.

**Refinement cycles after v0: 2. Stopping reason: unsupported primitive.** The final source is not a guarantee that another allowed native design could not improve it. It is the closest completed attempt within this explicit protocol. 

## Effort and source resilience

| Stage | Non-comment lines | Declarations | Layout/refinement lines | Pins | Nudges | Manual-size lines | Styling lines / assignments |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| v0 | 11 | 8 | 1 | 0 | 0 | 0 | 0 / 0 |
| v1 | 14 | 8 | 1 | 0 | 0 | 0 | 4 / 14 |
| v2 | 15 | 8 | 1 | 0 | 0 | 0 | 4 / 14 |

Counts use `scripts/aggregate.py:effort`: declarations are node/group/edge; manual-size lines also include minimum dimensions and explicit note widths. Styling assignments count theme selection/attributes, family swatch attributes, and node/group color/shade. Categories intentionally overlap and should not be summed as a total. Exact count data is in `effort.json`; global `effort.csv` is recomputable. **Authoring time was not measured.** Execution timings below are measured command durations, not human effort.

**How nasty did the DSL become?** Low. Two participants, six messages, two phases, one custom actor color, and a few explicit line breaks. No geometry refinements; sequence intentionally ignores them.

```draft
phase tcp "TCP · 50 ms" syn synack
phase tls "TLS · 110 ms" hello serverhello key finished
layout root sequence
```

## Residual losses and implementation evidence

- No sloped or time-proportional message flight.
- ACK/ClientHello straddles a semantic phase boundary that the native single message row cannot color separately.
- Device illustrations, exterior colored message blocks, and exact source typography are absent.

Provisional gap keys: I-TIME, I-EDGE-COLOR, I-LABEL-EXPOSURE, I-VISUAL-VOCAB. These map to the cross-corpus audit; a single case does not establish a common gap. Implementation grounding: `src/dsl/compile.ts` `sequenced`; `src/model/routes.ts` `messageRoute`; `src/dsl/syntax.ts` `ModelEdge` and edge attribute allow-list; `tests/sequence.test.ts`. Distinguish native source exposure from internal capability: model label offsets/leaders, image kinds, and edge waypoints exist in places but are not therefore authorable in this baseline's .draft syntax. Future fixes and visual proof suggestions are in the main gap audit, not implemented here.

## Execution status

All three delivered source hashes match successful check/inspect/SVG/shoot manifests. Check exit 0 may still contain warnings, enumerated below. v0's hash remains frozen. References are original third-party bytes; PNG reference previews are conversions only when the original is SVG/JPEG. No source image is imported into a native diagram.

- **v0:** check=0, inspect=0, svg=0, shoot=0; total command execution 3.971 s. `logs/cloudflare-tls-handshake/v0/20261102T032025164140Z`. Check output: OK: 2 nodes, 0 groups, 6 connections.
- **v1:** check=0, inspect=0, svg=0, shoot=0; total command execution 3.164 s. `logs/cloudflare-tls-handshake/v1/20261102T032408877240Z`. Check output: OK: 2 nodes, 0 groups, 6 connections.
- **v2:** check=0, inspect=0, svg=0, shoot=0; total command execution 3.364 s. `logs/cloudflare-tls-handshake/v2/20261102T032724317333Z`. Check output: OK: 2 nodes, 0 groups, 6 connections.
