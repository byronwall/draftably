---
title: 'Interactive links and emphasis states — shape brief'
slug: 'diagram-emphasis'
phase: shape
status: current
last_updated: '2026-10-26'
---

# Interactive links and emphasis states — what we are adding

**Outcome:** Linked objects look and act like links, and one file can draw itself in named emphasis
states without moving anything.

**Primary flow:** Agent writes `href=` and `state` lines → `inspect --svg --state` or `--states` →
reader opens links and steps through states in the viewer.

## Feature scope

```text
Links and emphasis
├── PLANNED ADDITIONS
│   ├── Links that look like links
│   │   ├── Small link mark at the node's top-right corner, in the node's ink
│   │   ├── CLI SVG: <a>, per-object <title> with the target, CSS hover, data-id
│   │   ├── Browser SVG export keeps the <a> (it drops it today)
│   │   └── Viewer: open chip on hover and selection; Inspector "Open link"
│   ├── Emphasis states in the file
│   │   ├── state id "label" id id id …  (listed objects are the focus)
│   │   ├── Focus: own colors, 2px border; edge between two focused nodes is focused too
│   │   ├── Rest: faded and neutral, like a `.` context line
│   │   └── `check` errors on unknown IDs and duplicate state IDs
│   ├── CLI output
│   │   ├── inspect --svg --state id    one state
│   │   └── inspect --svg --states      one aligned panel per state (and --png)
│   └── Viewer
│       ├── State switcher chips over the canvas; [ and ] step in file order
│       ├── ?state=id in the URL; the state is view state, never written to the file
│       └── Grid view: read-only small multiples of every state
└── LATER POSSIBILITIES
    ├── Add or remove the selection from a state in the viewer
    ├── Overlays (several states in one drawing) and multi-file boards
    └── Tags, per-state captions, walkthrough playback
```

## Behavior

| Situation                                | Expected result                                                                |
| ---------------------------------------- | ------------------------------------------------------------------------------ |
| A state lists a group                    | The group and all its members are in focus.                                    |
| A focused node sits in an unlisted group | The group frame stays plain, not faded, so the context reads.                  |
| A state lists an edge ID                 | That edge is in focus even when its ends are not.                              |
| A file has change marks and states       | Hue still means change; the state only adds fade and border weight.            |
| `--states` on a file with `compare`      | Error for now: one panel axis at a time.                                       |
| Viewer edit while a state is active      | Edits work on every object; dimmed objects stay selectable.                    |
| `href` is a URL / a `.draft` / a path    | New tab / open in the viewer / open in the editor (see the questions).         |
| Static SVG opened from disk              | A relative `href` resolves next to the SVG file, so repo docs link to sources. |

## Examples

Proposed syntax; spelling is settled while extending the parser:

```text
node api "API gateway" href="src/api/routes.ts"
node orders "Orders" href="src/orders/service.ts"
node db "Postgres"
node cache "Redis"
edge persist orders -> db "persist"

state write "Write path" api orders db
state read "Read path" api cache
```

`inspect --svg --state write` fades `cache`. `inspect --svg --states` draws two labelled panels,
"Write path" and "Read path", at the same positions.

## DSL shape: consider and contrast

Decision: how an agent declares which objects each state emphasizes.

| Approach                                    | Lines per new state | Reads at a glance | Fits diff layer | Survives ID edits |
| ------------------------------------------- | ------------------: | ----------------: | --------------: | ----------------: |
| A. `state id "label" ids…` (one line)       |                   9 |                 8 |               9 |                 7 |
| B. `tags=` on objects + `state id tag=…`    |                   5 |                 5 |               8 |                 8 |
| C. `emphasis=write,read` on each object     |                   3 |                 4 |               7 |                 9 |
| D. CLI flag only (`--focus a,b`)            |                  10 |                 2 |               6 |                 3 |
| E. Mark characters (`*node api`), one state |                   8 |                 9 |              10 |                 9 |

- **Lines per new state:** A adds one line; B and C touch every member line.
- **Reads at a glance:** A shows a whole state on one line; C spreads it through the file.
- **Fits diff layer:** E reuses the parser's mark slot exactly but allows only one state.
- **Survives ID edits:** A and D break on a rename; `check` catches A, nothing catches D.

**Choice:** A, with E's rule that rendering is a paint layer like the marks. **Why:** one line per
state keeps agent edits local and reviewable, and lists of IDs already exist (`order`, `align`).
**Watch:** long states. Repeating `state write ids…` with the same ID appends.

## Decisions and boundaries

**Appetite:** Four or five small PRs. No new renderer, no layout change, no walkthrough.

**Key decision:** One treatment layer. `status.ts` grows from "change status" to "how an object is
painted": diff status, focus and dim. `drawnSwatch`, `statusPaint` and `edgeInk` read it, so the
canvas, the CLI SVG and the legend change together.

**Key decision:** Multi-state output generalizes the `compare` panel code in `src/cli/svg.ts` from
two panels to N, laid out in a grid toward `aspect`. A state never changes geometry, so every panel
shares one set of routes, which is simpler than `compare`.

**Boundary:** The viewer keeps one editable canvas. Grid view is read-only, like comparison
candidates.

**First proof:** One state drawn from the CLI, before any viewer work.

**Try:** `inspect --svg --state write` on `examples/emphasis.draft`, with and without change marks.

**Observe:** `canonicalGeometry` equals the plain drawing; only focused objects keep hue.

**Decide:** If dim reads as "removed" next to a diff, lighten it before building `--states`.

See the [implementation plan](implementation-plan.md).
