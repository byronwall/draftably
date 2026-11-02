# E07 — HTTP/1.1 and HTTP/2 multiplexing

## Verdict and visual evidence

**v0 readability versus reference: worse.** The first render has a severe line tangle and six edge-through-node warnings. Client/server declared before resource groups, row ordering, and doubled reverse edges all contribute; this is not solely a router defect. All ratings below are visual judgments of actual unchanged-baseline renders. Semantic completeness, standalone communication quality, and reference fidelity are separate axes. The anchors are 1 misleading/unreadable, 3 useful but visibly compromised, 5 publication-ready; a quality 5 would not imply pixel identity.

| Stage | Semantic completeness | Communication quality | Fidelity |
| --- | ---: | ---: | ---: |
| v0 | 4 | 2 | 1 |
| v1 | 5 | 3 | 3 |
| v2 | 5 | 3 | 3 |

Inspected the full original, v0, v1, v2, and publication comparison. `comparison.png` retains full content and aspect ratios; `detail-selection.json` names a specific detail region for the supplied screenshot crop workflow. No raw pixel-difference score is claimed. The original source and attribution are in [source.md](source.md). Primary page: https://blog.cloudflare.com/http-2-for-web-developers/.

## Independent dimensions

**Semantics and grouping.** Both protocol panels retain client/server, all six resource instances apiece, and the contrast between three TCP lanes and one bundle. Opposing native edges preserve two-way meaning; they are not claimed to be a single two-headed arrow. The panel titles keep the connection counts explicit.

**Composition, reading path, spacing, and containment.** v1 order statements put each client/resource/resource/server sequence in the correct order and remove most crossings. v2 vertically centers client/server and aligns both protocols with the same coordinates. The extra group headers and boxes are heavier than the source file icons.

**Typography.** Filenames are legible, but uniform bold cards lose the source icon-plus-label relationship. The figure is taller than the source, and thin gray routes become weak at equal publication width. Resource group headings add words not needed by the original visual grammar.

**Routes, arrowheads, and annotations.** v0 warns on six crossings through nodes; v1 warns on three routes through group titles. v2 has no drawing warnings. Some upper return routes still loop around the client, and opposite edges can sit almost on the same path. Native directed=false removes arrowheads; it does not supply two-ended arrowheads.

**Color, contrast, borders, and finish.** Blue and orange client identity, dark servers, and gray resources reflect the reference. The five named families include neutral custom surfaces, so the many-colors lint is an informational count, not five competing accents. Native source does not expose file/server icon shapes.

## Actual iteration history

v0 preserves the straightforward declaration-order failure. v1 repairs order and ports without manual geometry. v2 aligns object centers and size. All intermediates are the named stages, with no rejected extra cycle.

**Refinement cycles after v0: 2. Stopping reason: diminishing returns.** The final source is not a guarantee that another allowed native design could not improve it. It is the closest completed attempt within this explicit protocol. 

## Effort and source resilience

| Stage | Non-comment lines | Declarations | Layout/refinement lines | Pins | Nudges | Manual-size lines | Styling lines / assignments |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| v0 | 54 | 46 | 7 | 0 | 0 | 0 | 0 / 0 |
| v1 | 62 | 46 | 9 | 0 | 0 | 0 | 28 / 51 |
| v2 | 86 | 46 | 33 | 8 | 0 | 16 | 28 / 51 |

Counts use `scripts/aggregate.py:effort`: declarations are node/group/edge; manual-size lines also include minimum dimensions and explicit note widths. Styling assignments count theme selection/attributes, family swatch attributes, and node/group color/shade. Categories intentionally overlap and should not be summed as a total. Exact count data is in `effort.json`; global `effort.csv` is recomputable. **Authoring time was not measured.** Execution timings below are measured command durations, not human effort.

**How nasty did the DSL become?** High. Twenty-four native edges represent twelve source duplex connections, and explicit ports are repeated on every edge. Eight pins and sixteen exact sizes align the two panels. The source remains inspectable, but adding one file means several new edges and repeated geometry.

```draft
order h1 h1.client h1.out h1.in h1.server
edge h1.t0f h1.o0 -> h1.i0 from=right to=left
edge h1.t0b h1.i0 -> h1.o0 constraint=false from=left to=right
pin h1.out x=220 y=0
```

## Residual losses and implementation evidence

- Paired edge workaround is verbose and creates route competition.
- Thin low-contrast connections and large native card/group overhead remain.
- File, client, and server illustrations are replaced by explicitly labeled native boxes.

Provisional gap keys: I-DUPLEX, I-GROUP-ROUTING, I-VISUAL-VOCAB, I-PANEL-GEOMETRY. These map to the cross-corpus audit; a single case does not establish a common gap. Implementation grounding: `docs/DSL.md` Undirected connections and Routing; `src/dsl/syntax.ts` edge attribute allow-list; `src/model/routes.ts` port allocation/group routes; `tests/edge-labels.test.ts`. Distinguish native source exposure from internal capability: model label offsets/leaders, image kinds, and edge waypoints exist in places but are not therefore authorable in this baseline's .draft syntax. Future fixes and visual proof suggestions are in the main gap audit, not implemented here.

## Execution status

All three delivered source hashes match successful check/inspect/SVG/shoot manifests. Check exit 0 may still contain warnings, enumerated below. v0's hash remains frozen. References are original third-party bytes; PNG reference previews are conversions only when the original is SVG/JPEG. No source image is imported into a native diagram.

- **v0:** check=0, inspect=0, svg=0, shoot=0; total command execution 20.765 s. `logs/cloudflare-http2-multiplexing/v0/20261102T032008816931Z`. Check output: warning Edge h2.cb (h2.out -> h2.client) runs through h2.o1. The layout could not avoid it; move or resize a neighbour. [edge-through-node] warning Edge h2.cf (h2.client -> h2.out) runs through h2.server. The layout could not avoid it; move or resize a neighbour. [edge-through-node] warning Edge h2.sf (h2.in -> h2.server) runs through h2.o1. The layout could not avoid it; move or resize a neighbour. [edge-through-node] warning Edge h2.sf (h2.in -> h2.server) runs through h2.i1. The layout could not avoid it; move or resize a neighbour. [edge-through-node] warning Edge h2.tb (h2.in -> h2.out) runs through h2.i1. The layout could not avoid it; move or resize a neighbour. [edge-through-node] warning Edge h2.tf (h2.out -> h2.in) runs through h2.i1. The layout could not avoid it; move or resize a neighbour. [edge-through-node] Warnings: 16 nodes, 6 groups, 24 connections.
- **v1:** check=0, inspect=0, svg=0, shoot=0; total command execution 3.784 s. `logs/cloudflare-http2-multiplexing/v1/20261102T032400945837Z`. Check output: info    line 41: 5 accent colors (quiet, clientblue, server, resource, clientorange). Use two to four, each for one role, with slate or stone for the rest, and say what each one means with legend lines. info    line 11: h1.out, h1.in, h2.out, h2.in repeat their containers’ colors. Drop the color to inherit it, or give the member a family of its own. warning Edge h1.c0f (h1.client -> h1.o0) crosses the title of h1.out. The layout could not avoid it; move or resize a neighbour. [edge-through-title] warning Edge h1.c1f (h1.client -> h1.o1) crosses the title of h1.out. The layout could not avoid it; move or resize a neighbour. [edge-through-title] warning Edge h1.c2f (h1.client -> h1.o2) crosses the title of h1.out. The layout could not avoid it; move or resize a neighbour. [edge-through-title] Warnings: 16 nodes, 6 groups, 24 connections.
- **v2:** check=0, inspect=0, svg=0, shoot=0; total command execution 5.984 s. `logs/cloudflare-http2-multiplexing/v2/20261102T032711400188Z`. Check output: info    line 41: 5 accent colors (quiet, clientblue, server, resource, clientorange). Use two to four, each for one role, with slate or stone for the rest, and say what each one means with legend lines. info    line 11: h1.out, h1.in, h2.out, h2.in repeat their containers’ colors. Drop the color to inherit it, or give the member a family of its own. OK: 16 nodes, 6 groups, 24 connections.
