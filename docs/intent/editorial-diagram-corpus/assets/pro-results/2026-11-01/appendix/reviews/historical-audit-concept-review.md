# Independent review of historical audit metrics

Reviewed the actual retained metrics for E17 (cells), E11 (two stacks) and E21 (records/pointers), their actual source and rendered pixels, and the decisive portions of the unchanged `scripts/diagram-audit.mjs`. The historical script was run by the parent agent with `v1.draft`/`v2.draft` exposed through temporary symlinks under its expected `e1.draft`/`e2.draft` names. Those aliases do not represent additional editorial refinements.

## Three concrete findings

| Case | Historical metric observation | Visual/semantic observation | Interpretation |
|---|---|---|---|
| E17 Go slice | `arrives-below=1` in all stages; defectIndex 5 → 8 → 12 | The native pointer clearly reaches the correct third array cell from below. The cells recipe deliberately treats the title-band-facing top side as unavailable. v1/v2 restore descriptor and active-range color while all stage quality ratings remain 4/5. | A bottom-arrival heuristic can flag a valid memory-pointer convention as a defect. Some additional gap/route length is real, but the higher index is not evidence that the complete explanation became worse. |
| E11 Transformer | v1 infers `flowDir=down` and counts 12 back edges; index v0 7.8 vs v2 11.1 | Both intended processing stacks run **upward**, exactly as in the original. v0’s snake loses those columns; v2 restores them, improving communication/fidelity from 3/2 to 4/4 even though some fanout clearance issues remain. | The direction heuristic is semantically inappropriate for this reference; it has only right/down orientations. Lower historical index does not identify the more faithful or clearer composition. |
| E21 Open upvalue | v2 reports `edge-through-title-band=0` but its retained CLI warning says the return pointer crosses the Stack title. It also reports six `edge-on-group-border` issues. | The return route enters the Stack area from above toward a bottom cell endpoint. The visible line crosses the title/field and several other pointer strokes merge with record borders. | The border issues are useful true detections. The zero title-band count is a demonstrable blind spot caused by a terminal-segment exemption, not proof that the warning or visible ambiguity was resolved. |

### E17: precise rule and limit

`measure()` adds `arrives-below` whenever the last segment travels upward and the source is not below the target. That rule does not inspect cells semantics or the intended pointer convention. `docs/DSL.md` explicitly says a cell’s top faces the title band and is not an automatic attachment side. The visual is a pointer into an array, not a forward process edge whose direction must read left-to-right at every turn.

The measured final 428-unit route and 134-unit group gap are real, and a reader may reasonably prefer a more compact layout. The false positive is treating the bottom arrival itself as a generic communication defect. The full comparison shows that exact cell identity and active-range highlighting matter more than that route convention. The audit has no metric for restored semantic color meaning.

### E11: an imposed direction is not an intended reading path

`parseSource()` recognizes only explicit root `direction=right|down`. Otherwise `measure()` sums absolute source/target distances, chooses horizontal versus vertical, and labels the vertical case down. Its back-edge count therefore penalizes the required upward stack progression in v1. The index includes `backEdges * 0.5`, so this assumption directly affects the numeric result.

The final fanout still has real dense bends/crossing marks, which are correctly discussed in the item audit. This review does not dismiss every metric that disagrees with a visual rating. It shows that the index lacks the reference’s intended direction and cannot rank fidelity. Preserving a quiet two-column rhythm and making six repeat blocks countable are visual/semantic benefits the historical model does not measure.

### E21: a terminal exemption hides a visible title crossing

The historical title-band loop exempts any upright first or final segment with `terminal = (k === 0 || k === r.segs.length - 1) && upright`. It does not verify that such a terminal approaches the correct exterior side or that the target is the top cell in a record. The final `upvalue_stack` route is:

```text
(700,287) → (35,287) → (35,487)
```

The source explicitly asks `from=bottom to=bottom`. The target cell `a` occupies x=0..70, y=443..487 under the Stack title band at y=410..443. The final segment descends from y=287 through the title and field before reaching the bottom endpoint. The script exempts it as terminal, while the actual CLI reports the crossing and the PNG shows the line disappearing into the stack structure.

The same final metric file usefully catches six routes traveling along group borders. Retain those observations, but retain the raw CLI warning and visual judgment too. The lower index than v0/v1 does not make v2 publication ready; this case remains 3/5 for standalone quality.

## How to use these results

Use the historical output as a reproducible triage list, not a pass/fail oracle or a substitute for quality/fidelity/semantic ratings. Preserve raw counts, issue details and warnings. Do not average defectIndex into a corpus quality score or claim progress because its weighted sum falls. Its fixed geometric thresholds and normalization per ten edges were calibrated on an older internal corpus, as the script comments state.

A proposed future audit should distinguish a reported geometric fact from an unacceptable design: bottom arrivals, back edges, long returns and shared trunks can be meaningful conventions. It should test selected endpoint approach direction and cells title bands directly, and it should retain the intended reading-path/role annotations from the external reference review. That proposal does not change this run’s immutable script or metrics.
