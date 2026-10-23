# Round 0 — pilot (3 diagrams, plus the 17 bundled examples as a baseline)

Purpose: prove the loop and the metrics before writing the full corpus.

Run: `node scripts/diagram-audit.mjs docs/intent/diagram-quality/corpus tmp/audit/r0-pilot`
Baseline: the bundled `examples/` average **DI 15.6** (hooks 40, labels on group borders 32,
detached labels 18, many bends 16, labels on other edges 15).

## srcly-scan-lifecycle (request flow, layered right, by group, graphite, 12 nodes)

```text
v0  R1 2 R2 3 R3 3 R4 4 R5 3 R6 2 R7 4              = 3.0   DI 13.8
e1  R1 2 R2 3 R3 3 R4 4 R5 3 R6 2 R7 4 R9 3         = 3.0   DI 15.7
e2  R1 2 R2 2 R3 2 R4 4 R5 3 R6 1 R7 4 R9 2         = 2.5   DI 25
```

Top defect: reading order is lost. The browser sits top right, the routers bottom left, the
services in the middle, so "start scan" runs right to left across the whole drawing.
`order root browser api services` in e2 has no visible effect under `engine=layered`.
e2 also routes "start scan" outside the drawing, and the export cuts it off.
Finding (DSL): "put the cache next to the job manager" can't be written. `near` needs
siblings, so the agent has to move the cache into another group first.

## srcly-release (release pipeline, flow down, shade ramp, signal, 10 nodes)

```text
v0  R1 2 R2 4 R3 3 R4 – R5 2 R6 2 R7 4              = 2.8   DI 7.5
e1  R1 2 R2 3 R3 2 R4 – R5 2 R6 2 R7 4 R8 5 R9 4    = 3.0   DI 16.5
e2  R1 2 R2 3 R3 2 R4 – R5 2 R6 2 R7 2 R8 4 R9 4    = 2.7   DI 16.5
```

Top defect: `flow direction=down` lays the first four steps out as a row, then turns down a
column, so a linear pipeline reads as an L with a long "merge" edge back across. Labels on the
top row sit 45px above their edges. The "mismatch" edge loops left outside the drawing and is
clipped to "atch".
Color: in signal, shades 700–900 look nearly the same. In midnight, the ramp collapses to one
navy and the pale shade-100 pill glares. Changing the theme also changes the font (mono), so
node sizes and the layout shift (6 objects moved). A recolor shouldn't move anything.

## draftably-file-session (process with a cycle, layered down, custom brand, mulberry, 11 nodes)

```text
v0  R1 3 R2 3 R3 4 R4 4 R5 2 R6 4 R7 4              = 3.4   DI 10
e1  R1 3 R2 3 R3 3 R4 4 R5 2 R6 4 R7 4 R9 4         = 3.4   DI 19
e2  R1 2 R2 2 R3 1 R4 3 R5 2 R6 3 R7 4 R9 1         = 2.3   DI 21
```

Top defect (v0): the file pill floats 200px under the server group with a long empty gap. In
e2, switching to `direction=right` moves everything (mean 1053px, 53 order flips, as expected),
but labels land far from their edges: "new source" is 113px above its edge, and "edit" floats
in empty space. Three return edges run in parallel under the browser group and cross its
border. The custom `brand` family looks good and the defaults work with it.

## Pilot summary

- Mean visual: v0 **3.1**, follow-ups **2.8**. Mean DI: v0 10.4, follow-ups 19.0.
- Follow-ups make things worse in every diagram. Labels and clipping are the main reasons.

Root causes, ranked:

1. **Edge-label placement**: labels sit off their edges (45px is a recurring constant, which
   suggests a fixed offset bug) or on other edges and group borders.
2. **Clipping**: the export bounds come from the boxes only, so routes and labels that loop
   outside are cut off.
3. **Reading order**: `flow direction=down` wraps into rows. `order` on root is ignored under
   `layered`, and groups don't follow the edge direction.
4. **Hooks**: an edge between stacked neighbours leaves sideways and U-turns back in.
5. **Theme change moves the layout**: different fonts give different node sizes.
6. **DSL gap**: no placement relative to an object in another group.

Metric fixes made during the pilot: label parsing now handles every theme's label size, and
`clipped` was added. Still not measured: long empty gaps (dead space between connected
objects), and whether `order`/`near` were honored.

## Process changes after the pilot

The pilot used nine scored dimensions per render. After review, the rubric changed to a defect
ledger with cause tags, a pairwise verdict against the last round, and one overall score; see
[RUBRIC.md](../RUBRIC.md). The script gained `# expect` checks, `empty-band`, `long-edge`,
`--baseline` comparison sheets, and readable sheets (`shoot --cols`).

Rerun of the pilot with expectations (`tmp/audit/r0b`): **8 of 16 expectations failed**:

- reading order: `order-x browser api services` (scan lifecycle, all three versions);
  `order-y` along the release pipeline (v0, e1);
- `near file write 120` (file session, 182px and 154px gaps);
- `below cache jobs` and `near cache jobs 60` pass, but only after the cache was moved into the services group (the DSL gap);
- `still *` on the theme-only change (srcly-release e2: six objects moved).

The defect indexes in `r0b` are not comparable with `r0-pilot`, because the script changed in
between. Round 1 starts a new baseline.
