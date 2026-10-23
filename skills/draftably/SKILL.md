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
6. **Tidy:** `npx draftably format diagram.draft --write` normalizes the source and keeps
   comments.

## Syntax

One statement per line. Indentation means nothing. Strings use JSON double quotes. IDs match
`[A-Za-z_][A-Za-z0-9_.-]*` and are unique across nodes and groups (edges have their own IDs).
References may point to later lines. Comments start with `#` or `//`.

```text
diagram "Checkout architecture" version=1

group clients "Customer channels" color=blue
node web "Web app" in=clients
node mobile "Mobile app" in=clients

group platform "Commerce platform" color=mint
node api "API gateway" in=platform
group services "Domain services" in=platform
node orders "Orders" in=services
node payments "Payments" in=services shape=pill

node db "Postgres" color=violet

edge checkout web -> api "HTTPS"
edge native mobile -> api "HTTPS"
edge dispatch api -> orders "create order"
edge charge orders -> payments "authorize"
edge persist orders -> db "persist" kind=async

layout root flow gap=48
layout platform column gap=28
layout services row gap=56
```

| Statement                          | Options                                                                                              |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `diagram "title" version=1`        | Optional, at most one.                                                                               |
| `node id "label"`                  | `in=group`, `color=`, `shade=`, `shape=box\|pill\|circle\|diamond\|text`                             |
| `group id "label"`                 | `in=group` (groups nest), `color=`, `shade=`                                                         |
| `theme name`                       | Preset look (see below); optional, at most one                                                       |
| `theme-color family`               | `shade=50..950`, `fill=`, `stroke=`, `ink=`: change a built-in shade or define a new family          |
| `edge id source -> target "label"` | Label optional. `kind=async` draws dashed; `from=`/`to=` `auto\|left\|right\|top\|bottom` pick sides |
| `layout scope flow\|row\|column`   | `gap=8..300`, `direction=auto\|right\|down`, `min-width=`, `min-height=`                             |
| `layout scope engine=name`         | Layout engine for a scope's whole subtree (see below)                                                |
| `routing ...`                      | Router settings for all connections, e.g. `routing edge-gap=24 clearance=12 standoff=20`             |

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
- Hierarchies and org charts: `layout root engine=tree root=top direction=down`.
- Nested architecture (several container levels): `layout root engine=compound-flow`.
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
- Use color to mean something (one color per domain or tier), not for decoration.
- About 5–30 nodes per diagram reads well. Split very large systems into several files.
- When editing an existing file, keep its IDs and any `stay`/`near`/`pin` lines the user's viewer
  edits wrote; add new statements rather than rewriting the file.
- Always run `check` after editing and fix what it reports before handing the file back.
- Not supported yet: views, checkpoints, edge bends, label positions and images. `view`,
  `snapshot` and `box` statements are errors.

The full language guide ships with the CLI package as `DSL.md`, and the package's `examples/`
folder holds sixteen diagrams to copy from.
