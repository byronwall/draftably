# draftably

## 0.5.0

### Minor Changes

- 2172d0b: compare takes direction=right|down to set panels side by side or stacked, and otherwise picks the arrangement nearest aspect= (1.6).
- c9266f2: draftably compare old.draft new.draft prints one file holding both versions, with + - ~ change marks; --write saves it and --svg draws it.
- b20773e: A compare "before" "after" line draws a marked file as two aligned panels in exports, with every unchanged object at the same place in both.
- 1f74e5b: inspect and compare take --png <file> [--scale N] to save a PNG, rendered by an installed Chrome or Chromium.
- 25599b3: Exports draw the diagram title, and a new subtitle line, above the drawing so a copied image stands alone.
- 370f54b: Nodes take count=N to draw as a stack with a ×N badge, and nodes and groups take href= to link from exported SVGs.
- 6dcb3dc: Mark node, group and edge lines with +, -, ~ or . to draw a change: added, removed, changed or context, with matching legend rows.
- 9176af7: New `legend family "meaning"` statement (optional `shade=`): one row of a color key per line, in file order. The viewer shows the key in the canvas corner in the diagram's own colors, and `inspect --svg` and the editor's SVG and PNG exports draw it under the drawing. A legend never moves anything. The agent skill and the language guide ask for one legend line per color used.

### Patch Changes

- 73d9931: Comparison panels now reuse the merged drawing's line routes, so every line both versions keep runs in the same place in each panel. The change key is one row with counts (`3 added · 1 changed · 2 removed`), and `draftably compare` prints the same counts on stderr.

  `draftably compare` now splits an edge that joins different objects into a removed and an added line, so the older panel draws the line it had, and it names nodes or groups that moved to another container.

- 8d708e6: In a downward engine layout, boxes in one rank now share their top, so wrapped titles or a taller theme no longer leave a row with ragged tops.
- e480e9b: Side-by-side panels shrink to fit their own version: containers that lost members get smaller, and nothing moves out of alignment.
- da925dd: Layered layouts keep the declared order within each rank unless reordering clearly removes crossings, so adding a node no longer reshuffles the rest.
- 2be823d: Viewer stays that no longer fit a grown diagram (two anchored boxes now landing on each other) are ignored with a stale-stay note, instead of sliding one under the other.
- 2f9cd29: A gap inside a group widens where a line leaving or entering the group would otherwise turn through the label of an edge crossing that gap. It gets a standoff each side, 20px per extra line through it and, between rows, each label's height, so the line passes clear of the label.
- 969908b: A collapsed container keeps its title where the open frame had it, with the shape count under the title. In a diagram file, collapsing or expanding is a view change: it no longer runs as an unsaved edit (and no longer shows "That change is not saved to diagram files"), draws at once with quick routes and swaps in full routes from the worker. The frame grows or shrinks over 200ms and revealed shapes fade in, unless the system asks for reduced motion.
- 801e458: After an edit in a diagram file, the viewer compiles and routes the new version in a long-lived engine worker instead of on the page, and keeps quick routes on screen until it arrives. A drag no longer freezes the page for the layout and routing of the whole file.
- 2e69ef1: The router repairs crossings between pairs of lines after routing: it reroutes one line with the
  other as a wall, or routes them in the other order, and keeps the pair when the drawing costs less
  and no line comes to enter from below, by a far side or with a U-turn.
- 21ff8fb: Lines meet a diamond at its four vertices, one line per vertex, leaving a full standoff out
  before they turn; a further line takes a free side vertex instead of a slanted face. A fan out of
  one side with more lines than full-gap ports spreads on that side at a 12px pitch, where that
  makes room, before it opens a second side, nested so the lines don't cross. Lines fanning out of
  or into one side may run 10–16px apart in the gap beside it, so a tree's third child no longer
  pulls its line out of the parent's side.
- 8056067: Nested groups of one color family are drawn in stepped shades (100, 200, 300; 900, 800, 700 in Midnight) instead of one repeated fill, and a node whose shade is within two steps of its own-family container moves three steps past it. `check` notes more than four accent families (`many-colors`) and members that repeat their container's family (`color-matches-container`). The language guide and the agent skill give concrete color rules: two to four accent families with a role each, no red-next-to-green, color the outer group and let members inherit.
- 00c1762: Connections draw over a canvas-colored halo, so where a line crosses a container border (or an earlier line) the border breaks and the connection reads as the stronger mark. Container borders are thinner and partly transparent (1px at 65%); a selected or hovered container still shows a full border.
- f15a642: Edge labels are placed together once every route exists, instead of one by one as routes are
  drawn. A label keeps clear of lines drawn after it, of other edges within 8px, and of other labels
  within its own height; labels that have a clean spot are placed first, then one repair sweep
  moves each to its best spot given the rest. On an upright segment a label can shift off-centre
  to clear a parallel line while its own line still crosses it.
- 62f6397: A folded flow keeps a side branch with its source. A box that would start the next band only
  because its source ends the band before (such as an "on failure" upload after the last proof)
  now sits at the end of its source's band, lined up with it, when that shortens its lines and the
  band still fits. Cuts are also scored by how far the edges they create run back along the gap,
  not only by how many there are.
- b7dc866: When a served folder has diagrams in sub-folders, the start page and the diagrams panel offer a **Folders** order that groups diagrams under their folder, nested folders indented beneath their parent.
- bbfe27d: Shapes, containers and lines show on hover that they can be dragged or picked: a shape lifts with its ring, a container's border and a line take the accent colour.
- df57bb2: Editing a title in place now happens on the object itself: the editor takes the shape's face (or a container's title band, or a connection's label) with its fill, text color, font and line height, grows with the text instead of scrolling, and hides the drawn title underneath. Below about 12px text it draws larger around the same center so it stays legible.
- cd65cea: Connection labels keep about 10px clear of boxes when their line offers such a spot, so a label no longer sits pressed against a shape it doesn't belong to.
- c33439d: A connection between a box inside a container and something outside it now leaves (or enters) the container by the short way and runs outside, instead of travelling along the container's inside: the router charges a line's run inside a container that holds only one of its ends, beyond the shortest way out.
- 29704d4: A packed drawing (`compound-flow` or `layered` with groups) no longer flattens into a strip. When it is wider than the canvas and more than five times longer than it is deep, its longest group folds into rows, one group at a time, so the groups keep their order; only when no group can fold do the groups wrap into rows like text. A group that only receives lines, such as an upstream API, now sits beside the group that calls it instead of in a rank of its own past it. `fold=never` on the root engine keeps one line.
- b6c4a15: Connections follow the reading convention more often: arriving on a box's bottom costs extra (right side and leaving by top or left slightly), and a route that enters or leaves by a side facing away from the other end also pays for the loop it draws. Lines that went round a group to come into a box from below now come in from the top or left.
- 03333c7: A return or skip lane no longer turns through another edge's label. When the label in the gap
  beside its target reaches across the turn (down a column), the lane arrives square on the target's face toward
  the lane instead of running through the label's text.
- 4ab72dd: A flow orders each rank by where its connections point: siblings, groups included, sit in the
  order of their neighbours in the rank before, as `layered` orders nodes, instead of in declaration
  order. A group fed by another group sits on that group's side.
- bf4994e: Pressing or clicking a shape no longer redraws every connection: quick routing starts only once a drag actually moves, so lines stay put while you select.
- d8495cc: Opening a diagram from the start page or the diagrams panel, going back to the start page, and the browser's back and forward buttons switch files in the page instead of reloading it, so the screen no longer flashes blank. A pending save finishes first. Files changed in the last week show the day and time instead of only the date, so a Recent list of same-day files reads in order.
- bcaeab1: A line may now cross a group's title band straight across, into any member, when going round the
  group would make it more than 1.75 times as long. It still never runs along the band or through the
  title. A line that leaves or enters by a side facing away from its other end is routed again once
  the edges after it have settled, so it takes a facing side that has since come free (state/ →
  model/ in a stress layout no longer climbs over its neighbours).
- d137202: The mouse wheel zooms the canvas around the pointer without a modifier, in steps of about 18% a notch; Shift + wheel pans and a pinch still zooms. Holding Cmd while moving the mouse no longer zooms. Fit leaves the drawing about 92% of the stage and never zooms past 100%.

## 0.4.0

### Minor Changes

- 22883f0: Edges keep a 20px standoff from box sides and stay off group borders, and stacked neighbours in a tight gap connect through their facing sides instead of hooking round. New `routing standoff=` setting (0 turns the band off).
- 1966827: `flow` keeps a loop along its direction: only the edge that closes the loop runs backwards,
  instead of the whole loop collapsing into one column or row. A long run of ranks in `flow` or
  `engine=layered` now folds into rows (or columns) that each read from the start once it is wider
  than the canvas and more than three times longer than it is deep. `fold=never` keeps one line.

### Patch Changes

- fc4cbe6: Routes look drafted on purpose: ports on a shared side sit symmetrically about its centre, and fans out of one side turn on one line where that keeps lines apart.
- d0755d3: Edge labels stay on their own edge: flow, column and engine layouts widen a gap to fit the labels that cross it, and a label no longer lands on another edge, a group border or far from its line.
- f521a91: Folded flows read like wrapped text: a fold keeps each decision with its branches and each loop whole when a cut of similar balance allows, and the edges from one band into the next return along evenly spaced lanes in the gap between them instead of looping separately.
- 0ad8d64: Ports on a side now centre about its middle even when a straight line has to slide with them: the
  tidy pass accepts the small standoff cost of the shift, turns the other lines a full standoff out
  from the side instead of hugging it, and never trades the move for a new hug.
- 803f062: Groups now fit their contents with the same padding on every side, instead of a 260px minimum width that left wide gaps on the right. A group still grows to fit its title, and `min-width`/`min-height` still win.
- 594ccde: Frame the whole drawing in `inspect --svg`, workspace thumbnails, SVG and PNG exports, and fit to
  content. Connections that loop outside the shapes, their arrowheads, and their labels no longer get
  cut off at the edge.
- 9d79011: Groups arranged by `compound-flow` or `layered` are packed tight. Members of a group rank by the connections between them, so a chain inside a group reads as one straight row or column instead of stepping diagonally across the drawing's rank columns. Each rank still keeps the engine's order. Sibling groups keep one gap across the drawing, wide enough for the lines that pass between them.
- edf45e6: Adding a side exit or note beside a step no longer refolds a long flow. A node with no way out that shares its rank with another is left out when the fold decides how many bands to cut, so the bands, cuts and order of everything already there hold.
- 00eea33: Labelling or relabelling an edge no longer refolds a long flow. The fold's rows and cuts are planned without edge labels, so every object keeps its row; labels only widen the gaps they need, and a row is added only when the labelled rows run more than a quarter past the canvas.
- 759f230: Labelling an edge that turns between two rows no longer widens its gap when the label fits on the edge's run between the rows, clear of every box. Only the gaps whose labels have nowhere else to go widen.
- 6cc8a26: Returns and skips in a flow take planned lanes outside their row (or column): out of the side
  facing the lane, along it, and into the target's side that faces back toward the source, one port
  gap off centre. The router also prefers a line into a perpendicular side over a U-turn into the
  same side it left from.
- 334a496: Groups grow a routing channel where lines have to travel inside them (a member boxed in by its
  neighbours, or a link between children that can't go straight across), so lines run a full
  standoff from members and borders instead of squeezing through the inset. Lines no longer
  cross a group's title band except straight into or out of a top member, and the router's
  search now keeps its standoff from boxes and borders.
- 28ff13b: Fans stay on the side that faces their other ends: a node's second and third connections to one side spread along it instead of looping round to a far side, and an edge arrives on a target's far side only when the facing sides are blocked.
- db2e7fa: Lines keep the full `standoff` from group borders instead of half of it, and only a group's title blocks its header band. A line between stacked groups now drops straight in beside the title instead of riding the border 10–15px away.
- 7678890: Routes no longer carry tiny steps. A step under 12px between two parallel runs straightens by sliding one run onto the other's line, moving its port when the side has room, and a fold's wrap edge now runs straight out to its lane instead of stepping 7px past its stub.
- d62e85a: A line that leaves a box and turns to run alongside it turns a full `standoff` out instead of at the 13px stub, so it no longer hugs its own box.
- 63635a8: In a layout with a declared `direction`, forward edges leave and enter along it: a downward tree's edges run from a parent's bottom into each child's top, turning on the rank gap's midline, instead of arriving on a child's side.
- 3c06939: Switching the theme no longer moves the drawing. Nodes are laid out on slots measured in the default theme and drawn at the theme's size in their slot, so rows, order and positions hold; a slot grows only where the theme's node is larger than the gap around it can absorb.
- 0306b95: Node titles no longer break in the middle of a word. A long identifier breaks where its parts meet (`annotation` / `Commands`, `src/` / `viz/`, `code-` / `annotations.md`), and a node without a `size` grows wider, up to twice its default width, so a word with no such break (`installed?` in a diamond) stays whole.

## 0.3.1

### Patch Changes

- 2e4409a: Close live file-update streams when leaving a diagram and reconnect when a cached page is restored. This prevents rapid diagram switching from exhausting browser HTTP connections and stalling navigation.

## Unreleased

### Patch Changes

- Close live file-update streams when leaving a diagram and reconnect on cached-page restoration, preventing rapid switching from exhausting browser HTTP connections.

## 0.3.0

### Minor Changes

- d4019cb: draftably open puts your diagrams first: the start page shows every diagram in the folder as a live thumbnail (examples move to a closed section once you have files), and the editor has a Diagrams panel (F, ⌘P to search) for moving between files. Both lists pick up files the CLI or an agent writes without a reload.

## 0.2.0

### Minor Changes

- 57c021f: Add an agent skill for writing `.draft` diagrams. `draftably skill install` copies it into
  `./.claude/skills/draftably` (`--global` for `~/.claude/skills`, `--dir` for another skills folder,
  `--force` to replace a copy), and `draftably skill print` prints it. The repository's `skills/`
  folder also lets `npx skills add byronwall/draftably` install it.
- 22a53ba: Diagrams have themes. A `theme` line picks Graphite (the default), Fieldnotes, Signal, Mulberry or
  Midnight and can override padding, corner radius, title and annotation fonts, and the canvas, text
  and connection colors. Colors come in families with numeric shades from 50 to 950 (`color=blue
shade=800`); `theme-color` lines adjust built-in shades or define new families such as `brand`.
  Titles wrap with bundled font metrics, so the viewer, `inspect` and both SVG exports agree, and
  exported SVG files embed the fonts they use. Explicit `size` lines are now kept exactly; a title
  that no longer fits is reported instead of growing the node. `teal` and `orange` are now their own
  colors rather than aliases of `mint` and `amber`.
- Diagram files use the `.draft` extension, and the bundled example is `examples/checkout.draft`.
  The file contents are unchanged, so rename existing `.meld` files to keep using them.
- 0b071ae: A `.draft` file can arrange a scope with one of the editor's layout engines
  (`layout root engine=layered rank-gap=96`) and set the router with a `routing` line. Engines run
  from scratch on every compile, so the same file always draws the same diagram.
- The viewer's layout tools work while a `.draft` file is open, and their results are saved to the
  file. Rebuild and Compare write the scope's `layout … engine=` line, and the routing menu writes
  the `routing` line. Improve, timeline steps and brush strokes save the new positions as `stay`
  lines.

### Patch Changes

- 56bded1: `draftably open` now uses the first free port from 5180 instead of failing or sharing a port with
  another `localhost` server. An explicit `--port` that is already in use, on IPv4 or IPv6, is an
  error, and `--port 0` picks any free port. The `Viewer:` line always shows the actual URL.
- c6545c1: Keep the first title entered for a new connected shape. Make New diagram open the creation screen in file mode and name the save and export menu for assistive tools.
- 11d137d: Place connection labels clear of nearby shapes when the line is too short. Dock layout and property panels so Fit uses the visible canvas and layout previews keep their camera controls available.
- 73edb51: Separate Tidy positions from Automatic layout, add diagram type choices, and put engine tuning under Advanced layout settings. On phones, keep Add, Connect, Properties, Fit, and More visible. Show properties below the canvas and keep one panel open in smaller windows.

## 0.1.0

### Minor Changes

- Publish the Draftably CLI with a bundled viewer and two-way diagram file editing.
