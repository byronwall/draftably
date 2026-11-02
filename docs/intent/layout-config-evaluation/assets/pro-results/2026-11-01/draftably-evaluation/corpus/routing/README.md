# Fixed-position routing witnesses

These 24 development-only fixtures isolate routing from layout. They are additional probes, not extra independent main corpus bases and not fresh heldout evidence. Each base has 4–12 nodes, exact node sizes, and authored pins. Geometry is produced by compiling each source once through the shipped compiler, then freezing the actual production document. Every setting candidate routes exactly the same geometry.

`manifest.json` contains:

- `path`: the pinned source fixture, including a forced port when that is the fixture's purpose.
- `automaticPath`: an otherwise identical source with all explicit `from=`/`to=` constraints removed.
- `explicitVariants`: one authored-side alternative, declared before any route or winner inspection. All 24 fixtures have one; the protocol requires at least 12 comparisons.
- `smallEdit`: a 24px endpoint shift to apply to the frozen document for a shared-history probe. This intentional route-only state edit bypasses recompilation of the old source pin. It is not a test of pin enforcement.
- `declaredNodes` and `declaredGroups`: source coordinates **relative to parent content**, not world coordinates. Use the actual compiled document as the frozen route input.
- `provenance.motifSources`: the regression test or design note that inspired a motif. These are adapted cases with additional nodes, not claimed exact copies.

The root layout is `flow direction=auto fold=never`. Automatic direction does not force a flow side; explicit ports are assessed separately. The `size` and `pin` statements control the layout geometry. A routing parameter must be applied to the router API, not by recompiling the source, because compilation can reserve routing channels and move groups.

| IDs | Main stressor |
| --- | --- |
| 01–02 | Tight and offset neighbours; clearance and hooks |
| 03–04 | One obstacle and a two-obstacle passage |
| 05–06 | Facing-side fan-out and fan-in |
| 07–08 | Diamond vertices, three/four exits, return |
| 09 | Parallel and opposing connections |
| 10–11 | Fixed nonplanar graph and avoidable crossing |
| 12–14 | Group titles, border slot, nested boundary calls |
| 15–16 | Label ownership, long labels, returns and skips |
| 17 | Self-loop beside an obstacle |
| 18–19 | Opposing corridor lanes and 60px passage |
| 20–21 | Explicit top departure, own-source standoff, jogs/fan trunks |
| 22–23 | Balanced fans and eleven-branch hub |
| 24 | Group endpoints beside member endpoints |

No layout or routing was executed to construct or choose these fixtures. All 72 source variants passed the shipped parser. `freeze.json` records hashes before routing outcomes. `syntax-validation.json` records the parser check.

```bash
# From the deliverable package root.
python evaluation/generate-routing-fixtures.py
node evaluation/validate-corpus.mjs --routing
```

For port-stability trials, calculate a single set of prior routes for the unchanged base, make the same small edit for each candidate, then pass that same prior state separately to every candidate. Do not reuse the immediately preceding candidate's routes. Also run the edited fixture with empty history to reveal whether a parameter is conditional on earlier sides.
