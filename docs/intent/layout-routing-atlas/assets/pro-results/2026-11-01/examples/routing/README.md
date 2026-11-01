# Exact routing companions

These98 `.draft` files target Draftably commit `af70d8317797d5a522acffdd604819376a3ec893`. Every file was compiled with the actual CLI, inspected as JSON, and exported as SVG. The companion evidence directory contains `results.json`, `comparisons.json`, actual SVG exports, a complete render ledger and a validation summary.

## Run one file

From the exact baseline checkout with its dependencies and CLI built:

```sh
pnpm draftably inspect /absolute/path/to/clearance-10.draft --json --metrics
pnpm draftably inspect /absolute/path/to/clearance-10.draft --svg > clearance-10.svg
pnpm draftably check /absolute/path/to/routing-fixtures --metrics
```

Use existing CLI commands as shown. Open the source in the Editor to edit a setting; match node/edge IDs and keep everything except the named variable fixed.

## Frozen routing contract

The twelve main numeric triplets use flat pinned rectangles and explicit sizes. Constant `layout root row` suppresses automatic flow return/skip plans. Short-box families use constant `theme drafting padding-y=4` so labels fit. Geometry equality was checked against the compiled output, not inferred from source pins. All12 main sweeps pass.

Changes in the exported SVG viewport are possible because a different route can extend the drawing bounds. Align comparisons in world coordinates at one scale rather than auto-fitting each image separately.

`channel-reservations*`, flow direction, fold and ranking variants deliberately allow geometry changes. Label them source recompilations. The channel trio changes18 nodes or frames relative to default.

## Preserve equal results and warnings

`no-effect-standoff-*`, `no-effect-shared-penalty-*` and `no-effect-fanout-penalty-*` have exactly identical routes and SVG paths across their settings. `equal-metrics-edge-gap-*` has equal headline metrics but different route points. The distinction is intentional.

`ports-blocked.draft` demonstrates an explicit side blocked by another box and retains its warning. `endpoint-inner-cell.draft` demonstrates an interior-cell target and retains an edge-through-node warning. Wide return/fold fixtures and crossing tradeoffs also retain quality warnings. `check --metrics` adds quality warnings that are not part of `inspect` / `vary` warning metrics; keep the categories visible.

## Native edit companion

`ports-base.draft` is the source starting state for bend/label editing. Save it as native JSON, open a fresh native Editor session, and import that JSON. Add/remove/move/reset bends there. Give edge`e` the label`connect` before Alt-dragging its label. Those gestures are not `.draft` syntax at this baseline. UI actions are recipes for recorded verification; CLI output validation does not claim to have performed the gestures.
