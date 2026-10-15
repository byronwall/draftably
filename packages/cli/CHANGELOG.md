# draftably

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
