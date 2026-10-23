# draftably

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
