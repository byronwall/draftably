---
name: draftably
description: Create, edit, check and render Draftably `.draft` diagram files — a readable text DSL for architecture, flow, pipeline, event and container diagrams with automatic layout. Use when the user asks for a diagram, an architecture or system drawing, a flowchart, or mentions a `.draft` file or Draftably.
---

# Draftably diagrams

A `.draft` file is plain text that compiles to a laid-out diagram. You declare objects, groups
and connections; automatic layout places them. The same file always draws the same picture, so
edit the source, never coordinates you guessed.

Run the CLI with `npx draftably` (or `draftably` if installed globally, or `pnpm draftably`
inside the Draftably repo). It needs Node 22.21 or later.

## Workflow

1. **Plan the model.** List the boxes, the containers they belong to, and the connections. Pick
   short stable IDs (`api`, `orders_db`) and human labels (`"Orders DB"`).
2. **Write the file** with declarations first, then edges, then `layout` lines.
3. **Check it:** `npx draftably check diagram.draft`. Fix every `error`; read every `warning`.
   Exit code 1 means errors.
4. **Look at it.** `npx draftably inspect diagram.draft --svg > diagram.svg` renders a static SVG
   you can open or convert to an image. `npx draftably inspect diagram.draft` prints node and
   route geometry as JSON, useful for spotting overlaps or odd placement without an image.
5. **Hand it to the user:** `npx draftably open diagram.draft` serves an editor (default port
   5180, use the URL on its `Viewer:` line). Edits made in the viewer are written back to the
   file, and edits to the file show in the viewer at once. Run it in the background; it does not
   exit by itself.
6. **Recover a diagram from an image.** PNG and SVG exports carry their source.
   `npx draftably extract diagram.png` prints it (`--write diagram.draft` saves it), and `check`,
   `inspect`, `format`, `compare` and `open` accept the image in place of the `.draft`. Use
   `--no-source` on `--png`/`--svg` exports when the labels must not travel with the picture.
7. **Tidy:** `npx draftably format diagram.draft --write` normalizes the source and keeps
   comments.

## Syntax

One statement per line. Indentation means nothing. Strings use JSON double quotes. IDs match
`[A-Za-z_][A-Za-z0-9_.-]*` and are unique across nodes and groups (edges have their own IDs).
References may point to later lines. Comments start with `#` or `//`.

```text
diagram "Checkout architecture" version=1
subtitle "Orders persist before payment is authorized"

group clients "Customer channels" color=blue
node web "Web app" in=clients
node mobile "Mobile app" in=clients

group platform "Commerce platform" color=mint
node api "API gateway" in=platform
group services "Domain services" in=platform
node orders "Orders" in=services
node payments "Payments" in=services shape=pill

node db "Postgres" color=violet

legend blue "Clients"
legend mint "Our services"
legend violet "Data stores"

edge checkout web -> api "HTTPS"
edge native mobile -> api "HTTPS"
edge dispatch api -> orders "create order"
edge charge orders -> payments "authorize"
edge persist orders -> db "persist" kind=async

layout root flow gap=48
layout platform column gap=28
layout services row gap=56
```

| Statement                          | Options                                                                                                            |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `diagram "title" version=1`        | Optional, at most one. Exports draw the title above the drawing                                                    |
| `compare "before" "after"`         | Optional, at most one. Exports draw a marked file as two aligned panels with these labels                          |
| `subtitle "text"`                  | Optional, at most one. One line under the title in exports: the takeaway, not a second title                       |
| `+node`, `-node`, `~node`, `.node` | Change marks (also on `group` and `edge`): added, removed, changed, unchanged context. `~` takes `was="old label"` |
| `node id "label"`                  | `in=group`, `color=`, `shade=`, `shape=box\|pill\|circle\|diamond\|text`, `href=` link, `count=N` stack            |
| `group id "label"`                 | `in=group` (groups nest), `color=`, `shade=`                                                                       |
| `theme name`                       | Preset look (see below); optional, at most one                                                                     |
| `legend family "meaning"`          | `shade=`. One row of a color key drawn beside the diagram; one line per color you use                              |
| `theme-color family`               | `shade=50..950`, `fill=`, `stroke=`, `ink=`: change a built-in shade or define a new family                        |
| `edge id source -> target "label"` | Label optional. `kind=async` draws dashed; `from=`/`to=` `auto\|left\|right\|top\|bottom` pick sides               |
| `layout scope flow\|row\|column`   | `gap=8..300`, `direction=auto\|right\|down`, `min-width=`, `min-height=`; flow: `fold=auto\|never`                 |
| `layout scope engine=name`         | Layout engine for a scope's whole subtree (see below)                                                              |
| `routing ...`                      | Router settings for all connections, e.g. `routing edge-gap=24 clearance=12 standoff=20`                           |
| `state id "label" ids...`          | Emphasis state: listed nodes, groups and edges in focus, the rest faded; `rest=plain` keeps the rest               |
| `config key=value ...`             | File settings: `link-base="path"` (where relative links start), `editor=vscode\|cursor\|zed\|...`                  |

`scope` is `root` or a group ID. Colors: `auto` (inherit the family of the nearest colored
group), `primary` and `secondary` (the theme's accents), `slate`, `stone`, `blue`, `sky`, `teal`,
`mint`, `green`, `amber`, `orange`, `red`, `rose`, `violet`. `shade=` picks `50` (palest) to `950`
(darkest); a colored node defaults to `500`. Without `layout` lines, `root` uses `flow gap=48`
and groups use `column gap=24`.

Themes: `graphite` (the default), `fieldnotes`, `signal`, `mulberry`, `midnight`. A `theme` line
may also set `padding-x=`, `padding-y=`, `radius=`, `title-font=sans|serif|mono` and
`annotation-font=`. Padding and fonts change node sizes and so the layout; colors never move
anything. Hex colors go in double quotes (`fill="#405D48"`), since `#` starts a comment.

### Layout engines

`layout root engine=layered direction=down` hands a scope to a layout engine. Engines:
`compound-flow`, `boundary-align`, `compound-spring`, `tidy`, `stress`, `force`, `flow`,
`layered`, `tree` (`root=nodeId`), `grid`. An engine on `root` arranges everything, except groups
that have their own `layout` line. Useful settings: `node-gap=4..160`, `rank-gap=12..220`,
`group-gap=12..180`, `ordering=stable|crossings`, `fold=auto|never`,
`aspect=1|1.333|1.6|2|0.75`.

Good defaults:

- Pipelines and request flows: `layout root engine=layered direction=right` or
  `layout root flow direction=right`.
  A loop's return edge runs backwards; a run longer than the canvas folds into rows, like lines
  of text. Add `fold=never` to keep one long line. Adding or changing edge labels keeps every
  object in its row, so a relabel is safe to make without rechecking the layout.
- Hierarchies and org charts: `layout root engine=tree root=top direction=down`.
- Nested architecture (several container levels): `layout root engine=compound-flow`.
  A long chain of groups folds its longest groups, then wraps into rows, so the drawing stays
  within 5:1; `fold=never` keeps one line. A called-only group sits beside its caller.
- A group of peers: `layout groupId row gap=24` or `layout groupId engine=grid`.

### Refinements

Use these only when automatic layout needs a nudge. Positions are relative to the parent's
content area.

| Statement                                           | Meaning                                                    |
| --------------------------------------------------- | ---------------------------------------------------------- |
| `near id ref side=right\|left\|above\|below gap=28` | Place beside a sibling. `strength=required` enforces it.   |
| `order scope id1 id2 ...`                           | Preferred order of a scope's children.                     |
| `align x\|y id1 id2 ...`                            | Align sibling centers. `strength=required` locks them.     |
| `size id width=164 height=56`                       | Requested node size.                                       |
| `nudge id dx= dy=`                                  | Offset from the automatic position.                        |
| `pin id x= y=`                                      | Exact position; layout never moves it. Use sparingly.      |
| `stay id x= y= weight=8`                            | Soft position. The viewer's tools write these; leave them. |

## Guidance

- Prefer structure over coordinates: groups, `layout` recipes, `order` and `align` survive
  later edits; `pin` and `nudge` do not adapt when content grows.
- Keep labels short (two to four words). Put detail in edge labels or comments, not in boxes.
- Use `kind=async` for events, queues and background work, so sync and async paths read apart.
- Use color to mean something, not for decoration:
  - Two to four accent families, each for one role (external systems, data stores, the failure
    path), and `slate` or `stone` for everything else. More reads as noise.
  - Say what each color means with one `legend family "meaning"` line per color; the viewer and
    exports draw them as a key.
  - Avoid red next to green and complementary pairs side by side (red and blue, orange and blue)
    unless they encode opposites.
  - Color the outer group and let members inherit (`color=auto`); nested groups of one family
    are drawn in stepped shades. Never give a member its container's family at a pale shade.
  - `check` reports `many-colors` and `color-matches-container`; fix both before handing back.
- To show a change, write one file with both versions merged and mark only the lines that
  differ: `+` added, `-` removed, `~` changed (`was="old label"`), `.` unchanged context. Never
  write two near-identical diagrams for the reader to compare. Marked files draw in change colors
  only, so don't add colors or legend lines to show the change. With two plain versions on disk,
  `draftably compare old.draft new.draft --write diff.draft` writes the marked file and prints
  the change's size (`3 added, 1 changed, 2 removed.`) on stderr. To mark a node that moved
  container by hand, remove the old one as `-node <id>-was ... in=<old>` and add the new one. Add
  `compare "main" "PR 123"` when the reader needs each version whole; leave it out for one merged
  drawing. `direction=right` (rows align) or `direction=down` (columns align) fixes the
  arrangement; by default it follows `aspect=` (1.6).
- Give a diagram that will be shared as an image a `diagram` title naming what it shows and a
  `subtitle` stating its takeaway, so the exported picture stands alone.
- Collapse many similar things into one node with `count=N` (drawn as a stack with a badge)
  instead of drawing each one.
- When one diagram answers several questions (the write path, the read path, what a PR touches),
  add a `state` line for each instead of drawing several diagrams:
  `state write "Write path" api orders db`. Listed IDs are in focus and the rest fades; a
  connection between two listed nodes is in focus too. `draftably inspect f.draft --svg` takes
  `--state write` to draw one state. States never move anything.
- When a box names real code, a file or a page, link it: `href="src/orders/service.ts"`. Write
  file paths from the repository root (relative links start at the git root of the `.draft`), and
  add `:42` to open at a line. Use the URL as it is for anything on the web, such as a GitHub link.
  If the diagram's paths start somewhere else, set `config link-base="../.."` (relative to the
  `.draft`) instead of rewriting every link. `check` warns about a file link that does not exist
  and suggests the path it probably meant.
- About 5–30 nodes per diagram reads well. Split very large systems into several files.
- When editing an existing file, keep its IDs and any `stay`/`near`/`pin` lines the user's viewer
  edits wrote; add new statements rather than rewriting the file.
- Always run `check` after editing and fix what it reports before handing the file back.
- Not supported yet: views, checkpoints, edge bends, label positions and images. `view`,
  `snapshot` and `box` statements are errors.

The full language guide ships with the CLI package as `DSL.md`, and the package's `examples/`
folder holds sixteen diagrams to copy from.
