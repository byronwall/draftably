# Validation record

**Research date:** 2026-10-31 UTC.  
**Native target:** [dd2ababcbe3b9ac011bc23e652309c10cf31cd02](https://github.com/byronwall/draftably/tree/dd2ababcbe3b9ac011bc23e652309c10cf31cd02).  
**Original repository:** clean, unchanged. Native patch applied only to a disposable source copy.

## Executed gates

| Gate | Result | Scope/qualification |
|---|---|---|
| Exact repository access | Confirmed; full untruncated tree with 723 tracked blobs; checkout HEAD exact | Not a review of a moving main branch. |
| Native prerequisite application | `git apply --check` passed | Artifact `native-undirected.patch`; original checkout untouched. |
| Native patch regression tests | **5 suites, 61 tests passed** | Ten new direction regressions +51 existing DSL/translate/sequence/compare cases. Isolated source copy. |
| Clean companion dependency install | **Passed** from supplied frozen lockfile, scripts disabled | 165 installed packages; exact top-level versions; reused authorized package cache. |
| Strict TypeScript build | **Passed** | `pnpm build` in clean companion copy. No production app build claimed. |
| Final companion tests | **61 runner entries passed**, zero failures/skips | 60 registered tests + one facade smoke file running three logged assertion groups. See breakdown below. |
| Baseline native full replay | **19 native outputs pass, 16 rejection snapshots pass, 3 prerequisite skips, 0 failures** | Full `compile` + `projectScene`, not only syntax checking. |
| Patched native full replay | **22 native outputs pass, 16 rejection snapshots pass, 0 skips/failures** | All 38 checked fixtures, with IMP-02 applied. |
| DOT native edit persistence | **Six cases passed** | compile/project → unrelated node title translateEdit → print/reload; checked identities, hierarchy, edge count/direction/labels, ports and constraint flags. |
| Working demo commands | **DOT and Mermaid examples passed** | New native files created in isolated output directory after validation. UI/production CLI not integrated. |
| D2 compiler/network probe | **17 authored compiler fixtures; no attempted resource requests observed** | Test denial loaded in parent and D2 worker; compile-only paths, including .invalid image references. Not a general sandbox proof. |
| Mermaid runtime probe | **Three facade smoke groups passed** | Node DOM requirement, guarded DB snapshot, malformed/family/config errors, real worker termination, inert label text and no host-body insertion. |

Final test breakdown: **24 DOT/native-guard tests, 22 D2 tests, six Mermaid mapping tests, four detection/output contract tests, four native source-budget tests**, plus one facade smoke file. The Node test runner reports 61 entries because the facade contains direct assertions rather than three registered `node:test` cases. The native patch’s 61-test result is a separate run and must not be added to fixture counts as if they were unique end-user scenarios.

## Commands and environment

Environment used: Node **24.22.1**, Linux x64; pnpm **11.25.0**; TypeScript **5.8.3**. The native focused suite used Vitest **5.0.3** and Vite **6.4.3**, matching the baseline lockfile’s Vite resolution. Only this Node/runtime platform was executed.

Clean kit validation:

```bash
pnpm install --frozen-lockfile --ignore-scripts
pnpm test
```

Native replay against the untouched checkout:

```bash
DRAFTABLY_ROOT=/absolute/path/to/exact-baseline \
DRAFTABLY_FULL_LAYOUT=1 pnpm test:native
```

Native replay against the disposable patched copy:

```bash
DRAFTABLY_ROOT=/absolute/path/to/patched-copy \
DRAFTABLY_APPLIED_REQUIREMENTS=IMP-02-native-undirected \
DRAFTABLY_FULL_LAYOUT=1 pnpm test:native
```

The native replay compares object/edge identities, kinds, parentage, labels, shape kinds, edge multiplicity/endpoints/direction/dashing, selected color values and layout declarations. Native color case is compared semantically because native parsing canonicalizes hex spelling.

Native prerequisite focused regression command:

```bash
pnpm exec vitest run tests/undirected.test.ts tests/dsl.test.ts \
  tests/translate.test.ts tests/sequence.test.ts tests/compare.test.ts
```

The executed native regression used a minimal Node test configuration in the disposable copy to avoid unrelated UI/plugin setup. The patch’s source and existing pure compiler/model tests were the subject of that check.

## Fixtures and expected results

**38 total:** DOT15, Mermaid6, D2 17.  
**Statuses:** eight ready, 14 needs-review, 16 failed.  
**Native outputs:** 22, including three using the proposed undirected source attribute.

The three prerequisite fixtures are:

- `dot/strictUndirected`
- `mermaid/explicitUndirected`
- `d2/arrowSubset`

Their baseline skips are intentional and reported. They are not evidence that the unmodified native compiler accepts arrowless relationships.

Failed fixtures contain no `nativeSource` or `facts`; the replay also checks that no stale native output file exists. The root `fixtures.json` holds complete input/result records. Individual expected files and source snapshots are included in the archive.

## Runtime and package measurements

These were local measurements, not browser p95, end-to-end import benchmarks, or exact final product bundle deltas.

| Item | Raw bytes | Gzip bytes | Method |
|---|---:|---:|---|
| `@ts-graphviz/ast` `lib/ast.js` | 116,438 | 20,680 | Published JS file, not final minified application chunk. |
| Mermaid static entry closure | 712,477 | 184,751 | esbuild0.28.2 minified ESM splitting; gzip level9 per file. |
| Mermaid entry plus flowchart closure | 780,022 | 207,152 | Reachable static dependencies for that parse path. |
| All Mermaid emitted chunks | 5,180,446 | 1,507,024 | 106 chunks; not all fetched for one flowchart. |
| Viz ESM distribution | 1,188,719 | 471,109 | Published distribution bytes. |
| D2 browser entry | 11,514,165 | 8,558,342 | Node gzip defaults; distribution file, not a browser request measurement. |
| D2 Node WASM | 42,117,145 | 11,598,525 | Binary only; total install footprint is larger. |

Mermaid sampled dynamic module import: about 496 ms. Controlled parse calls: about 4–21 ms; no claim that worker+JSDOM cold startup costs only that amount.

D2 three cold worker+small-graph compiles: 456.4/511.5/459.9ms; repeated compiles on those workers: 6.5/11.4/6.3ms. Importing the small Node wrapper itself took about 3.6 ms. Stock compilation performs D2 layout before native layout replaces it. Full method/raw readings are in `adapter-kit/d2-cost-results.json` and its probe.

## Problems encountered and resolved

- Bare Node Mermaid strict parsing failed because DOMPurify lacked a DOM. Dedicated-worker JSDOM initialization before dynamic import fixed the exercised cases. This creates a runtime/packaging decision; it is not native Node support from Mermaid.
- A first native test setup used Vite6.3.5 from the package range lower bound and failed before collection. The locked Vite6.4.3 resolved the Vitest5 requirement.
- One new native rank test initially assumed an edge-free flow stacked vertically. The baseline actually preserves authored row order; the test was corrected to compare the intended direction constraint against real baseline behavior.
- During development, pnpm11’s dependency verification tried to install against a shared research node_modules link and hit a read-only-store SQLite error. A clean isolated install from the final lockfile passed without that workaround. The deliverable does not depend on the research link.
- Independent review caught and fixed DOT set deduplication, port precedence, cluster labels, anonymous rank diagnostics, numeric booleans, reserved keyword acceptance, aggregate label expansion and anonymous graph-name escaping. It also caught prototype-like detector hints and the case-sensitive native output suffix. A final full native syntax read found the 300,000-character source limit; the builder now enforces it independently of byte/label budgets, with a focused regression.

These observations are included so earlier successful narrow probes are not mistaken for the final state or for a complete product build.

## Not executed / not established

- Full repository `pnpm check:fast` or `pnpm check` for a product integration.
- Complete engine regression/benchmark suites.
- Production Vite/browser/CLI bundling and installed-package proofs.
- Actual browser UI import, scratch-session persistence or failed-save-switch journeys.
- Safari, Firefox, touch/mobile or declared minimum Node-version compatibility.
- Browser Mermaid hard CPU isolation.
- D2 hard bootstrap/compile timeout, WASM memory bounds or full resource sandboxing.
- Full DOT grammar, all Mermaid families, all D2 shapes/boards/semantics.
- DBML/nomnoml/PlantUML/Structurizr executable adapters or bundle measurements.
- Market share or user demand telemetry.

Those are explicit milestones or deferred scope, not hidden assumptions. All conclusions about parser cost and source API behavior are pinned to the inspected versions; upgrades need fresh compatibility checks.

