# Diagram files (`.draft`)

A `.draft` file is a readable diagram source that a person and an agent can both edit. It holds the
model (objects, groups, connections), the automatic layout recipe, and layout refinements. It
never holds a picture of the final layout: the same file always compiles to the same geometry.

The language is adapted from the Meld 0.1 prototype in `reference/meld/original/DSL.md`. Views and
checkpoints are not supported yet.

```text
diagram "Checkout architecture" version=1

# Comments start with # or // and are kept when the file is formatted.
group platform "Commerce platform" color=mint
node api "API gateway" in=platform
group services "Domain services" in=platform
node orders "Orders" in=services
node payments "Payments" in=services shape=pill
node db "Postgres" color=violet

edge dispatch api -> orders "create order"
edge persist orders -> db "persist" kind=async

layout root flow gap=48
layout services row gap=24
near payments orders side=right gap=32
pin db x=900 y=40
```

## Rules

Write one statement per line. Indentation means nothing; containment comes from `in=`. Strings
use JSON double quotes. IDs match `[A-Za-z_][A-Za-z0-9_.-]*` and must be unique across nodes
and groups. References may point to later lines.

| Statement                          | Meaning                                                                                                                                            |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `diagram "title" version=1`        | Optional title. At most one. Exports draw it above the drawing.                                                                                    |
| `compare "before" "after"`         | Draw the change marks as two aligned panels. `direction=right\|down`, `aspect=`. At most one.                                                      |
| `subtitle "text"`                  | One line under the title in exports. At most one.                                                                                                  |
| `node id "label"`                  | A shape. `in=group`, `color=`, `shade=`, `shape=box\|pill\|circle\|diamond\|text\|marker`, `href=`, `count=`.                                      |
| `group id "label"`                 | A container. `in=group`, `color=`, `shade=`, `frame=box\|soft\|none`. See [Soft groups](#soft-groups).                                             |
| `theme name`                       | The diagram's theme and diagram-wide overrides. See [Themes and colors](#themes-and-colors).                                                       |
| `theme-color family`               | One shade of a color family. See [Themes and colors](#themes-and-colors).                                                                          |
| `legend family "meaning"`          | One row of the color key: a swatch of `family` (`shade=` optional, 500 by default) and what it means. See [Themes and colors](#themes-and-colors). |
| `edge id source -> target "label"` | A connection between two nodes. `kind=async` draws it dashed; `from=`/`to=` choose sides.                                                          |
| `layout scope flow\|row\|column`   | How a scope (`root` or a group) arranges its direct children. `gap=`, `direction=auto\|right\|down`, `min-width=`, `min-height=`.                  |
| `layout root lanes`                | Swim lanes: each top-level group is a lane. See [Swim lanes](#swim-lanes).                                                                         |
| `layout root sequence`             | A sequence diagram: nodes are participants, edges are messages in file order. See [Sequence diagrams](#sequence-diagrams).                         |
| `layout group cells`               | The group's nodes touch, edge to edge, as one object. `columns=`, `unit=byte\|bit`. See [Cells](#cells).                                           |

| `layout scope engine=name` | Arrange a scope's whole subtree with a layout engine. See [Layout engines](#layout-engines). |
| `routing` | Router settings for every connection. See [Routing](#routing). |
| `config key=value` | File settings. See [Links and counts](#rules). |
| `state id "label" ids...` | A named emphasis state. See [Emphasis states](#emphasis-states). |

Colors are covered in [Themes and colors](#themes-and-colors). An `auto` color inherits the
family of the nearest colored group. Without a `layout` line, `root` uses `flow gap=48` and groups
use `column gap=24`.

`flow` ranks objects along its direction by their connections. A loop keeps its path in that
direction, and only the edge that closes it runs backwards. A run of ranks that is wider than
the canvas (1100×720) and more than three times longer than it is deep folds into rows (or
columns, for `direction=down`) that each start again at the beginning, like lines of text.
`fold=never` keeps it on one line. `engine=layered` folds the same way unless it has `fold=never`.
Where to fold is decided without edge labels, so labelling or relabelling an edge keeps every
object in its row; labels only widen the gaps they need, and add a row only when the labelled
rows run more than a quarter past the canvas.

Under `engine=layered` or `engine=compound-flow`, a drawing that holds groups is packed instead:
a drawing wider than the canvas and more than five times longer than it is deep first folds its
longest group into rows, one group at a time, so the groups keep their order; only if no group
can fold do the groups themselves wrap into rows. A group that only receives lines (an upstream
API, a cache) sits beside the group that calls it rather than past it. `fold=never` on the root
engine keeps one long line. Stays and pins never change what folds.

**Title and subtitle.** `inspect --svg` and the viewer's SVG and PNG exports draw the `diagram`
title and the `subtitle` line above the drawing, left-aligned with the legend, so a copied image
still says what it shows and why it matters. Like the legend, they never move anything. A file
without either draws no heading.

**Links and counts.** `href="src/api.ts"` on a node or group makes it a link in `inspect --svg`
and exports, to a source file, a URL or anything else the reader should open. A linked object
draws a small ↗ mark at its top-right corner (beside a container's title). In the viewer the mark
is the open button, and the Inspector shows the link with an **Open** button; a click elsewhere on
the object still selects it. The link opens as written: a URL (`https://…`, a GitHub link) in a
new tab, a `.draft` in the viewer, and a file path in VS Code. A file path may end in `:42` or
`:42:5` to open at that line and column. A relative path starts at the diagram's git root, or its
folder outside a repository.

In `inspect --svg` and the viewer's SVG export, each linked object is an `<a>` with a tooltip
naming its target, and its outline thickens on hover. A URL stays as written and opens in a new
tab. A file link is written as a path from the diagram's folder, without its line, so it opens
when the SVG is saved beside the `.draft`. Each object's group carries `data-id` with its ID.

`config` lines hold file settings. One line may set several keys, or each key may have its own
line; a key set twice is a warning and the later line wins.

```text
config link-base="../.." editor=cursor
```

`link-base` is where relative links start, relative to the `.draft` file's folder, for a
diagram whose paths don't start at the git root. `editor` is the editor file links open in:
`vscode` (the default), `vscode-insiders`, `cursor`, `windsurf` or `zed`. `check` warns about a
relative link whose file does not exist at the link base, and suggests the path it probably meant:
the same path from the diagram's folder, or the one file in the repository whose path ends the
same way. It never changes the link.

`count=42` on a node
says the box stands for 42 things: it draws as a stack with a `×42` badge, so a component used in
hundreds of places is one box rather than hundreds.

## Soft groups

A boxed group pads its members, reserves a title band and takes one place in its container's
layout, so its members move as one block. `frame=soft` keeps the group but not the box:

```text
group monitoring "namespace: monitoring" color=amber frame=soft
node prometheus "prometheus" in=monitoring
node grafana "grafana" in=monitoring
```

A soft group's members are laid out with the nearest boxed container around the group (or the
root), each ranked by its own connections, as if the group line were not there. The drawing then
puts a light tint of the group's color behind them, with its title small at the top left. Lines
cross a tint freely. `frame=none` lays out the same way and draws nothing; the members still
belong to the group, so `color=auto` still inherits its family. `frame=box` is the default.

Layout still keeps a soft group's members together where it can: within each rank they sit side
by side, and the gaps where a tint starts or ends widen to fit its padding and label, as does a
box that holds soft groups. The tint is one rectangle round the members when that covers nothing
else. Otherwise it is the members' own padded boxes, joined by strips across the gaps between
them that cover nothing else; `check` notes `soft-split` when some members cannot be joined, and
`soft-overlap` when a tint still covers an object outside the group.

A soft group has no layout or position of its own: `layout`, `order`, `near`, `align`, `nudge`,
`stay` and `pin` on it are errors. Place its members instead; refinements between a member and
an object beside the group work, since they share a container.

## Swim lanes

`layout root lanes` draws a process by who does each step. Every top-level group is a lane, and
every node must sit in one; a node outside every group is an error on its line.

```text
group customer "Customer"
group agents "Support agents"
node opens "Opens a ticket" in=customer
node triage "Triage" in=agents
node resolved "Sees it resolved" in=customer
edge e1 opens -> triage
edge e2 triage -> resolved
layout root lanes
```

Each step takes its rank from the connections of the whole drawing, so one rank is one column
across every lane, and a step that follows another sits after it even when it is in a different
lane. Steps of one lane in one rank stack across it. With `direction=right` (the default) lanes
are bands stacked top to bottom, in file order or the order an `order root` line gives; with
`direction=down` they are columns side by side and the steps run down the page. Every lane is as
long as the drawing. `gap=` sets the least gap between ranks (56 at least).

A group inside a lane follows its own `frame=`: a boxed group takes one place, and a soft group's
members rank on their own. Position refinements inside a lane (`near`, `stay`, `nudge`, `pin`)
do not apply yet. Lines that run back against the order take the long way round the lanes.

## Sequence diagrams

`layout root sequence` draws an exchange between participants. Every node is a participant,
drawn in a row across the top in file order (or the order an `order root` line gives), with a
dashed lifeline below it. Every edge is a message, drawn on its own row in the order the edge
lines appear, as a straight arrow from the sender's lifeline to the receiver's, so the file
reads top to bottom as the exchange does.

```text
node user "User" shape=pill
node app "Web app"
node auth "Auth service"
edge m1 user -> app "sign in"
edge m2 app -> auth "verify"
edge m3 auth -> auth "check hash"
edge m4 auth -> app "token" kind=async
layout root sequence
```

`kind=async` draws a dashed message, the usual mark of a reply. A message from a participant to
itself draws a short loop. Participants are spaced so each message's label fits between them.
Groups are an error in a sequence diagram, and position refinements do not apply. Change marks
work as anywhere else: a `+edge` line shows a new message in place. Fragments (`loop`, `alt`),
activations and notes are not supported yet.

## Cells

`layout group cells` draws a group as one object made of parts, like the parts of a request in
order. The group's nodes are its cells: they touch and share borders, in declaration order (or the
group's `order` line), under a band that holds the group's title. There is no gap and no inset.

```text
node client "Agent loop" color=blue
group req "Request" color=slate
layout req cells
node sys "System prompt" in=req
node tools "Tool definitions" in=req
node hist "Conversation so far" in=req
node cp "cache point" in=req shape=marker
node turn "New user turn" in=req color=amber shade=200
node cache "Prompt cache" color=violet
edge build client -> sys "assembles"
edge hit cache -> cp "cached prefix"
```

- Cells form one row by default; `direction=down` makes one column. Every cell in a row has the
  row's height; every cell in a column has the column's width.
- `columns=N` makes a grid, such as a table: cells fill each row of N columns in order. Each
  column is as wide as its widest cell. `span=N` on a cell covers N columns; a cell that does not
  fit the rest of its row starts the next row. A spanning cell wider than its columns widens the
  last of them.
- A cell is as wide as its title on one line, from 64 to 240 pixels, and wraps past that. A
  `size` line sets it exactly. A title band wider than the cells stretches the last cell.
- A cell has no color of its own unless it names one, so the band carries the group's color.
- `shape=marker` marks a seam, such as a cache point. It takes no room: a bar in the theme's text
  color cuts the object, title band included, before the next cell, and its label sits above.
  Lines reach a marker from below.
- Lines can start or end at any cell. A line meets a cell on a side that lies on the group's
  outline, facing the line's other end; a cell's top faces the title band, so it is never used.
  A cell with no such side, inside a grid, is reached across the cells in the way: the line
  enters the outline facing its other end, is drawn over the cells, and ends with a dot at the
  cell. `from=` and `to=` still choose a side.
- A marker needs one row or one column: it cannot cut a grid.
- A cell stays in its place. `near`, `nudge`, `stay` and `pin` on a cell are reported and
  ignored; move the group instead, by its title band. An engine on the root moves the group as
  one block.
- In the viewer, dragging a cell and dropping it among the others reorders the group: it writes
  the group's `order` line. A marker keeps its place before the cell it preceded. The inspector's
  **Span** field writes `span=`.
- Cells are nodes, so colors, links, `count=` and change marks work on them.

A table of a database entity, with a line from one row to another table's row:

```text
group accounts "accounts" color=blue
layout accounts cells columns=2
node accounts.id "id" in=accounts
node accounts.id_t "uuid" in=accounts
group invoices "invoices" color=teal
layout invoices cells columns=2
node invoices.id "id" in=invoices
node invoices.id_t "uuid" in=invoices
node invoices.account "account_id" in=invoices
node invoices.account_t "uuid" in=invoices
edge invoice_account invoices.account -> accounts.id
```

### Byte and bit layouts

`unit=byte` or `unit=bit` on a cells layout draws an on-disk or on-the-wire structure, like the
figures in the PNG spec or an RFC packet header. Every column is one unit of the same width, so a
field's width is its size.

```text
group chunk "PNG chunk" color=teal
layout chunk cells unit=byte columns=8
node chunk.length "Length" in=chunk span=4
node chunk.type "Chunk type" in=chunk span=4
node chunk.data "Chunk data" in=chunk span=var
node chunk.crc "CRC" in=chunk span=4
```

- `columns=` sets the units in each row: 16 by default for bytes, 32 for bits. `span=N` is the
  field's size in units; a field without one is one unit.
- A field longer than the rest of its row runs on into the next rows. Its title sits in its
  longest piece; the other pieces show it after an ellipsis.
- `span=var` is a field of variable length. It fills the rest of its row, or a whole row, and its
  sides are drawn broken.
- A ruler numbers the units between the title band and the first row. `ruler=off` hides it.
- `unit-width=` sets the width of one unit in pixels: 48 for bytes and 24 for bits by default.
  Titles wrap to fit their field, so give one-bit flags short titles.
- Markers do not apply to byte or bit layouts.

## Change marks

To show what changed between two versions, write one file and mark the lines that differ, as in a
diff. A mark is one character before `node`, `group` or `edge`:

```text
node api "API gateway"
~node orders "Orders service" was="Orders"
+node refunds "Refunds"
-node hook "Legacy webhook"
.node audit "Audit log"
+edge refund orders -> refunds "refund"
-edge notify api -> hook "notify"
```

| Mark | Meaning                      | Drawn as                                               |
| ---- | ---------------------------- | ------------------------------------------------------ |
| `+`  | Added                        | Pale green fill, strong green border; green line       |
| `~`  | Changed                      | Pale amber fill, strong amber border; amber line       |
| `-`  | Removed                      | Pale red fill, dashed red border, title struck through |
| `.`  | Unchanged, shown for context | Neutral and faded                                      |

`draftably compare before.draft after.draft` writes these marks for you. It matches nodes,
groups and edges by ID, prints the newer file with `+` and `~` on its new and changed lines, and
puts each removed declaration back, marked `-`, after the line that preceded it in the older file.
It also prints the size of the change, such as `3 added, 1 changed, 2 removed.`, on stderr, so
stdout stays the file. A node that moved to another container, or an edge that now joins
different objects, becomes two declarations: the old one removed under the ID `<id>-was` and the
new one added. The lines of a moved node are split the same way. Each panel then draws its own
version, and the merged drawing shows the move. A group that moved keeps one position, so both
panels draw it in its new container; `compare` names those groups on stderr. A tool that generates
diagrams only has to write two plain files.

**Side by side.** Add a `compare` line to draw the two versions as panels instead of one merged
drawing: `compare "main" "PR 123"` names them (`Before` and `After` by default). The old panel
leaves out `+` objects and shows `was=` labels; the new panel leaves out `-` objects. Both panels
use the merged positions and the merged routes, so every unchanged object and line sits at the same place in each. `direction=right` sets the
panels side by side, so every row lines up across them; `direction=down` stacks them, so every
column lines up. Without it, the arrangement whose whole image comes closest to `aspect` (width
over height, 1.6 by default) wins: a wide flow usually stacks and a tall one sits side by side. Each panel takes
only the room its version needs along that axis, and a container that lost members in a panel
shrinks to fit the rest; no object moves, so the alignment holds. The canvas keeps
showing the merged drawing, where edits go; `inspect --svg` and exports draw the panels.

Unmarked lines are unchanged. `was="old label"` on a `~` line records the label before the
change.

In a file with marks, color means change and nothing else. Unchanged shapes are drawn on the
theme's neutral surface, containers become quiet outlines, and unchanged lines turn grey, so only
the marked objects carry a hue. `color=` and `legend` lines are kept but not drawn; remove the
marks and the file draws in its own colors again. The green, amber and red come from the theme,
so every theme draws a diff in its own palette. Each mark also has a border weight, dash, fade
or strike, so it reads in grayscale too, and the legend is one row of the marks the file uses, each with how many objects and lines carry it. Marks never move anything: the drawing
holds both versions at once, so unchanged objects stay where they are.

## Emphasis states

One diagram often answers several questions: what the write path touches, what a request reads.
A `state` line names a way to draw the diagram: the objects and connections it lists are in
focus, and everything else fades.

```text
state write "Write path" web api orders payments db queue
state read "Read path" web api catalog cache
state events "Events" queue publish rest=plain
```

The first word is the state's ID, then an optional label in quotes, then the IDs in focus:
nodes, groups (a group brings all its members) and connections. A connection between two
focused nodes is in focus too. A long state may continue on more lines with the same ID.

In focus, an object keeps its colors and draws a heavier border; a connection draws a heavier
line. Everything else fades to the theme's neutral surface, like a `.` context line, except the
containers that hold something in focus, so the context still reads. `rest=plain` leaves
everything else as it is, for a soft highlight; with nothing faded, focused objects take a ring
and focused connections a line in the theme's `secondary` accent. A state never moves anything:
every state of a file has the same layout. In a file with change marks, hue still means change;
a state only adds the heavier border or the fade.

`inspect --svg --state write` draws one state; without `--state`, the drawing has none.
`inspect --svg --states` (or `--png`) draws every state as its own labelled panel, in file
order, in a grid whose whole image comes closest to 1.6 wide per tall. Every object sits at the
same place in every panel, so the eye can jump between them.

In the viewer, a file with states shows a row of chips over the canvas: **All**, each state, and
**Grid**. A chip draws that state in place, and `[` and `]` step through them in file order.
**Grid** shows every state side by side, as `--states` draws them; click a panel to draw that
state. The state is part of the address (`?state=write`), so a link or a reload keeps it, but it
is never written to the file. Edits work in any state, on faded objects too. `check`
reports an ID a state lists that the file does not declare. Deleting an object or connection in
the viewer takes it out of every state.

## Themes and colors

The file owns the diagram's appearance. A `theme` line picks a preset and may override its
diagram-wide values; `theme-color` lines change or add colors. Every value is optional: anything
not written comes from the preset, and a file with no `theme` line uses Drafting.

```text
theme fieldnotes padding-x=18 padding-y=12 radius=3 title-font=serif annotation-font=sans
theme-color blue shade=500 fill="#405D48"
theme-color brand shade=100 fill="#EAF1ED" stroke="#9AB4A4" ink="#244431"
theme-color brand shade=800 fill="#244431" stroke="#244431" ink="#FFFFFF"
node context "Context" color=brand shade=100
node focus "Main step" color=brand shade=800
```

| Theme        | Character                                                                    | Titles     | Padding x / y |
| ------------ | ---------------------------------------------------------------------------- | ---------- | ------------- |
| `drafting`   | Navy ink on cool paper, drafting blue and marker gold. Compact. The default. | sans-serif | 12 / 20       |
| `fieldnotes` | Editorial: serif titles on warm paper, indigo and terracotta.                | serif      | 18 / 22       |
| `signal`     | Color-blind-safe Okabe–Ito hues on white, monospace connection labels.       | sans-serif | 16 / 20       |
| `ink`        | Sumi ink tones, indigo and a vermilion seal, generous padding.               | sans-serif | 22 / 26       |
| `blueprint`  | Dark: white lines on blueprint blue, cyan and yellow, monospace titles.      | monospace  | 16 / 20       |

`theme` attributes: `padding-x` and `padding-y` (4–48, the space between a node's edge and its
title), `radius` (0–24, rectangle corners), `title-font` and `annotation-font` (`sans`, `serif` or
`mono`), and `canvas`, `text` and `connection` colors. Colors are hex values in double quotes:
`#` outside quotes starts a comment.

Switching themes keeps the layout: nodes are placed on slots sized in Drafting (with the file's
own overrides) and drawn at the theme's size in their slot, centred along the reading direction
with each row keeping its top. A slot grows only where the theme's node is larger than the gap
around it can absorb, so rows and order always hold.

**Families and shades.** Built-in families: `primary` and `secondary` (the theme's own accents),
`slate`, `stone`, `blue`, `sky`, `teal`, `mint`, `green`, `amber`, `orange`, `red`, `rose` and
`violet`. Each has shades `50 100 200 300 400 500 600 700 800 900 950`; lower numbers are lighter
and higher numbers darker in every theme, dark ones included. Shades 50–300 are pale fills with
dark text and 400–950 are fills with white text, each held to WCAG contrast targets (7:1 and
4.5:1). Warm families (`amber`, `orange`, and a theme accent of those hues) keep 400 and 500
bright with dark text, since a warm fill dark enough for white text turns brown; their 600 and
darker carry white text. A theme may tune a family's hue: Signal draws `green`, `orange`, `red`
and `rose` as Okabe–Ito's bluish green, orange, vermilion and reddish purple. A node that names a color without a shade uses 500; a group uses a quiet surface shade
(100, or 900 in Blueprint). Shade is chosen per object: `color=auto` inherits a group's family,
never its shade. A node with neither color nor shade uses the theme's neutral surface.

**Legend.** `legend family "meaning"` adds a row to the diagram's color key, in file order: a
swatch of that family (`shade=` picks one; 500 by default) and its meaning. The viewer shows the
key in the canvas corner, in the diagram's colors; `inspect --svg` and exports draw it under the
drawing. Each family and shade may appear once. A legend never moves anything.

```text
group edge "Edge" color=blue
node db "Postgres" color=violet
legend blue "Public entry points"
legend violet "Data stores"
```

Drawing keeps an object apart from a container of its own family. A group inside a same-family
group steps one shade toward emphasis per level (100, 200, 300 in light themes; 900, 800, 700 in
Blueprint), so nested frames read as layers rather than one fill. A node whose shade is within
two steps of its container's moves three steps past it. `check` notes a file with more than four
accent families (`many-colors`; `slate` and `stone` don't count) and a member that names its
container's family (`color-matches-container`).

`theme-color family shade=N fill= stroke= ink=` sets one shade (`shade` defaults to 500). For a
built-in family any of the three may be given and the rest come from the theme. A new family,
such as `brand`, defines each shade it uses with all three. Referencing a family or shade that is
not defined is an error on the referencing line. Each family and shade may be declared once.

Padding and title type change node sizes and so the layout; colors and shades never move
anything. Choosing a theme in the viewer's **Appearance** menu rewrites the `theme` line, clears
the old preset's overrides and keeps your own `theme-color` families.

Titles wrap using width tables for the bundled fonts (Inter, Source Serif 4 and JetBrains Mono,
under the SIL Open Font License), so the compiler, the viewer and `inspect --svg` break every
title at the same place. A word too long for a line breaks where an identifier's parts meet
(`annotation` / `Commands`, `src/` / `viz/`), and a node without a `size` grows wider, up to twice
its default width, rather than break a word in the middle. Exported SVG files embed the fonts
they use.

## Layout engines

`layout scope engine=name` arranges a scope with one of the editor's layout engines instead of a
built-in recipe. The engine runs from scratch each time the file compiles, so the result depends
only on the objects, their sizes and the connections, never on an earlier drawing. Adding an
object lays the scope out again.

```text
layout root engine=compound-flow
layout root engine=layered direction=down rank-gap=96 fold=auto
layout services engine=grid
```

Engines: `compound-flow`, `boundary-align`, `compound-spring`, `tidy`, `stress`, `force`,
`flow`, `layered`, `tree` and `grid`. The editor's Layout options panel describes each one.

An engine on `root` arranges everything, including the contents of groups. A group with its own
`layout` line keeps that recipe instead. An engine on a group arranges only that group. Groups
are then sized to fit their content, as with the built-in recipes, and `near`, `stay`, `pin` and
the other refinements apply on top of the engine's arrangement.

Under `compound-flow` or `layered`, groups are packed tight. Members of a group rank by the
connections between them, so a chain reads as a straight row or column in the reading direction.
They don't keep the drawing's global rank columns. The engine still decides their order across
each rank. A scope that holds groups is packed the same way. Every gap next to a group is the same
across the drawing: `group-gap`, widened up to 96px when more lines cross a gap, at 16px pitch
(the router's `edge-gap`).

| Setting            | Values                   | Setting         | Values                |
| ------------------ | ------------------------ | --------------- | --------------------- |
| `direction`        | `auto\|right\|down`      | `edge-length`   | 20–260                |
| `node-gap`         | 4–160                    | `repulsion`     | 0–100                 |
| `rank-gap`         | 12–220                   | `flow-strength` | 0–100                 |
| `group-gap`        | 12–180                   | `alignment`     | 0–100                 |
| `boundary-pull`    | 0–100                    | `compactness`   | 0–100                 |
| `hierarchy-sweeps` | 1–4                      | `grid-strength` | 0–100                 |
| `ordering`         | `stable\|crossings`      | `fold`          | `auto\|never`         |
| `aspect`           | `1\|1.333\|1.6\|2\|0.75` | `root`          | a node ID, for `tree` |

`min-width` and `min-height` work as they do for the built-in recipes; `gap` does not apply.

Where an engine has no reason from the connections to put one object before another, file order
decides, and a scope's `order` line overrides file order. Under `layered` without groups, the
order line holds within each rank unless reordering removes clearly more crossings. Ids never
matter: renaming an object doesn't move anything.

## Routing

One `routing` statement sets the router for every connection:

```text
routing edge-gap=24 clearance=12 corner-radius=0
```

Settings: `clearance`, `standoff`, `port-gap`, `edge-gap`, `bend-penalty`, `crossing-penalty`,
`shared-penalty`, `parallel-penalty`, `port-stability`, `fanout-penalty`, `passes` and
`corner-radius`, with the router's own ranges. Without it, the router's defaults apply.

`clearance` (default 10) is the hard distance a line keeps from boxes. `standoff` (default 20,
0 to 40) is the distance the router prefers for a line running alongside a box or a group border,
inside or outside it. A line comes closer only when no clearer route exists. Only a group's title
blocks its header band, so a line can enter a group straight down beside the title. `standoff=0` turns the
preference off.

When the root `layout` line declares `direction=right` or `direction=down`, a forward connection
between objects that layout places leaves its source's trailing side and enters its target's
leading side (bottom to top going down), turning in the gap between ranks. It uses another side
only when those are blocked. Connections inside a group with its own recipe are left to that recipe.

## Refinements

Refinements adjust the automatic layout for one object. Positions are relative to the parent's
content area, not the whole canvas, so moving a group moves everything inside it.

| Statement                                | Strength | Meaning                                                                                |
| ---------------------------------------- | -------- | -------------------------------------------------------------------------------------- |
| `near id ref side=right gap=28 offset=0` | soft     | Place next to a sibling. `strength=required` enforces side and gap.                    |
| `nudge id dx=0 dy=0`                     | soft     | Offset from the automatic position.                                                    |
| `stay id x= y= weight=8`                 | soft     | Prefer this position; resists movement when content changes. Layout tools write these. |
| `pin id x= y=`                           | hard     | Exactly this position. Automatic layout never moves it.                                |
| `size id width= height=`                 | —        | Exact node size. A title that does not fit is reported, not grown.                     |
| `order scope id...`                      | soft     | Preferred order of a scope's children.                                                 |
| `align x\|y id...`                       | soft     | Align centers of siblings. `strength=required` locks them.                             |

Soft rules give way to keep siblings from overlapping. When one does, `check` reports it with its
line. Pins never move; conflicting pins are reported as errors.

## Command line

```bash
pnpm draftably check examples/checkout.draft      # errors, diagnostics, conflicts; exit 1 on errors
pnpm draftably check examples/checkout.draft --hints  # also: how far each refinement moved its target
pnpm draftably check examples/ --quiet            # every .draft in a folder (or several files); no info notes
pnpm draftably format examples/checkout.draft     # print formatted source (--write to save)
pnpm draftably inspect examples/checkout.draft    # canonical node and route geometry as JSON
pnpm draftably inspect examples/checkout.draft --svg > checkout.svg
pnpm draftably compare old.draft new.draft        # one file with + - ~ marks (--write, --svg)
pnpm draftably inspect examples/checkout.draft --png checkout.png --scale 2
pnpm draftably extract checkout.png              # print the source embedded in a PNG or SVG export
pnpm draftably vary examples/checkout.draft       # layout variants: contact sheet, metrics, ranking
pnpm draftably vary examples/checkout.draft --apply v1  # write variant v1 into the file
pnpm draftably open examples/checkout.draft       # serve the viewer for this file (after pnpm build)
pnpm draftably open                              # start page for the current folder's diagrams
pnpm draftably vary --help                       # any command's options; --version for the version
pnpm draftably skill install                     # agent skill into ./.claude/skills/draftably
```

`check`, `format`, `inspect`, `compare` and `open` also take a PNG or SVG export in place of a
`.draft` file, and read the source embedded in it. `open` writes that source to a `.draft` beside
the image first. `extract --write file.draft` saves the source instead of printing it. `extract`
exits 1 when the image carries no source.

### Source in exported images

`inspect --png`, `inspect --svg`, `compare --png` and `compare --svg` embed the formatted source,
and the viewer's PNG and SVG exports embed the open file's source. A `compare` export embeds the
marked file, so both versions come back. `--no-source`, or the checkbox in the viewer's export
menu, leaves it out. Dropping or pasting an image with source into the viewer opens it as a new
scratch diagram. The format is stable, so other tools can read it:

- **PNG:** an `iTXt` chunk with keyword `draftably`. Its text is the UTF-8 source, with the
  compression flag set to 1 (zlib) or 0 (none); readers accept both. A `tEXt` chunk with keyword
  `draftably-version` names the Draftably version that drew it. Both sit before `IEND`. The
  chunks do not change the pixels.
- **SVG:** a `<metadata id="draftably-source" data-draftably-version="…">` element inside the root
  `<svg>`, holding the XML-escaped source.

Hosts that recompress images drop the PNG chunk. See the README for where it survives.

### Layout variants

`vary` tries other `layout` and `routing` lines for a file, draws each one as the CLI does, and
ranks them against the file as it is. It reads the diagram's shape (groups, the longest chain of
connections, a tree with one start, long connection labels) and tries the engines and settings
that suit it: `compound-flow` for groups and `layered` without, in both reading directions,
`ordering=crossings`, `flow` for a long chain, `tree` for a tree, a wider `rank-gap` for long
labels, and a router that avoids crossings harder. Files whose root uses `lanes`, `sequence` or
`cells` get routing variants only.

```text
$ pnpm draftably vary examples/checkout.draft
5 variants tried, 2 kept. Sheet: examples/checkout.vary/contact-sheet.png
id  change               crossings  bends    size            warnings  moved  notes
v0  current              0          8        1143×462        0                fewest bends
v1  compound-flow down   0          9 (+1)   598×713 (-19%)  0         349px  recommended, smallest
v2  compound-flow right  0          11 (+3)  1143×451 (-2%)  0         46px   least moved
v1: 3 groups, reading down.
v2: 3 groups, reading right.
Recommended: v1. Apply: draftably vary examples/checkout.draft --apply v1
```

- Output goes to `<name>.vary/` beside the file, or to `--out <folder>`: `contact-sheet.png`
  with every variant as a labeled tile, `v0.png` (the file as it is), `v1.png` and on, and
  `variants.json`. Each PNG embeds its variant's source.
- **Metrics:** crossings, bends, canvas size, the warnings `check` would print (plus `soft-split`
  notes, since a soft group drawn in pieces no longer reads as one group), and `moved`, the
  mean distance a box moved from where the file draws it. Changes from `v0` show in brackets.
- **Ranking:** variants that draw the same picture as an earlier one are dropped. A variant
  counts as better than the file when it has fewer warnings and no more crossings, or when it
  has no more warnings, crossings or area and less of one; those come first, then fewest warnings, crossings, area and bends. `--limit N` keeps
  N (default 4, up to 12). The run is deterministic: the same file gives the same variants.
- **Recommended** is the first variant better than the file, or `v0` when none is.
- **From the file itself**, the suggestions also try:
  - dropping the refinement lines `check` blames for drawing conflicts, so layout places those
    objects (`no line 15`);
  - for a file with change marks or a `compare` line, panels side by side and stacked;
  - fewer containers: `frame=soft` on leaf groups, then also on groups whose members span more
    than one rank, never on the group that holds most of the drawing. Only groups with no
    `layout` or position lines of their own qualify, so applying one changes only `group`
    lines.
- `--try key=a,b` tries exactly those values instead of suggesting, in order, and keeps every
  one. A second `--try` makes a grid (12 variants at most), with the first axis varying fastest.
  `--try key` alone uses the steps the viewer's Compare offers (`rank-gap` → 28, 52, 88). Keys
  are `engine`, `direction`, the engine settings in [Layout engines](#layout-engines) and the
  settings in [Routing](#routing). An engine setting on a scope with a built-in recipe also sets
  the engine: the scope's own, else `compound-flow` with groups or `layered` without.
- `--grid` tries `layered`, `compound-flow` and `flow`, plus `tree` for a tree with one start,
  each reading right and then down. Sweeps keep a variant that draws the same picture as an
  earlier one and tag it `same as v1`, so a setting with no effect shows. On a `lanes` root,
  `--grid` and `--try engine=…` try engines while `v0` keeps the lanes, so lanes are one more
  option to compare.
- `--budget 60s` (or `2m`, `5000ms`) stops trying new variants after that long and ranks the
  ones found; the table says how many were left. Each variant prints a line to stderr as it
  finishes, with its crossings, size and time, so a long run shows its progress.
- `--fit wide|slide|square|page|tall` aims for an image shape (aspect 2, 1.78, 1, 0.77, 0.6).
  It changes what is tried (the matching direction first, and the engine's `aspect` with
  folding) and what ranks first: closeness to the shape comes right after warnings. A variant
  then counts as better when it fits the shape better and grows by at most half; more growth
  is empty space, not a better fit. With `--fit` the
  table adds an `aspect` column.
- `--prefer fewer-crossings|compact|stable` sets the order after warnings: crossings then area
  (the default), area then crossings, or the least movement from the current drawing.
- `--from <id>` searches around a variant of the last run: that variant as it was, the other
  direction, the other rank ordering and folding, `rank-gap`, `node-gap` and `group-gap` one
  step either way, and two router settings. Each keeps the variant's own edits, so the loop is:
  `vary`, look, `vary --from v2`, look, `vary --apply v1`.
- `--scope <group>` varies that group's `layout` line instead of the root's. The suggestions
  then use the group's own shape, and routing (which is the whole file's) stays as it is.
- `--json` prints `variants.json`: for each variant its id, title, reason, the exact lines it
  changes (`before` and `after`), its edits and metrics.
- `--apply <id>` writes that variant from the last run into the file and prints the lines it
  changed; `--apply best` takes the recommended one. It changes only those lines and keeps
  comments, IDs and refinements. An engine that replaces a built-in recipe drops the recipe and
  its `gap`. It then checks the file. It refuses when the file changed since the run.

### Drawing conflicts

`check` also measures the drawing and reports conflicts as warnings. Layout and routing avoid
them on their own, so a conflict usually comes from a refinement. Each warning ends with its
rule:

| Rule                 | Meaning                                                             |
| -------------------- | ------------------------------------------------------------------- |
| `edge-through-node`  | A line runs through a box that is not one of its ends.              |
| `edge-through-title` | A line crosses a group's title.                                     |
| `node-overlap`       | Two boxes overlap (across scopes; siblings are an `overlap` error). |
| `label-collision`    | An edge label covers a box or another label.                        |
| `outside-group`      | A box sits outside its group's frame.                               |

When a refinement on one of the objects caused it, the warning names its line and a fix:

```text
warning line 13: Edge call (web -> api) runs through cache. Remove the pin on line 13, or change it to x=0 y=-64. [edge-through-node]
```

`check --hints` adds a table with one row for each object a refinement names: its id, the
refinement and line, where layout alone puts it (raw), where it is drawn (final), and the distance
between them. A last line lists objects that moved only because a refinement pushed them.
`inspect --json --hints` adds `raw: {x, y}` to every node a refinement moved. Raw positions come from the
same file compiled without its refinement lines.

`skill install` copies the agent skill in [`skills/draftably`](../skills/draftably/SKILL.md), which
teaches coding agents to write and check `.draft` files. `--global` installs it under
`~/.claude/skills`, `--dir` names another skills folder, and `--force` replaces an existing copy.
`npx skills add byronwall/draftably` installs the same skill from the repository.

`open` serves a folder: the current folder, the folder you name, or the current folder around
the file you name. Without a file, the viewer starts on a page that lists every `.draft` file in
the folder (skipping dot folders and `node_modules`), creates a new one, or opens an example. Each
file opens at `?file=path/in/folder.draft`, so links and reloads keep it.

`open` watches the open file. Edits made in another program appear in the viewer at once. If the
source becomes invalid, the viewer keeps the last valid drawing and shows the error line. During
development, `DIAGRAM_ROOT=folder pnpm dev` serves the same folder from Vite;
`DIAGRAM_FILE=path/to/file.draft` serves the current folder and prints the file's address.

## Examples

`examples/` holds the bundled diagrams, from flat flows to five levels of containers. They are bundled
into the viewer, so they open without a server at `?example=id`. An example is a scratch copy:
an amber **Example** bar stays across the top, the toolbar reads _Example · not on disk_, and
nothing is written anywhere. Edits behave exactly as in a file. **Save as file…** writes the
current source to a new file in the served folder and opens it; on the static site the bar offers
**Download .draft** instead. Leaving an edited example asks first.

The file is the source of truth while it is open: browser storage is not read or written, and
moving the camera never changes the file.

`--png <file>` on `inspect` or `compare` saves a PNG at `--scale` times the SVG's size (2 by
default) and prints its size in pixels. `--max-width <px>` lowers the scale so the image is at
most that wide. It renders with an installed Chrome, Chromium or Edge in headless mode; set
`CHROME_PATH` to use another copy.

`inspect` uses the editor's own router and the same font tables, so its geometry matches the
viewer. `inspect --svg` draws with the file's theme and embeds its fonts.

## Editing in the viewer

Edits made in the viewer are written back to the file as readable statements:

| In the viewer                              | In the file                                                         |
| ------------------------------------------ | ------------------------------------------------------------------- |
| Drag an object                             | `near` the closest sibling it does not overlap; `nudge` if none.    |
| Drag a soft group's tint                   | A `stay` for each member at its new place; the group gets none.     |
| Pin or unpin (**P**)                       | `pin` at its position; unpinning leaves a soft `stay`.              |
| Resize a shape or container                | `size`, or `min-width`/`min-height` on the container's `layout`.    |
| Drag a cell among its group's cells        | The group's `order` line. **Span** in Inspector writes `span=`.     |
| Add, rename, connect, delete, recolor      | `node`, `group` and `edge` declarations, with IDs from the label.   |
| Color family or shade in Inspector         | `color=` and `shade=` on the declaration.                           |
| Theme or padding in **Appearance**         | The `theme` line; preset changes drop built-in `theme-color` lines. |
| Wrap in a container or ungroup             | A `group` and the members' `in=`.                                   |
| Clear manual markers                       | Removes the object's soft position refinements.                     |
| Rebuild, or Apply in Compare               | `layout scope engine=…` for the diagram or the selected container.  |
| Tidy positions, a timeline step, the brush | `stay` for each object that moved, plus anchors around them.        |
| Routing options, or a routing Compare      | The `routing` line.                                                 |

An accepted move, pin or resize also writes soft `stay` anchors for the objects around it: every
top-level object, and the siblings of the edited object and of its containers. When an agent later
adds content, nearby objects make room while anchored regions hold. If growth forces an anchor to
give way, the status bar's **layout notes** name it with its line, and the change notice lists the
objects outside the edit that moved. **Reflow group** (Edit menu or inspector) removes the soft
refinements inside a group so its recipe arranges it again, and anchors what is around it.

Each save is checked against the file's revision. If the file changed on disk first, the viewer
shows the file and keeps your edit aside: **Keep file** discards the edit, and **Save my edit over
it** replaces the newer file. Undo and redo step through the file's versions; a change from
outside the viewer clears them, so undo never erases someone else's work.

## Layout tools

A rebuild arranges a scope from scratch, so it is saved as a recipe. **Preview automatic layout**
in Layout options, and every rebuild candidate in **Compare**, compile the file with the new
`layout` line. What you see is exactly what the file will draw, and **Keep** or **Apply** saves
that line. Soft position refinements inside the scope are removed so the engine's arrangement
shows; pins, sizes and the nested groups' own `layout` lines stay. Layout options shows the
scope's current line and the one a rebuild would write. The routing menu and routing comparisons
write the `routing` line.

**Tidy positions**, **Preview tidy**, a kept **timeline** step, a **brush** stroke, and warm-start or
pass candidates in Compare all start from the current drawing, so a recipe could not reproduce
them. They are saved as an arrangement instead: each object that moved gets a soft `stay` at its
new position relative to its parent (an existing `stay` is updated in place), and the objects
around them are anchored as for a drag. Groups follow their contents, so a group whose children
moved left or up moves with them. Pins never move. A root-level `stay` may be negative, because
the root has no frame.

Checkpoints are unavailable while a file is open, because undo steps through the file's versions.
Connection bends, label positions, start/end preferences and images are unavailable because the
file cannot store them yet.
