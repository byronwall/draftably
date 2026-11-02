# D2 companion: supported graph subset and limits

**Status — `IMP-10`, Explore.** This is working TypeScript for the documented ordinary-graph subset, pinned to `@d2lang/d2@0.1.34` (engine `v0.9.0`). It imports a resolved snapshot into native `.draft` source. Production UI/CLI integration, a hard compiler deadline, memory containment, and browser packaging verification remain unfinished. It never writes D2 or maintains synchronization with D2 input.

## Entry points and exact scope

- `normalizeD2(response)` checks the official compiler response and produces `D2Facts` plus diagnostics.
- `d2FactsToNative(facts, title?)` maps those facts through the shared native emitter, deterministic ID allocator, and native graph limits. Every fatal error returns no native source; warnings yield `needs-review`.
- `importD2Experimental(source, title?)` demonstrates the actual optional package integration. **Do not expose this unsupervised entry point to arbitrary input in the shipped product.**

| Feature | Companion behavior |
|---|---|
| Scoped IDs, nested containers, quoted periods, labels | Resolved by D2; preserve identity, containment, and literal labels. Keep original full IDs in the result's ID map. |
| Ordinary `->` and `<-` edges, repeated parallel edges | Preserve one relationship per compiler edge; reverse endpoints for `<-`; retain distinct indexed edge IDs and central labels. |
| `--` | Preserve one undirected edge, but flag `requires: ["IMP-02-native-undirected"]`. The proposed emitted `directed=false` is **not accepted by the unmodified Draftably baseline**. |
| `<->`, specialized arrowheads, endpoint labels | Fail with semantic diagnostics; no silent doubling or deletion of relationships. |
| Rectangle, circle, diamond, text | Native box/circle/diamond/text. Square aspect and other shapes need explicit approximation warnings. Containers use native rectangular groups. |
| Right/down direction | Native root and per-group `flow` layouts. Left/up become right/down with a warning; connection meaning is unchanged. |
| Classes, scoped variables, globs, null overrides | Import computed graph values. An official-AST-only scan warns that source rules, class tags, and future edit behavior are not retained. This scan is not a D2 parser. Literal label text containing `vars`, `*`, or `${...}` is not treated as a rule. |
| Explicit styles | Dropped with affected source IDs and attribute names, except connection dashing. A compiler-applied label case transform is retained as text with a separate warning. |
| Coordinates, routing, dimensions, grids, gaps, label positions | Native layout replaces them; explicit constraints receive loss diagnostics. Foreign compilation still computes layout before normalization. |
| Markdown/code/LaTeX labels | Literal text with a warning. No foreign markup rendering or script evaluation. |
| Images, icons, links, tooltips | Omitted with diagnostics. A URL inside a literal label remains inert text, never a native active-resource field. |
| Source configuration and custom `data` | Fixed import compiler options apply; source configuration/data are reported as omitted. |
| Sequence diagrams, SQL tables, UML class compartments, layers/scenarios/steps | Explicitly unsupported; fail before opening a partial native document. A future implementation needs dedicated family/board mappings. |
| New unknown compiler attributes | Fail for review, rather than silently discard potentially meaningful future features. |

## Why the API join is guarded

The stock JS `result.graph` is not a complete serialized semantic graph: Go omits object parent/children pointers and edge endpoint pointers from its normal JSON. `diagram.shapes` has full canonical IDs and levels; `diagram.connections` has full endpoint IDs. The pinned exporter constructs these arrays in exactly the order of `graph.objects` and `graph.edges`.

The normalizer checks array counts, unique IDs, local object IDs, and hierarchy before joining source attributes with target objects. It finds each parent among actual canonical IDs with a level difference of one and a whole-ID prefix; it never splits on periods. `"a.b"` and `"a.b"."x.y"` therefore preserve quoted segments. Empty Go slices are handled as `null` where observed, despite the package declarations saying arrays.

Semantic arrow flags come from `graph.edges[i].src_arrow` / `dst_arrow`. A source can style a target arrowhead to `none` while retaining the declared `->` relationship; reading only rendered arrowheads would erase direction. This case has a real compiler fixture. The positional edge metadata contract still depends on the pinned exporter: upgrade the dependency only after fixture/API review.

Sources: [D2 graph fields](https://github.com/d2lang/d2/blob/6a7b4837838a3907604a1d9eec57ee98b6f3cd01/d2graph/d2graph.go), [exporter](https://github.com/d2lang/d2/blob/6a7b4837838a3907604a1d9eec57ee98b6f3cd01/d2exporter/export.go), [AST serialization](https://github.com/d2lang/d2/blob/6a7b4837838a3907604a1d9eec57ee98b6f3cd01/d2ast/d2ast.go), [separate full graph serializer](https://github.com/d2lang/d2/blob/6a7b4837838a3907604a1d9eec57ee98b6f3cd01/d2graph/serde.go).

## Security and cost boundaries

The integration passes a one-file virtual filesystem, `{ 'input.d2': source }`, and fixed `{ layout: 'dagre', themeID: 0, sketch: false }` options. A missing import fails inside that virtual filesystem. It calls `compile`, never `render`, and does not follow compiler-formatted `fs` output or invoke CLI plugins. The official WASM path uses memory-backed files and bundled layout resolvers. Node reads the installed package's WASM/runtime assets; that is distinct from resolving an input-specified file.

The input cap is 256 KiB; the normalizer allows at most 500 objects and 1,200 edges, then the shared emitter checks depth, labels, endpoints and native invariants. **These postcompile graph bounds do not bound compiler expansion, elapsed time, or WASM memory.** A production integration needs a disposable outer worker/process and a hard termination deadline. `Promise.race` alone does not terminate compilation. The current package's `dispose()` waits for initialization, which is another reason this wrapper is experimental.

The controlled fixtures were compiled with test-only `fetch`, Node HTTP and HTTPS denial inherited by workers. The remote-image and Markdown-image fixtures use a reserved `.invalid` hostname. The final `d2-network-audit.log` records guard installation in both main and D2 worker, and no blocked-call marker was observed for any of the 17 fixtures. This tests those exercised code paths; it is not a general sandbox or proof about every future D2 feature. No input image was fetched or rendered in that controlled run.

Installed artifact measurements on Node v24.22.1 / Linux x64: browser entry 11,514,165 raw bytes / 8,558,342 gzip bytes; Node WASM 42,117,145 raw / 11,598,525 gzip bytes. Three tiny graph compiles cost 456/512/460 ms including fresh worker initialization, and 6.5/11.4/6.3 ms warm. These are local measurements, not browser or large-graph benchmarks. Stock compile includes foreign layout that native layout subsequently replaces; consider a semantic-only Go/WASM bridge only if measured shipping cost justifies maintaining it.

Sources: [JS API](https://github.com/d2lang/d2/blob/6a7b4837838a3907604a1d9eec57ee98b6f3cd01/d2js/js/README.md), [WASM compile and resource boundary](https://github.com/d2lang/d2/blob/6a7b4837838a3907604a1d9eec57ee98b6f3cd01/d2js/d2wasm/functions.go), [wrapper lifecycle](https://github.com/d2lang/d2/blob/6a7b4837838a3907604a1d9eec57ee98b6f3cd01/d2js/js/src/index.js), [Go compile API](https://github.com/d2lang/d2/blob/6a7b4837838a3907604a1d9eec57ee98b6f3cd01/d2compiler/compile.go). Exact measurements and method are in `d2-cost-results.json` / `d2-cost.mts`.

## Setup, tests, fixtures

Run from the complete adapter kit:

```bash
pnpm install --frozen-lockfile --ignore-scripts
pnpm build
node --import ./d2-deny-network.mjs --test --test-isolation=none --test-concurrency=1 \
  dist/d2-normalize.test.js dist/d2-importer.test.js

# Optional controlled-fixture regeneration, then native snapshot regeneration:
node --import ./d2-deny-network.mjs --import tsx d2-probe.mts
node dist/make-d2-fixtures.js
```

The two test files contain **22 named tests**, executed successfully. They cover hierarchy, quotes, scoped expansion, IDs, arrows including hidden heads, parallel edges, malformed input, missing imports, unsupported families, unknown attributes, limits and resource inactivity. `fixtures/d2/` contains 17 authored inputs with complete expected results; failed cases intentionally have no `.draft`. The `arrowSubset` native source is gated by the native undirected DSL change. All other emitted native fixtures were checked with the exact baseline's `checkSource` and `projectScene`. Source files and compiler responses are inspectable; no generated SVG is used to infer topology.

The engine/package is MPL-2.0; preserve its license and third-party notices. The current namespace is `@d2lang/d2`, with `@terrastruct/d2` retained for compatibility. TALA is now open source and bundled as of D2 v0.9.0; older proprietary-TALA assumptions are stale. Sources: [v0.9.0 release](https://d2lang.com/releases/0.9.0/), [package](https://github.com/d2lang/d2/blob/6a7b4837838a3907604a1d9eec57ee98b6f3cd01/d2js/js/package.json), [third-party notices](https://github.com/d2lang/d2/blob/6a7b4837838a3907604a1d9eec57ee98b6f3cd01/d2js/js/THIRD_PARTY_NOTICES.txt), [variables](https://d2lang.com/tour/vars/), [globs](https://d2lang.com/tour/globs/), [classes](https://d2lang.com/tour/classes/).
