# Final adversarial routing QA

Reviewed the preliminary merged `coverage.csv`, `visual-atlas.md`, `page-drafts.md` and `atlas-manifest.json` against the exact source and completed CLI evidence. No baseline or deliverable file was modified. Corrections below are in owned `work/` inputs for reassembly.

## Passed checks

- All **98 bundled source files and98 SVGs** exactly match the source/export hashes in the executed CLI ledger. The preliminary routing manifest's78 variant occurrences have matching metrics, geometry, diagnostics and hashes. No missing or stale actual source/render path was found.
- All **12 numeric defaults and ranges** match `ROUTING_PARAMS` and `RouteLab.defaults/settings`; every primary low/default/high family includes the actual explicit default. Numeric source parsing still accepts fractional passes and the router rounds them; the inventory preserves that fact.
- Both complete five-state side selectors (`auto`, `left`, `right`, `top`, `bottom`) are present and correct. Sync/async source states and actual stroke styles match. Ranking true/default and false are represented; the simple-cycle equality and grouped ranking change are correctly distinguished.
- Frozen geometry, standoff10/20/10, crossing/bend/stability tradeoffs, shared overlap, fanout, pass equality and corner SVG claims all match the executed evidence. The nonmonotonic channel geometry is labeled separately. Current standoff UI absence and proposed new control remain distinct.
- Portable raw reproduction ran **36/36** successfully and matched source hashes, rectangles and route arrays against the real CLI ledger.

## Issues and fixes

| Priority | Preliminary issue | Resolution / remaining assembly action |
| --- | --- | --- |
| P1 | **15 supplementary fixtures were bundled but invisible in atlas variants.** Narrow corridor3, equal-metrics edge-gap3, no-effect standoff/shared/fanout9 appeared only in prose. This hid the most decisive counterexamples. | Added all15 to `work/routing-visuals.json` `files`. After reassembly92 distinct routing sources should be visible. The six `frozen-*` template graphs remain intentionally outside galleries; they are reproducible construction bases, not missing public choices. |
| P1 | **A single family baseline creates invalid causal diffs.** V-R16 fixed-side was diffed against the downward graph; V-R22 cell variants against a different frame graph; V-R24 long title against an upper fixed-side target. V-R13 blocker and V-R15 grouped graph also need separate references. | Added `reference_by_file` and `subcomparisons` for every displayed variant. Honor them in the builder and viewer. V-R24 gate contrast explicitly changes endpoint AND target-side constraint, so it is a mechanism illustration; only its long-title pair claims one-variable isolation. |
| P1 | **Native persistence recipe removed/reset the waypoint before saving**, so reopening could not verify waypoint persistence. It also mixed labels `request` and `connect`. | Replaced V-R21 recipe and page steps: set exactly `connect`; add waypoint(300,120), move to(300,200); move label; save/reopen NOW; only then test removal/reset independently from that saved state. UI execution remains unclaimed. No new native JSON artifact is falsely asserted. |
| P2 | **V-R09 page promised a native warm-history recipe that was absent.** | Page now explicitly says supplied figures are cold source renders proving within-run stability. Native history semantics remain explained but no unperformed warm experiment is promised. |
| P2 | **Top-only cells were described as ordinary exposed outline cells.** `cellEnds` only recognizes left/right/bottom free sides; a top-only cell faces the title band. | Corrected R029 and page prose to “no eligible free side,” including top-only and fully interior cells. Existing outer/interior examples remain valid representatives. |
| P2 | **Interior-cell metric scope was undocumented.** Router report length26 excludes the52 units appended during drawing; the complete visible polyline is78. | Added R029, V-R22 and page note. Source: `model/routes.ts:640–659` appends after routing; `cli/variants.ts:704–725` uses the raw report. Qualify global “total route length” prose for special cell-entry/sequence routes; do not relabel26 as full visible length. |
| P2 | **Several routing citations were broad approximate ranges**, notably cost, fanout, stability and title-band search. | Corrected owned inventory to exact source function anchors and corrected key audit references. Rebuild coverage and canonical control metadata from the new inventory. |
| P2 | **Mechanism annotations were instructions, not yet carried into assembled figure metadata.** | Added a concrete `mechanism_annotation` for all24 routing families, identifying which obstacle buffer, port pitch, overlap, side, gate or appended segment to highlight. Carry this through the builder and actually show the annotations/crops in the final preview; prose saying “annotate” is not itself a visual annotation. |
| P2 | **Warning evidence can disappear in summary tables.** Manifest warning arrays are correct, but the preliminary Markdown metrics column does not display warning counts/details; e.g. blocked-side/interior-cell renders look superficially clean. | Keep inspect warnings separate from `check --metrics` quality warnings and surface the deliberate diagnostics beside those two figures. Do not describe zero inspect warnings as no quality warnings. All numbers in existing JSON are correct. |
| P3 | **Internal evidence path text was stale.** Routing family statuses mentioned `routing-validation/results.json`, and page prose mentioned standalone `routing-audit.md`, neither the final package's path. | Status now names `evidence/routing/results.json`; page provenance names `coverage.csv` and that ledger. Native recipe and current/proposed wording are otherwise explicit. |

## Assembly schema now available

`work/routing-visuals.json` contains:

```json
{
  "files": ["variant.draft", "reference.draft"],
  "reference_by_file": {"variant.draft": "reference.draft"},
  "subcomparisons": [{
    "id": "short stable local identifier",
    "title": "Readable comparison label",
    "files": ["variant.draft", "reference.draft"],
    "reference": "reference.draft",
    "fixed": "Conditions held fixed within this comparison",
    "changed_lines": "Exact intended change"
  }],
  "mechanism_annotation": "Concrete highlight or measurement to show"
}
```

Use `reference_by_file` for source diff selection. Use `subcomparisons` to avoid presenting different graphs as one frozen overlay. A file can appear in two conceptual subcomparisons; the file list itself is unique. There are93 routing variant occurrences across the24 families and92 distinct illustrated sources after fixes.

## Portable reproduction

New `work/reproduce-routing.mjs` accepts `--repo`, `--fixtures`, `--output` and optional `--verify-cli-results`. It imports the reviewed router dynamically, checks its exact SHA-256, refuses unsupported grammar, and compares source hashes/rectangles/routes when actual CLI evidence is supplied. No dependencies or baseline changes. `work/reproduce-routing-README.md` has the artifact-relative command. Its successful run is `work/routing-validation/reproduced-portable.json`.

## Remaining integration cautions

The final viewer was not yet present at review time, so its overlays, common-scale alignment, crops and subcomparison presentation need the root's visual QA after assembly. Editor UI gestures were not performed by this agent. The preliminary CLI page contains intended integration paths such as `examples/atlas/routing/...`; replace or clearly distinguish these from immediately runnable download paths when finalizing the package.

Machine-readable integrity results: `work/final-qa-routing-checks.json`. All integrity checks passed; the issues above concern teaching, reference selection and missing presentation, not counterfeit source or render data.
