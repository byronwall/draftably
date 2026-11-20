# Issue reproductions

One folder per reproducible diagram from the 2026-11-20 issue sweep (byronwall/draftably
#586–#608). Each `v0.draft` is the failing diagram from the issue, decoded from its
`draftably.dev` share link with `src/lib/source-hash.ts`, or copied from its fenced `draft`
block. The first two lines name the issue.

`pnpm audit:compare` runs this set as `issues`. A heuristic PR for one of these issues must lower
the defect index of that issue's render, and the set's mean must fall (see the gate in
[docs/CHECKS.md](../../../CHECKS.md#ratchet-gate-for-heuristic-changes)). Do not edit a
reproduction to dodge a defect: the reproduction is the test.

No file has `# expect` lines. Every issue asks for a routing, port or packing change that the
positional expectations (`left-of`, `aligned-x`, `near` and the rest) cannot state. The metrics
below carry each target instead.

## Coverage at main (927f0839)

"Metric" is the issue kind that measures the defect. A fix should remove that kind from the render.

| Folder                                                  | Issue | Metric that measures it                                                  |
| ------------------------------------------------------- | ----- | ------------------------------------------------------------------------ |
| [i586-perpendicular-exit](i586-perpendicular-exit/)     | #586  | `edge-on-node-border` (new)                                              |
| [i586-cells-exit](i586-cells-exit/)                     | #586  | `edge-on-node-border` (new), `edge-on-group-border`                      |
| [i586-frame-right-port](i586-frame-right-port/)         | #586  | `edge-on-node-border` (new), `edge-on-group-border`                      |
| [i587-label-hides-routes](i587-label-hides-routes/)     | #587  | `label-through-text`                                                     |
| [i588-upward-column](i588-upward-column/)               | #588  | `back-edge` only; the issue asks for a `check` advisory, not a layout    |
| [i589-group-fill-crossing](i589-group-fill-crossing/)   | #589  | none: rendering only, visual review                                      |
| [i590-table-header-entry](i590-table-header-entry/)     | #590  | `off-axis-port` (enters the table's top while the flow runs right)       |
| [i590-header-to-header](i590-header-to-header/)         | #590  | `hook`, `long-edge`                                                      |
| [i591-column-insets](i591-column-insets/)               | #591  | `uneven-padding`                                                         |
| [i592-two-groups-feed](i592-two-groups-feed/)           | #592  | `empty-area`, `uneven-group-gap`                                         |
| [i594-group-frame-arrows](i594-group-frame-arrows/)     | #594  | `uneven-ports` (133 and 230 of 242 on the frame's left side)             |
| [i595-gap-center](i595-gap-center/)                     | #595  | `off-center-gap` (new; 10/18px)                                          |
| [i596-bottom-center-port](i596-bottom-center-port/)     | #596  | `edge-on-group-border`, `edge-hugs-node`                                 |
| [i597-sibling-alignment](i597-sibling-alignment/)       | #597  | `group-staircase`, `many-bends`; the issue asks for an arrangement offer |
| [i599-port-swap-crossing](i599-port-swap-crossing/)     | #599  | `crossing`                                                               |
| [i601-straight-chain](i601-straight-chain/)             | #601  | none: two bends between offset boxes; a layout choice, not a defect      |
| [i601-down-detour](i601-down-detour/)                   | #601  | `non-facing-ports` (new), `off-axis-port`                                |
| [i602-forward-exit](i602-forward-exit/)                 | #602  | `hook`, `long-edge`, `many-bends`                                        |
| [i603-soft-group-seams](i603-soft-group-seams/)         | #603  | none: rendering only, visual review                                      |
| [i604-title-stroke](i604-title-stroke/)                 | #604  | `edge-through-title` (new)                                               |
| [i605-fold-branch-crossing](i605-fold-branch-crossing/) | #605  | `crossing`; the issue asks for a reorder advisory                        |
| [i606-facing-ports](i606-facing-ports/)                 | #606  | `non-facing-ports` (new)                                                 |
| [i607-label-soft-heading](i607-label-soft-heading/)     | #607  | `label-on-group-title`                                                   |
| [i608-detour-vs-crossing](i608-detour-vs-crossing/)     | #608  | `long-edge` (5.8× the direct way), `many-bends`                          |

Not in the set:

- #593 (Copy image clipboard) and #598 (amber fill) have no layout to measure.
- #600 (double-escaped newline) asks for a `check` diagnostic. Its diagram has no layout defect.

Known false alarm: `i603-soft-group-seams` reports two `node-overlap` issues. A soft group's
bounding box covers boxes outside its region. The gate counts only new instances, so the two at
main do not block a PR.
