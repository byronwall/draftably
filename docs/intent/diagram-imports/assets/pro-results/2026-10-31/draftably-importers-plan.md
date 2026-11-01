# Ordered implementation plan: read-only diagram importers

**Target:** [byronwall/draftably@dd2ababcbe3b9ac011bc23e652309c10cf31cd02](https://github.com/byronwall/draftably/tree/dd2ababcbe3b9ac011bc23e652309c10cf31cd02).  
**Scope:** foreign text → new native `.draft` → existing editor. No foreign writer, foreign autosave, source synchronization or remote rendering service.  
**Research date:** 2026-10-31 UTC. The original checkout is unchanged.

This plan uses the stable IMP recommendation IDs from `draftably-importers-report.md`. The report explains the evidence and parser comparisons; `draftably-feature-mapping-and-fixtures.md` defines the exact support promise. The source companions are working partial implementations, not a patch that silently integrates the entire feature.

## Milestone order and release boundaries

| Milestone | Recommendation IDs | Independently verifiable outcome | Current research status |
|---|---|---|---|
| M0 | All | Confirm exact source, identify native persistence constraints and existing plans. | Complete. |
| M1 | IMP-01,03,04,09 | Pure result/detection/ID/diagnostic/source contract, no app-state mutation. | Working companions. |
| M2 | IMP-02 | One undirected edge survives native edit/save/reopen/render. | Applicable, scoped-tested patch. |
| M3 | IMP-05 | DOT-core inputs produce checked native source or an atomic explained failure. | Working partial adapter/fixtures. |
| M4 | IMP-06 | Pinned Mermaid flowchart DB safely lowers to native source. | Node path working; browser isolation unresolved. |
| M5 | IMP-07 | Dedicated CLI creates a new native file; source bytes are unchanged. | Safe output/demo companions; production dispatch proposed. |
| M6 | IMP-08 | Imported native scratch survives reload before its first edit and cannot corrupt another session. | Proposed. |
| M7 | IMP-03,04,08 | Picker/paste/drop/editor/site share import review and opening behavior. | Proposed. |
| M8 | IMP-09,10,11 | Optional D2 graph importer has explicit size, process and packaging gates. | Working mapping; production supervision proposed. |
| M9 | IMP-12–18,20 | Add one clearly bounded family at a time, using real import fixtures. | Research/ordered future work. |
| M10 | All Build items | Product/package/browser/regression proofs, documentation and notices agree with shipped coverage. | Proposed release gate. |

M1 and parser adapter work can run in parallel with M2. Production CLI work can land before browser integration. No arrowless input is advertised until M2 is integrated or the product explicitly blocks that feature. M8 and M9 do not block a useful initial DOT/Mermaid release.

## M0 — Baseline and existing architecture

**Classification:** completed research prerequisite.

The exact commit and full tree were readable. Read the mandatory files and the relevant open/save/edit/CLI/site paths before changing anything. In particular:

- `src/dsl/project.ts::projectScene` and `translate.ts::rejectUnsupported` explain why a raw imported Diagram is not sufficient for source editing.
- `src/state/file-session.ts` owns source history and disables ordinary snapshot persistence.
- `src/server/file-session.ts::createFileSession` is a writable path owner; foreign inputs must never enter it.
- `src/cli/main.ts::read` is shared by mutation commands.
- `docs/IMPORT.md` is historical source provenance, not an importer plan.
- Older “no DOT importer” language was a prior initiative boundary, superseded by this task; it is not a new approval requirement.

**Acceptance:** HEAD equals the requested SHA; source paths are available; related plans and existing import routes are documented. Already achieved. The original repository remains clean.

## M1 — Pure import contract, detection and budgets

**Classification:** Build — IMP-01, IMP-03, IMP-04, IMP-09.

**Suggested affected/new files**

- New `src/import/types.ts`, `ids.ts`, `native-source.ts`, `detect.ts` and a small lazy `index.ts`.
- New `tests/import-contract.test.ts` and `tests/fixtures/import/`.
- Port the relevant parts of `adapter-kit/import-core.ts` and `detect.ts`, adapting naming/style to the project rather than copying an entire framework.

Keep these modules free of Solid, DOM state, server writes and CLI side effects. Per-format adapters own foreign semantics. The shared emitter constructs native source only; `facts` are a fixture/debug aid, not another persisted document type.

**Implementation**

1. Define ready / needs-review / failed results, stable diagnostic codes/impact, original ID mapping, family, parser version and prerequisites.
2. Reserve native identifiers globally across nodes, groups and edges; normalize invalid source IDs deterministically and append collision suffixes. Use Maps or own-property lookups.
3. Use native JSON string quoting; never interpolate labels as raw native statements.
4. Prefer explicit format, extension, selected fence, confident header. Ambiguous D2/nomnoml/prose stays undecided. A parser error does not trigger silent fallback.
5. Distinguish parser syntax failure, unsupported family, unsupported semantic construct, lost appearance and changed layout.
6. Apply size/expansion limits before output. Initial policy: 256 KiB UTF-8; stricter 100,000-byte Mermaid facade; 500 total objects; 1,200 edges; depth 12; 16,384 characters per label; 1 MiB aggregate label bytes and 1 MiB emitted source, plus the actual native parser’s 300,000-character source limit. Error messages state the applicable bound.
7. Call native `checkSource` before offering a candidate, then `compile`/`projectScene` for preview. Do not apply a partial graph on any fatal diagnostic.

**Verification**

- Explicit choice beats extension; extension beats sniffing.
- `graph LR {…}` is DOT, but `graph LR` followed by Mermaid diamond syntax is Mermaid.
- Multiple recognized Markdown fences require selection; an unclosed fence is not silently extracted.
- `constructor` / `__proto__` as filename extensions or fence languages cannot resolve through object prototypes.
- Quoted/newline/Unicode/reserved/colliding IDs and labels cannot inject source.
- Fatal results omit source and facts; warnings require review.
- Native hierarchy, edge endpoint, ancestor-group, expansion and aggregate output caps are checked.
- Repeated conversion of the same input yields the same native source and IDs.

**Exit criterion:** pure tests pass, all successful generated source compiles, and the contract can be called without importing UI state.

**Risk:** a generic “universal graph IR” grows to obscure family-specific semantics. Keep the common type intentionally small.

## M2 — Native undirected persistence prerequisite

**Classification:** Build — IMP-02.

**Companion:** `native-undirected.patch`. Review and apply only in Codex’s intended worktree. It has not been applied to the original research checkout.

**Affected files in the patch**

- `src/dsl/syntax.ts`: optional native direction attribute and validation.
- `src/dsl/project.ts`: preserve direction when constructing `DiagramEdge`.
- `src/dsl/translate.ts`: permit/persist undirected edits while retaining unrelated unsupported-feature checks.
- `src/dsl/compile.ts`: undirected edges do not impose directed ranking; preserve adjacency/geometry behavior.
- `src/dsl/compare.ts`: changing direction preserves the before/after meaning.
- `src/cli/svg.ts`: condition terminal marker on direction.
- `tests/undirected.test.ts`.
- `docs/DSL.md`, `skills/draftably/SKILL.md` and a changeset.

**Behavior**

```draft
diagram "Related systems" version=1
node a "A"
node b "B"
edge relation a -> b "related" directed=false
layout root flow direction=right
```

There is one edge. `->` remains the native separator; omitted direction keeps previous behavior. Do not introduce Mermaid/DOT/D2 arrow syntax into the writable native language.

**Verification already performed:** patch application check; five native suites, 61 tests, using an isolated source copy. Ten new cases cover defaults/invalid attributes, print/project, unrelated label edit, edge relabel, new edge/direction toggle, native rank behavior, engine adjacency versus `constraint=false`, SVG marker omission and comparison direction.

**Required product gate**

```bash
pnpm install --frozen-lockfile
git apply --check /path/to/native-undirected.patch
git apply /path/to/native-undirected.patch
pnpm exec vitest run tests/undirected.test.ts tests/dsl.test.ts \
  tests/translate.test.ts tests/sequence.test.ts tests/compare.test.ts
pnpm check:fast
```

Then run engine and rendering/package checks at M10. Validate a real file-backed unrelated edit, save and reopen. Older draftably versions will reject `directed=false`; document that compatibility boundary.

**Risk:** ordered endpoint fields remain useful for physical routing, so reversing an undirected source notation is not promised to preserve identical pixels. Directional meaning, occurrence count and native editability are the acceptance criteria.

## M3 — DOT-core adapter

**Classification:** Build — IMP-05.

**Suggested affected/new files**

- `src/import/dot.ts` and lazy worker/provider boundary.
- `tests/import-dot.test.ts` and DOT fixtures.
- `package.json` / lockfile: exact `@ts-graphviz/ast@3.0.10`.
- New `docs/IMPORTING.md` (do not repurpose historical `docs/IMPORT.md`).

```bash
pnpm add --save-exact @ts-graphviz/ast@3.0.10
```

Do not install the Graphviz process adapter or a native Graphviz executable.

**Port the working semantics**

- Global identity, implicit nodes, creation-time defaults, scoped snapshots and later explicit attributes.
- Strict directed/undirected duplicates, non-strict parallel occurrences, loops and chained edges.
- Unique brace endpoint sets with capped Cartesian expansion; no accidental member-statement ports.
- Nested `cluster*` groups; scoped ordinary subgraphs without visible frames; overlap errors.
- Context-correct labels/escapes, safe IDs, supported shapes/colors, compass side hints and constraint flags.
- Root/cluster flow direction, explicit review for unsupported ranks, reversed directions and appearance.
- Guard reserved keywords and the pinned parser’s subgraph-operand misparse.

**Explicit initial refusals**

Non-prefix/anonymous `cluster=true`; HTML/record fields; named ports; entity-bearing label decoding not implemented; escaped IDs as implicit default labels; arrowhead/tail semantics not representable natively; compound endpoint semantics; multiple graphs; unsupported grammar forms. Repeated attribute lists and string concatenation are valid DOT outside this profile, so phrase the diagnostic as importer-dialect rejection.

**Verification**

The supplied 15 DOT fixtures include five ready, three review and seven failed cases. Unit cases go further: defaults at creation, repeated strict declarations, default/endpoint/attribute port precedence, repeated sets, malformed/extra input, limits and source-injection boundaries.

Independent semantic assertions must remain alongside snapshots. At least one test should compare with controlled Graphviz output for a semantic ambiguity; do not introduce Graphviz as a production runtime just for that test. The research already used Viz/Graphviz to establish set and port rules.

**Exit criterion:** every advertised input either emits compiling native source with exact promised facts or a specific atomic failure. A bare parser-success flag is insufficient.

**Risk:** upstream grammar is not full DOT. Pin it, document the dialect and re-run compatibility fixtures on any update.

## M4 — Mermaid flowchart adapter and execution providers

**Classification:** Build — IMP-06.

**Suggested affected/new files**

- `src/import/mermaid/facade.ts`, `flowchart.ts`.
- Separate browser and Node providers; Node worker bundled separately.
- `tests/import-mermaid.test.ts` and Mermaid flowchart fixtures.
- Package/build configuration for lazy chunks, Node worker assets and notices.

Use the supplied facade, providers and mapper. Public `mermaid.parse` is validation-only for this purpose. Released `@mermaid-js/parser@2.0.1` does not cover flowchart/sequence/ER/class/state.

**Implementation**

1. Pin Mermaid 12.2.0; type/shape-check the internal DB snapshot.
2. Serialize access to a Mermaid instance because config/parser data are stateful.
3. Preflight flowchart family and resource/config policy; do not render or bind functions.
4. Reconstruct immediate group hierarchy, collapse group-shadow vertices, preserve occurrence identities and explicit edge IDs.
5. Map supported shapes/styles/labels and warn for approximations.
6. Emit explicit native flow layouts per group. Warn about normalized inherited/declared subgraph directions because Mermaid’s effective layout depends on engine and external edges.
7. Fail for unsupported terminal meanings/invisible constraints and for native ancestor-group edges.
8. Preserve exact original locations only when available; mark transformed parser locations as relative.

**Node gate**

The demonstrated worker creates JSDOM before dynamically loading Mermaid, uses a real termination timeout, and never enables scripts/subresources. JSDOM 30.1.3 raises the supported Node floor beyond the project’s 22.21.0 floor. Choose and document one of: explicit package floor change, optional importer capability, or an independently tested compatible shim. Do not hide that requirement in transitive dependencies.

**Browser gate**

The current browser provider requires DOM and has no hard watchdog. It cannot be moved unchanged into a bare worker. A Promise timeout is not cancellation. Prototype a supportable isolated parser context or obtain a supported DOM-free upstream graph API, then measure hostile/maximum input and cancellation. Until that gate is satisfied, label browser execution experimental or withhold it; do not claim Node isolation solves it.

**Verification**

Six mapping tests and three facade test groups cover nested groups, inherited layout policy, implicit/parallel/chain edges, explicit IDs, undirected prerequisite, unsupported family/arrow/invisible edge, HTML/entities, CSS/assets, malformed input and actual worker timeout. Add real browser proofs for host DOM cleanliness, no network, cancellation and state isolation across repeated imports.

**Exit criterion:** parser-version contract, semantic fixtures and environment-specific execution guarantees pass. Browser/Node packaging decisions are explicit.

## M5 — Dedicated production CLI import command

**Classification:** Build — IMP-07.

**Affected files**

- `src/cli/main.ts`: usage and new `import` dispatch.
- New `src/cli/import.ts` or similarly small orchestration module.
- `packages/cli/` build/pack configuration and assets.
- `tests/cli.test.ts`; new isolated output tests as needed.
- CLI docs and README usage examples.

The working `adapter-kit/import-demo.ts` shows the full bounded read → detect → adapter → native validation → exclusive write path. Port its behavior into the existing CLI; the demo’s dynamic `DRAFTABLY_ROOT` loading is a research harness, not a production feature.

**Command contract**

```bash
pnpm draftably import diagram.mmd --from mermaid --output diagram.draft
pnpm draftably import diagram.dot --from dot --output diagram.draft --accept-lossy
```

Support stdout if useful; diagnostics stay on stderr. Require explicit review acceptance for warnings in noninteractive use. Fatal errors remain fatal. Create-only `.draft` output, no force, no mutation of shared native `read()`.

**Acceptance tests**

- Input bytes and mtime unchanged on success/failure.
- No output on syntax, family, semantic, limit or native-compilation failure.
- Existing target, same target, symlink and hardlink aliases refused.
- Path with spaces works; no shell interpolation.
- stdout is parseable native source alone; stderr/report contains diagnostics.
- `--accept-lossy` accepts reviewable loss but cannot bypass fatal unsupported meaning.
- An undirected output fails against an unpatched native compiler before any write.
- Unknown extensions and multiple Markdown blocks require selection/format.
- CLI package works outside the repository with no undeclared dependencies or working-directory assumptions.

**Exit criterion:** installed executable creates a native file that `check` and `open` accept, with unchanged foreign source.

## M6 — Native scratch lifecycle and import report

**Classification:** Build — IMP-08, IMP-04.

**Affected files**

- `src/state/file-session.ts`: shared scratch factory, fresh import identity, source history and initial persistence.
- `src/state/launch.ts`: scratch restoration / save transition.
- `src/state/files.ts`: orchestration entry point, not raw Diagram replacement.
- `src/components/ExampleBar.tsx` or a shared scratch bar.
- `tests/file-session.test.ts` and workspace tests.

Keep one source-backed editing architecture. Do not add a parallel graph store or restore a raw Diagram while file-session hooks still point at another file.

**Implementation**

- Introduce scratch kind and import metadata, retaining existing example callers.
- Persist initial source and report immediately, with bounded storage and useful quota errors.
- Use fresh import ID; avoid title/key collisions and reuse of unrelated prior scratch edits.
- Preserve unresolved failed/conflicting save work before switching.
- Shut down old SSE/file-session ownership correctly.
- Ignore stale conversion/layout results.
- Start native history from generated source; normal visual rename/reconnect/group/delete/style/drag operations remain `translateEdit` operations.
- Save via the existing create-only workspace API or native download; no foreign watcher/refresh.

**Acceptance tests**

A reload before any edit restores the imported source; two same-title imports remain separate; importing while another file is open cannot write that file; failed/pending saves remain recoverable; cancel/stale result leaves active state intact; import edits/undo/redo operate on native source; saving changes session identity to the new `.draft` only.

**Exit criterion:** a real imported document can be edited, saved and reopened through the existing native path, including after reload and error cases.

**Risk:** current `keepScratch` and `settleSave` do less than their names may suggest. Test behavior instead of assuming those helpers already satisfy import requirements.

## M7 — Editor, paste/drop and public-site experience

**Classification:** Build — IMP-03, IMP-04, IMP-08.

**Affected files**

- `src/App.tsx` picker.
- `src/state/commands.ts`, `keyboard.ts`, `files.ts`.
- `src/components/Menus.tsx`, `StartScreen.tsx`, `Dialogs.tsx` and a small import dialog.
- `site/reopen.ts`, `site/Shell.tsx`, `site/play/Playground.tsx`.
- Existing browser proof harnesses under `scripts/`.

**User flow**

Choose file or paste → detected format/family → parse/loss report → native preview → “Open native draft.” If the result is blocked, show the relevant source/construct and keep current work. For reviewable loss, show what will change and require deliberate apply. Provide a native Save action and a persistent import-report action.

Use existing modal/focus patterns. Default light styling follows existing tokens. Do not expose compiler-package jargon in ordinary UI. Use plain messages such as “This diagram contains a sequence loop that this importer cannot preserve.”

Update file hints to include the foreign extensions without interfering with image insertion or native embedded-source reopening. Intercept confident foreign paste before QuickBuild, preserve native clipboard fragment precedence and editable-field behavior. Do not make Playground a mixed-language live editor: after import, its source is native.

**Acceptance proofs**

Use the repository’s existing proof utilities and `pnpm shoot` guidance, not an unrelated screenshot/test framework.

- Picker, drop and paste reach the same dispatcher.
- Multiple Markdown fences present a selection.
- Unsupported-family message is distinct from syntax error.
- Review/cancel preserve current work and focus.
- No HTTP request contains input source or source-specified resources.
- Import/edit/download/reopen yields the same graph facts in editor and Playground.
- Native source from an exported PNG/SVG remains a native reopen, not a foreign parser attempt.

**Exit criterion:** both surfaces complete the full workflow and report loss consistently.

## M8 — Optional D2 integration, after measured gates

**Classification:** Explore — IMP-10, IMP-11; mandatory safety work remains Build under IMP-09.

**Affected files**

- Optional `src/import/d2/` provider/normalizer/mapper.
- Optional package/build entry; lazy browser assets; Node worker/process supervisor.
- D2 feature docs and compiler-notice inventory.
- D2 fixtures and network-denial tests.

The supplied adapter is executable and preserves a useful ordinary-graph subset. The shipped browser entry measured 11.5 MB raw / 8.6 MB gzip; Node WASM measured 42.1 MB raw. Do not put it on application startup.

**Production work**

- Hard termination deadline covering worker initialization and compile; memory policy beyond a Promise race.
- Single selected virtual source only; no implicit directory mounts or remote fetch.
- Guard the exporter order/ID/level join and null slices.
- Use semantic arrow flags, not marker strings.
- Report rules/classes/variables/globs/null overrides/config as concrete snapshot losses; do not promise source-program editing.
- Block multi-board and family-specific constructs until supported.
- Preserve exact package notices and current MPL/transitive obligations.
- Benchmark browser download, CSP/worker behavior, cold startup, memory and maximum supported diagrams.

Only if those costs are unacceptable but demand is substantial should IMP-11 build a semantic-only `d2compiler.Compile` bridge with an explicit DTO. That entails a Go/WASM toolchain, compatibility tests and release ownership; it is not the first step.

**Exit criterion:** documented optional capability, measured operational costs and real cancellation/resource tests. Otherwise keep experimental code out of the default release.

## M9 — Expand by family, with a semantic gate

**Classifications:** Build IMP-12/14; Explore IMP-13/15/16/20; Defer IMP-17/18.

Each addition is its own independently reviewable milestone:

| Addition | Minimal contract | Required negative fixtures |
|---|---|---|
| Mermaid basic sequence | Participant ID/alias/order; ordered messages; self messages; supported solid/dashed arrows; native `layout root sequence`. | alt/else/loop/par/critical/opt, activation, create/destroy, notes, unsupported terminals. |
| nomnoml graph/compartments | Node IDs, text compartments, a documented association subset; parse-only API. | `#import`, unsupported UML terminals/endpoint labels/styles. |
| DBML v2 | Tables/fields, stable field IDs, selected references to actual fields; cells layout if useful. | Composite/unresolved refs, unsupported cardinality/constraints/module resources. |
| PlantUML family spike | Demonstrated structured family API or a strict small grammar with full consumption. | Preprocessor/macros/includes, unsupported events, any file/network access. |
| Viz full-DOT backend | Explicit user selection, one-graph framing, error handling, equivalent native mapping. | Trailing graph ignored by wrapper, layout errors with success status, resource attributes. |
| Structurizr JSON view | Select one view, preserve displayed element/relationship identities and metadata report. | Multiple-view ambiguity, unresolved IDs; no DSL execution. |

Do not implement a broad native-model extension solely to make a support checkbox green. First collect representative real files and decide whether omitted meaning should become a native feature or remain a clear import error.

## M10 — Release, documentation and measured product checks

**Classification:** Build, applies to all shipped capabilities.

**Documentation**

- New `docs/IMPORTING.md` with format/family matrix, aliases, loss rules, limits, safe-file behavior and examples.
- README and CLI/site user docs: import creates a new native file; no foreign export or sync.
- Update `docs/ARCHITECTURE.md` for import boundaries.
- Update `docs/DSL.md` and `skills/draftably/SKILL.md` in the same native-language change, as AGENTS requires.
- Add changesets for source/examples/DSL/CLI changes.
- Keep historical `docs/IMPORT.md` unchanged in purpose.
- Include third-party licenses/notices for actual shipped chunks/binaries, not merely npm top-level labels.

**Checks**

```bash
pnpm check:fast
pnpm check
pnpm cli:build
pnpm cli:pack-check
pnpm prove:file
pnpm site:build
pnpm prove:site
```

Use the exact commands and required browser setup in [docs/CHECKS.md at the baseline](https://github.com/byronwall/draftably/blob/dd2ababcbe3b9ac011bc23e652309c10cf31cd02/docs/CHECKS.md). Add import journeys to those proofs. Run the engine suites/background work according to AGENTS; broaden tests only for concrete affected behavior.

Measure import-to-editable time, cold/warm parser startup, peak memory and lazy asset transfer. Keep parser work out of the normal edit loop. Check package installation on the declared Node floor and from a directory outside the repository; bundle Node worker/WASM files deliberately. The published CLI currently expects a self-contained package without runtime install surprises.

**Release acceptance**

1. The documented feature matrix matches executable fixtures.
2. Every accepted graph remains editable after unrelated changes, native save and reload.
3. Foreign bytes never change and no source-specified resource is silently loaded.
4. Failures are atomic and warnings remain reviewable.
5. Current native examples, file-session conflict behavior and package proofs pass.
6. Completed work is distinguished from experimental integrations in docs/UI.

## Validation status and risks to carry into Codex

The kit’s clean-install and executed-test results are in `validation-results.md`. The patch and adapters were tested in isolation; production state/UI/package changes remain for Codex.

| Risk | Mitigation / owning milestone |
|---|---|
| Model can display features that native source cannot persist. | Native source authority, M1/M2, edit-save-reload checks. |
| Parser accepts syntax but exposes incomplete/wrong semantics. | Guarded APIs, DOT dialect guards, independent fact tests, M3/M4/M8. |
| Foreign data expands past native or runtime limits. | Pre-allocation expansion and aggregate output caps, hard execution supervision. |
| Current file is overwritten or unresolved work lost. | Separate CLI command, wx, scratch lifecycle, M5/M6. |
| Browser freezes despite an apparent timeout. | Real worker/process cancellation gate; do not equate Promise race with termination. |
| Dependency update changes DB/API shape or licenses. | Exact pins, fixture gate, distribution notice inventory. |
| Duplicate session names restore another import. | Fresh identity and initial persistence, M6. |
| More families quietly flatten into generic graphs. | Family matrix, exhaustive handling and negative fixtures, M9. |
| D2/DOM shim inflates the personal project. | Lazy/optional packaging and measured adoption gates. |

**Open decisions:** the explicit Node-floor choice, browser Mermaid isolation strategy, acceptable optional D2 download cost, and next family priority. Recommended defaults are already in the report; none requires broadening the read-only scope.

