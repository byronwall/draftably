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
│   │   ├── Members touch: no gap, shared inner borders, one outline
│   │   ├── Title in a filled header band inside the outline
│   │   ├── One row by default; `direction=down` makes one column
│   │   ├── `columns=N` wraps cells into a grid; each column takes its widest cell
│   │   ├── `span=N` on a cell covers N columns
│   │   └── `shape=marker`: a labelled divider on the seam between two cells
│   ├── Lines to cells
│   │   ├── A line ends on the target cell's own outer side when it has one
│   │   └── For an inner cell, the line crosses other cells and ends with a dot
│   ├── Tables: schema entities first, then general grids
│   ├── Byte layouts: `unit=byte|bit` on the cells layout
│   │   ├── Width means size: each unit has a fixed width; `span=` counts units
│   │   ├── `ruler=offset|bits` numbers the units under the header band
│   │   ├── A field that crosses a row end splits into two drawn pieces
│   │   └── `span=var` draws a variable-length field with broken ends
│   ├── Images in cells, after PR #28 lands image nodes
│   └── Viewer editing of cells: drag to reorder, inspector span (last PR)
└── LATER
    └── Row spans, cell text alignment, hex offsets per row, gap markers
```

Cells are nodes, so colors, links, `count=`, change marks and `compare` work on them unchanged.

## Behavior

| Situation                                    | Expected result                                                        |
| -------------------------------------------- | ---------------------------------------------------------------------- |
| Cell titles of different length in one row   | Each cell fits its title; all cells in a row share one height.         |
| A line targets a cell in the middle of a row | It enters through that cell's top or bottom side.                      |
| A line targets a cell with no free side      | It runs over the cells in its way and ends with a dot at the target.   |
| A line targets a marker                      | It ends at the marker's label, which sits just outside the outline.    |
| A cell has its own `size`                    | Width sets that column's width; height sets that row's height.         |
| A byte field is longer than the row          | It continues on the next row.                                          |
| A root `engine=` lays out the drawing        | The cell group keeps its own recipe; the engine moves it as one block. |
| A cell is dragged in the viewer (before M5)  | The whole group moves.                                                 |
| An image cell is exported to SVG or PNG      | A preview capped at the cell's size; the viewer opens the original.    |

## Examples

Proposed syntax. `span=var` and the `ruler` values are reversible spellings.

```text
# A sequence: how a request is built
group req "Request"
layout req cells
node sys "System prompt" in=req color=slate
node tools "Tool definitions" in=req color=slate
node cp "cache point" in=req shape=marker
node turn "New user turn" in=req color=amber
node cache "Prompt cache"
edge hit cache -> cp "cached prefix"

# A table: name and type columns; lines reach rows
group users "users"
layout users cells columns=2
node users.id "id" in=users
node users.id_t "uuid" in=users
node users.org "org_id" in=users
node users.org_t "uuid" in=users
edge fk users.org_t -> orgs.id

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
reuse of node features, ease for agents, and build risk. Byron chose the recipe.

| Option                                         | Cover | Lines | Reuse | Learn | Risk | Total  |
| ---------------------------------------------- | ----- | ----- | ----- | ----- | ---- | ------ |
| `cells` recipe on a group; cells are nodes     | 8     | 9     | 9     | 7     | 7    | **40** |
| Three statements: `sequence`, `table`, `bytes` | 8     | 8     | 6     | 8     | 4    | 34     |
| DOT-style `record` label: `"<a> A \| <b> B"`   | 7     | 6     | 3     | 6     | 6    | 28     |

**Appetite:** Sequences, then tables, then byte layouts, one PR each. Image cells wait for
PR #28's first milestone. Viewer editing is the last PR. No `.dot` importer.

**Main risk:** The router treats a group as a space lines may enter. A cell group must be one
block whose cells expose their outer sides, and a line to an inner cell must cross cells on
purpose, drawn on top.

**First proof:** Compile the request example with `inspect --svg`.

**Try:** Open the same file in the viewer and under `layout root engine=layered`.

**Observe:** Cells touch, the header band holds the title, the marker sits on its seam, and the
line ends at the marker. The viewer draws the same geometry.

**Decide:** If the router cannot reach a marker or mid-row cell cleanly, end the line at the
outline above it and draw the last stretch straight, as for an inner cell.

See the [intent brief](intent-brief.md) and the [implementation plan](implementation-plan.md).
