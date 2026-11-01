# Independent verification: layout and routing atlas

Date: 2026-11-01. Runtime checkout: `codex/layout-routing-visual-docs`, source baseline `af70d8317797d5a522acffdd604819376a3ec893`.
The baseline verification ran before rebasing this review onto current main.
No product files changed during verification.
The checked [positive-fixture evidence](verification/positive-fixtures.json) and [focused probes](verification/focused-probes.json) are preserved here.

## Coverage and commands

`python3 tmp/pro/layout-routing-atlas/local-verification/verify.py` used the local `node scripts/draftably.mjs` CLI. It excluded paths under `layout/repros/`, `layout-warm/expected-diagnostics/`, and `editor-probes/`.

- 349 input `.draft` files; 323 positives after 26 exclusions. Each positive passed `check --quiet`, `inspect --json`, and `inspect --svg` (969 commands). All inspected geometry values were finite. All SVGs parsed as XML and had a finite positive viewBox. No failures.
- Extracted all 13 complete `draft` fences from `page-drafts.md`. Each passed all three CLI commands; JSON geometry and SVG frames were finite. No failures.
- Independently replayed the 17 primary and counterexample routing comparisons declared in the evidence ledger. Each compared exact `(id,parent,x,y,w,h)` rectangles from CLI JSON. All 17 triplets matched internally.
- Exact per-file outcomes, source hashes, SVG frames, page-fence hashes, and frozen rectangle arrays are in [positive-fixtures.json](verification/positive-fixtures.json). Focused defect outputs are in [focused-probes.json](verification/focused-probes.json).

The first verifier attempt used invalid CLI flag order. It was corrected before the recorded successful run. The report’s earlier ZIP assembly issue is documented as corrected in its final verification summary. I found no additional packaging or positive-companion failures.

## Focused defect checks

`focused-probes.json` records actual CLI results:

- Fractional cell columns: `check` and `inspect` exit 1 with `Invalid array length`.
- Fractional span: check exits 0 with `NaNpx` outside-group warning; JSON node width is `null`.
- Empty sequence band: check exits 0; JSON contains `null` node coordinates and width.
- Sibling engine scope order: the two ordering-only repro files produce unequal node rectangles.
- Cold ordering: stable and crossings fixtures produce equal rectangles.
- Group gap: 96 and 120 fixtures produce equal rectangles. Source also sets `MAX_GROUP_GAP = 96` and clamps the computed gap at that value.

Source review confirms the remaining claims on this baseline:

- `engineArrangement` reuses a mutated projected document for sibling scopes. It creates settings from `doc.settings` each iteration, so the preceding scope’s engine settings can carry forward.
- `LayoutLab.defaults.fold` is `never` in `src/engines/layout-engine.js`. `engineAttrs` omits settings equal to that raw default. The named-engine parser defaults a missing fold value to `auto` in `src/dsl/syntax.ts`. `setLayoutRecipe` replaces the layout line and keeps only `min-width` and `min-height`, so a serialized `fold=never` can be lost; reopening then uses `auto` and can fold ranks.
- Both the routing menu and Explorer `ROUTE_PARAMS` omit public `standoff`. Source Compare compiles routing edits with `sourceWithRouting` and does not run the native candidate validation path. Its source routing call also does not consume the `priorRoutes` or `autoPorts` controls.
- `ROUTE_PARAMS` omits `standoff`, while `syntax.ts` declares it. `variants.ts` fingerprints positions and route points rounded to 4-unit bins; corner radius is absent from that key. The supplied radius sweep records three different SVG paths while tagging all as same-as-v0.
- Source Compare candidate generation also serializes layout settings through `engineAttrs`; the source probe evidence records ignored controls and requested `edgeGap=1` effectively executing as 4 after normalizing. Native candidates validate before dispatch.

Evidence for source Compare probes and the radius sweep is retained under the extracted package’s `evidence/editor/` and `evidence/cli-vary-radius/`. These code-path findings are consistent with the independent source read. The Editor model/browser lifecycle probes were not re-executed here.

## Current-main source-only addendum

`origin/main` was `ce7f65648e7e63021bd93f7d38a7bcc81db9fd68` during review. The runtime checks above stayed on the pinned checkout. The diff adds the public `directed=false` edge attribute and excludes undirected edges from the ranking set in `src/dsl/compile.ts`. The new DSL documentation scopes this effect to built-in flow and swim-lane ranking; it does not establish a change to every cold engine. The listed defect paths (scope settings, layout serialization, CLI fingerprint, source Compare, menus, and Explorer parameter definitions) are otherwise unchanged. The only other observed diff in the targeted files was the File menu adding Import Diagram and Home entries. Treat the atlas inventory as baseline coverage, with the directed flag as a current-main addendum.

## Limits

I did not execute any extracted program, downloaded script, or the preview’s JavaScript. I did not run Editor/browser lifecycle proofs, all original source-module probes, or repository test suites. The focused source probes above use only repository CLI commands and extracted `.draft` data.

## Integration verification on current main

The parent review rebased onto `ce7f65648e7e63021bd93f7d38a7bcc81db9fd68` after baseline verification.
The three new directed-state companions passed check, JSON inspection, and SVG export: nine CLI commands.
Omitted and explicit true produce equal geometry. False removes the arrowhead and changes built-in flow ranking as documented.
The exact results are in [current-main-directed.json](verification/current-main-directed.json).

All 2,457 supplied package hashes passed before preservation.
All 2,457 committed original files were compared byte-for-byte with the extracted archive.
The supplied input ZIP remains excluded, as the asset index explains.
All 359 SVGs parsed successfully. Representative routing examples were rendered and visually inspected.
The original HTML viewer and downloaded helper scripts were not executed.

Repository gate results are recorded in [the run record](run.md).
