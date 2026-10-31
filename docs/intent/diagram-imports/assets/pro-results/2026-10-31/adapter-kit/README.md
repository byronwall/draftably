# draftably read-only importer research kit

Working TypeScript companions for **DOT core**, **Mermaid flowcharts**, and an **experimental D2 ordinary-graph profile**, targeting [draftably dd2ababcbe3b9ac011bc23e652309c10cf31cd02](https://github.com/byronwall/draftably/tree/dd2ababcbe3b9ac011bc23e652309c10cf31cd02).

The adapters create native `.draft` text and diagnostics. They do not write foreign formats, render foreign SVG to recover meaning, synchronize files, or change the product repository. Production UI/session/CLI integration is described in the reports one directory above this kit.

## Setup

Tested on Node **24.22.1**, Linux x64, pnpm **11.25.0**, TypeScript **5.8.3**.

```bash
cd adapter-kit
pnpm install --frozen-lockfile --ignore-scripts
pnpm build
pnpm test
```

The declared Node range is `^22.22.2 || ^24.15.0 || >=26.0.0`, inherited from JSDOM 30.1.3. This is higher than draftably’s baseline Node 22.21.0 minimum. Only Node 24.22.1 was executed here. Choose the product’s runtime/optional-package policy explicitly before integration.

The research kit installs all parser dependencies together. Product code should lazy-load format adapters and keep D2 optional. The D2 optional dependency is expected for the full build/test suite; omitting it requires excluding D2 modules/tests as a separate product packaging decision.

## Actual entry points

```ts
import { importDot } from './dot-importer.js';
const result = importDot('digraph { node[shape=box]; a -> b }');
// result.status: ready | needs-review | failed
// result.nativeSource is absent on fatal errors
```

Mermaid Node flowchart:

```ts
import { JSDOM } from 'jsdom';
import { parseMermaidFlowNode } from './mermaid-node.js';
import { importMermaidFlow } from './mermaid-importer.js';
import { makePlainLabel } from './mermaid-facade.js';

const parsed = await parseMermaidFlowNode('flowchart LR\nA --> B');
const dom = new JSDOM('');
try {
  const result = importMermaidFlow(parsed, makePlainLabel(dom.window.document));
  // Review diagnostics, validate native source, then open a fresh native document.
} finally {
  dom.window.close();
}
```

D2 has `normalizeD2`, `d2FactsToNative` and `importD2Experimental`. Read [D2-NOTES.md](D2-NOTES.md) before using its compiler entry point. The experimental entry point lacks a hard outer deadline/memory supervisor; use controlled fixtures until that is implemented.

### Browser split

`mermaid-browser.ts` lazy-loads the official package and serializes a dedicated parser instance. It requires a DOM and does not implement a hard browser CPU watchdog. Do not move it unchanged to a bare worker or represent a Promise timeout as cancellation.

`mermaid-node.ts` / `mermaid-node-worker.ts` are Node-only. Do not import them or JSDOM into the browser entry. The pure native builder and adapters do not own product state.

## Try the research CLI

Install dependencies in the trusted exact-ref native checkout as well. The demo imports the compiler from that checkout; it never loads code from the foreign source.

```bash
DRAFTABLY_ROOT=/absolute/path/to/draftably \
  pnpm demo fixtures/dot/nested.dot --from dot --output /tmp/new-diagram.draft

DRAFTABLY_ROOT=/absolute/path/to/draftably \
  pnpm demo fixtures/mermaid/nested.mmd --from mermaid \
  --accept-lossy --output /tmp/new-flow.draft
```

Every destination must be a **new lowercase `.draft` path**. Existing files and links are refused. Without `--output`, native source goes to stdout and diagnostics to stderr. A needs-review result returns exit 3 unless explicitly accepted. A fatal failure returns no output; `--accept-lossy` cannot override it.

For controlled D2 experiments only:

```bash
DRAFTABLY_ROOT=/absolute/path/to/draftably \
  node --import ./d2-deny-network.mjs --import tsx dist/import-demo.js \
  fixtures/d2/nested.d2 --from d2 --experimental-d2 \
  --accept-lossy --output /tmp/new-d2.draft
```

This is a research harness, **not an installed `draftably import` command**. Port the behavior to the existing CLI as the plan describes.

## Native undirected prerequisite

Baseline `DiagramEdge` supports direction, but baseline source parsing/projection/translation does not preserve undirected edges. Results with `requires: ['IMP-02-native-undirected']` need the adjacent `native-undirected.patch` applied to a separate reviewed checkout.

```bash
git -C /absolute/path/to/patched-draftably apply --check /path/to/native-undirected.patch
git -C /absolute/path/to/patched-draftably apply /path/to/native-undirected.patch
```

The patch is supplied for Codex to review and own. No patch has been applied to the original research checkout. Older native versions reject the new `directed=false` attribute; the demo validates before creating output and therefore fails safely against an unpatched compiler.

## Native fixture replay

The replay reads expected JSON and emitted native source only; it invokes no foreign parser.

```bash
DRAFTABLY_ROOT=/absolute/path/to/exact-baseline \
DRAFTABLY_FULL_LAYOUT=1 pnpm test:native

DRAFTABLY_ROOT=/absolute/path/to/patched-copy \
DRAFTABLY_APPLIED_REQUIREMENTS=IMP-02-native-undirected \
DRAFTABLY_FULL_LAYOUT=1 pnpm test:native
```

There are **38 fixtures**: eight ready, 14 needing review, 16 atomic failures. Of 22 emitted native documents, three require the undirected patch. Full native compile/project replay passed 19 outputs on the baseline with those three explicitly skipped, and all 22 on the patched copy. Both runs verified all 16 rejection snapshots and had zero failures.

The final clean-install `pnpm test` run reports **61 passing runner entries**. It includes 60 registered unit tests and one facade smoke-test file; that file runs three logged assertion groups. This count is separate from the native patch’s **61 tests across five suites**.

## Regeneration and independent assertions

```bash
pnpm fixtures
```

This regenerates native/expected snapshots from controlled inputs and, for D2, checked-in official compiler responses. To refresh D2 compiler responses deliberately:

```bash
node --import ./d2-deny-network.mjs --import tsx d2-probe.mts
node dist/make-d2-fixtures.js
```

Do not accept changed snapshots without reviewing graph facts and diagnostics. Handwritten tests assert defaults, multiplicity, hierarchy, ID safety, direction, field/family blockers and output atomicity independently of snapshots. Real package upgrades must rerun the API, network, runtime and native replay gates.

## Limits and important omissions

- Common input cap 256 KiB; Mermaid facade 100,000 UTF-8 bytes.
- Native 500 total objects, 1,200 edges, depth 12; label length 16,384 characters; aggregate labels and emitted native source each <=1 MiB; emitted source also <=300,000 characters as the native parser requires.
- DOT grammar is intentionally narrower than full Graphviz; HTML/record ports, some cluster forms, ambiguous label expansions and unsupported endpoint semantics fail.
- Mermaid supports flowcharts only. Frontmatter/config directives, unsupported terminals and invisible links fail.
- D2 supports a resolved ordinary-graph snapshot only. Source rules are reported as inactive after import; classes/SQL/sequence/boards and richer endpoint semantics fail.
- Rich labels/styles/layout are approximated only with diagnostics. No foreign URLs, image paths, callbacks, plugins or includes are silently activated.
- No production browser execution proof, full app build, installed-CLI proof, complete engine suite or performance envelope was claimed. See [../validation-results.md](../validation-results.md).

The network-denial preload is a test hook for fetch/http/https, not a complete security sandbox. The Mermaid Node V8 limit is not an OS/native-memory guarantee. D2’s production hard termination remains unfinished.

## Source index

| File | Role |
|---|---|
| [D2-NOTES.md](D2-NOTES.md) | D2 subset, API assumptions, measured cost and runtime limits |
| [d2-cost-results.json](d2-cost-results.json) | Measured D2 bytes/timings/method |
| [d2-cost.mts](d2-cost.mts) | D2 package/startup measurement probe |
| [d2-deny-network.mjs](d2-deny-network.mjs) | Test-only fetch/http/https denial preload |
| [d2-importer.test.ts](d2-importer.test.ts) | Meaningful parser/native-contract regression tests |
| [d2-importer.ts](d2-importer.ts) | D2 facts to native source and experimental package entry |
| [d2-network-audit.log](d2-network-audit.log) | Controlled D2 network audit evidence |
| [d2-normalize.test.ts](d2-normalize.test.ts) | Meaningful parser/native-contract regression tests |
| [d2-normalize.ts](d2-normalize.ts) | Guarded official D2 compiler response to semantic facts |
| [d2-probe-results.json](d2-probe-results.json) | Actual controlled D2 compiler responses |
| [d2-probe.mts](d2-probe.mts) | Authored real-compiler D2 input corpus |
| [detect.ts](detect.ts) | Explicit/extension/fence/signature dispatcher |
| [dot-importer.test.ts](dot-importer.test.ts) | Meaningful parser/native-contract regression tests |
| [dot-importer.ts](dot-importer.ts) | DOT-core parser and scoped semantic evaluator |
| [import-contract.test.ts](import-contract.test.ts) | Meaningful parser/native-contract regression tests |
| [import-core.test.ts](import-core.test.ts) | Meaningful parser/native-contract regression tests |
| [import-core.ts](import-core.ts) | Native source builder, diagnostics, ID allocation and limits |
| [import-demo.ts](import-demo.ts) | Executable research import CLI |
| [make-d2-fixtures.ts](make-d2-fixtures.ts) | Controlled fixture and native snapshot generator |
| [make-dot-fixtures.ts](make-dot-fixtures.ts) | Controlled fixture and native snapshot generator |
| [make-mermaid-fixtures.ts](make-mermaid-fixtures.ts) | Controlled fixture and native snapshot generator |
| [mermaid-browser.ts](mermaid-browser.ts) | DOM browser provider; hard CPU isolation unfinished |
| [mermaid-facade.test.ts](mermaid-facade.test.ts) | Meaningful parser/native-contract regression tests |
| [mermaid-facade.ts](mermaid-facade.ts) | Pinned guarded Mermaid flowchart DB snapshot and inert label helper |
| [mermaid-importer.test.ts](mermaid-importer.test.ts) | Meaningful parser/native-contract regression tests |
| [mermaid-importer.ts](mermaid-importer.ts) | Flowchart snapshot to native source |
| [mermaid-node-worker.ts](mermaid-node-worker.ts) | Worker-owned JSDOM and Mermaid instance |
| [mermaid-node.ts](mermaid-node.ts) | Terminable Node worker provider |
| [native-validation.ts](native-validation.ts) | Replay expected native facts against chosen native checkout |
| [package.json](package.json) | Pinned direct dependencies and scripts |
| [pnpm-lock.yaml](pnpm-lock.yaml) | Exact reproducible transitive resolutions |
| [safe-output.ts](safe-output.ts) | Validated create-only native output |
| [tsconfig.json](tsconfig.json) | Strict standalone TypeScript build |


Individual fixture files are under `fixtures/dot`, `fixtures/mermaid` and `fixtures/d2`. The complete input/result catalog is [../fixtures.json](../fixtures.json). The archive contains source and fixtures only; it omits node_modules and generated dist output.

## Dependency/licensing notes

Exact pins and transitive resolutions are in `package.json` / `pnpm-lock.yaml`. Top-level packages: `@ts-graphviz/ast` MIT; Mermaid MIT; JSDOM MIT; D2 MPL-2.0. This does not make every transitive/bundled component MIT: Mermaid includes ELK and DOMPurify licenses; D2’s WASM includes its own third-party notices. Preserve notices from the actual shipped build. The report’s source ledger links official manifests, licenses, APIs and maintenance evidence.

No new foreign writer or synchronization layer is present.

