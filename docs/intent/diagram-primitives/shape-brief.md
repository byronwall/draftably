---
title: 'Diagram primitives — shape brief'
slug: 'diagram-primitives'
phase: shape
status: current
last_updated: '2026-10-26'
---

# Diagram primitives — what we are adding

**Outcome:** One new layout recipe, `cells`, turns a group into touching cells. It draws
sequences, tables and byte layouts, and lines can end at one cell.

**Primary flow:** Write a `group`, give it `layout <group> cells`, declare its cells as ordinary
`node … in=<group>`, and connect other nodes to single cells.

## Feature scope

```text
Diagram primitives
├── PLANNED ADDITIONS
│   ├── Cell groups: `layout g cells`
│   │   ├── Members touch: no gap, shared inner borders, one outline, title above
│   │   ├── One row by default; `direction=down` makes one column
│   │   ├── `columns=N` wraps cells into a grid; each column takes its widest cell
│   │   └── `span=N` on a cell covers N columns
│   ├── Lines to cells
│   │   └── A line ends on the cell's outer side; the strip is solid to other lines
│   ├── Byte layouts: `unit=byte|bit` on the cells layout
│   │   ├── Width means size: each unit has a fixed width; `span=` counts units
│   │   ├── `ruler=offset|bits` numbers the units above the first row
│   │   ├── A field that crosses a row end splits into two drawn pieces
│   │   └── `span=var` draws a variable-length field with broken ends
│   └── Images in cells
│       └── An image node from PR #28 can be a cell, at its `size`
├── TO EVALUATE
│   └── A narrow marker cell for a seam such as a cache point
└── LATER
    ├── Row spans, cell text alignment, header-row styling
    └── Viewer editing of cells: drag to reorder, inspector span control
```

Cells are nodes, so colors, links, `count=`, change marks and `compare` work on them unchanged.

## Behavior

| Situation                                    | Expected result                                                             |
| -------------------------------------------- | --------------------------------------------------------------------------- |
| Cell titles of different length in one row   | Each cell fits its title; all cells in a row share one height.              |
| A line targets a cell in the middle of a row | It enters through that cell's top or bottom side.                           |
| A line targets a cell with no free side      | `check` reports an error on the edge line.                                  |
| A cell has its own `size`                    | Width sets that column's width; height sets that row's height.              |
| A byte field is longer than the row          | It continues on the next row; `check` notes it if it splits more than once. |
| A root `engine=` lays out the drawing        | The cell group keeps its own recipe; the engine moves it as one block.      |
| A cell is dragged in the viewer              | The whole group moves. Reorder by dragging is a later item.                 |

## Examples

Proposed syntax. `cells`, `span`, `unit`, `ruler` and `span=var` are new words; spelling stays
open until parser review.

```text
# A sequence: how a request is built
group req "Request with a cache point"
layout req cells
node sys "System prompt" in=req color=slate
node tools "Tool definitions" in=req color=slate
node hist "Conversation so far" in=req color=slate
node turn "New user turn" in=req color=amber
node cache "Prompt cache"
edge hit cache -> hist "cached prefix ends here"

# A table: an entity with rows that lines can reach
group users "users"
layout users cells direction=down
node users.id "id  uuid" in=users
node users.org "org_id  uuid" in=users
edge fk users.org -> orgs.id

# A byte layout: one PNG chunk
group chunk "PNG chunk"
layout chunk cells unit=byte columns=12 ruler=offset
node len "Length" in=chunk span=4
node type "Chunk type" in=chunk span=4
node data "Chunk data" in=chunk span=var
node crc "CRC" in=chunk span=4
```

A TCP header is the same with `unit=bit columns=32 ruler=bits`.

## Decisions and boundaries

**One primitive, not three.** Each candidate was scored 0–10 on DOT coverage, lines to parts,
reuse of existing node features, ease for agents to learn, and build risk.

| Option                                         | Cover | Lines | Reuse | Learn | Risk | Total  |
| ---------------------------------------------- | ----- | ----- | ----- | ----- | ---- | ------ |
| `cells` recipe on a group; cells are nodes     | 8     | 9     | 9     | 7     | 7    | **40** |
| Three statements: `sequence`, `table`, `bytes` | 8     | 8     | 6     | 8     | 4    | 34     |
| DOT-style `record` label: `"<a> A \| <b> B"`   | 7     | 6     | 3     | 6     | 6    | 28     |

A DOT-style label loses per-cell color, marks and links. Three statements triple the work for
one geometry. The recipe reuses `group`, `node`, `in=` and `layout`.

**Appetite:** Three PRs for sequences, tables and bytes. Image cells follow PR #28's first
milestone. Viewer editing of cells is optional.

**Material pushback:** The memo frames sequences, bytes and tables as separate features. They
are one grid with different width rules. Building them as one recipe keeps the DSL small and
makes lines to cells work for all three at once.

**Main risk:** The router and the root engines treat a group as a space that lines may enter.
A cell group must act as one solid block whose cells expose only outer sides.

**First proof:** Compile the request example with `inspect --svg`.

**Try:** Open the same file in the viewer and under `layout root engine=layered`.

**Observe:** cells touch with shared borders, the line ends on the `hist` cell's side, and the
viewer draws the same geometry.

**Decide:** If the router cannot end a line on a mid-row cell
without crossing other cells, attach lines to the group's outline at the cell's span instead.

See the [intent brief](intent-brief.md) and the [implementation plan](implementation-plan.md).
