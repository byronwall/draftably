# CLI

`draftably` checks, formats, draws and edits `.draft` files, and serves the editor. Run any
command with `--help` for its own options, and `draftably --version` for the version.

Any file argument may also be a PNG or SVG that Draftably exported. The command reads the source
embedded in it.

## open

```sh
draftably open                      # a start page for this folder's diagrams
draftably open architecture.draft   # edit one file
draftably open --status             # list running editors
```

Serves the editor and opens the browser. Saves in the editor go back to the file, and changes
made to the file elsewhere show at once. Without a file, it starts on a page that lists the
folder's `.draft` files, makes a new one, or opens an example.

| Option      | Effect                                                                      |
| ----------- | --------------------------------------------------------------------------- |
| `--port N`  | Serve on port N. The default is the first free port from 5180; 0 picks any. |
| `--no-open` | Don't open the browser. Use the URL on the `Viewer:` line.                  |
| `--replace` | Stop an editor already serving this folder and start this version.          |
| `--status`  | List the running editors: URL, folder, version and process ID.              |

Without `--port`, an editor already serving the folder is reused.

## check

```sh
draftably check architecture.draft
draftably check diagrams/ --quiet
```

Reports source errors, layout diagnostics and drawing conflicts, such as a line through a box or
overlapping labels. Exits 1 on errors. Several files or a folder check each `.draft` in turn.

| Option          | Effect                                                                                                                        |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `--hints`       | Add how far each refinement moved its target from where layout put it.                                                        |
| `--quiet`       | Leave out `info` notes.                                                                                                       |
| `--metrics`     | Measure size, aspect, crossings, bends and line length, and warn on crossings, detours, stranded nodes and an extreme aspect. |
| `--fit <shape>` | With `--metrics`, warn when the drawing is far from `wide`, `slide`, `square`, `page` or `tall`.                              |

## format

```sh
draftably format architecture.draft --write
```

Prints the formatted source. Comments and unrelated lines are kept.

| Option         | Effect                                                                |
| -------------- | --------------------------------------------------------------------- |
| `--write`      | Rewrite the file in place.                                            |
| `--drop-stale` | Also remove refinements that no longer hold, and list them on stderr. |

## inspect

```sh
draftably inspect architecture.draft                        # node and route geometry
draftably inspect architecture.draft --svg > architecture.svg
draftably inspect architecture.draft --png architecture.png --scale 2
```

Prints the canonical geometry of every node and route, or draws the diagram. SVG and PNG output
embed the source.

| Option             | Effect                                                                |
| ------------------ | --------------------------------------------------------------------- |
| `--json`           | Print the geometry on one line.                                       |
| `--hints`          | With `--json`, add the raw position of every node a refinement moved. |
| `--metrics`        | Add the measurements `vary` uses.                                     |
| `--svg`            | Print an SVG drawing.                                                 |
| `--png <out.png>`  | Save a PNG. Needs Chrome, Chromium or Edge.                           |
| `--scale N`        | PNG scale, 2 by default.                                              |
| `--max-width <px>` | Lower the scale so the PNG is at most this wide.                      |
| `--state <id>`     | Draw one [emphasis state](#emphasis-states).                          |
| `--states`         | Draw every state as its own aligned panel.                            |
| `--no-source`      | Don't embed the source.                                               |

## compare

```sh
draftably compare before.draft after.draft --svg > diff.svg
```

Prints one file that holds both versions, with `+`, `-` and `~` [change marks](#change-marks) on
the lines that differ. `--write <file>` saves it, `--svg` draws it, and `--png <out.png>` saves an
image.

## vary

```sh
draftably vary architecture.draft
draftably vary architecture.draft --apply best
```

Tries other layouts for the file, measures each one, and ranks them against the file as it is.
It writes a contact sheet and one PNG per variant to `<name>.vary/`, and prints a table of
crossings, bends, size and warnings. `--apply <id>` writes a variant into the file.

| Option            | Effect                                                           |
| ----------------- | ---------------------------------------------------------------- |
| `--apply <id>`    | Write variant `id` (or `best`) from the last run, then check.    |
| `--limit N`       | Keep N variants, 4 by default, up to 12.                         |
| `--try key=a,b`   | Try exactly these values. A second `--try` makes a grid.         |
| `--grid`          | Try the main engines reading right and down.                     |
| `--fit <shape>`   | Aim for `wide`, `slide`, `square`, `page` or `tall`.             |
| `--prefer <goal>` | Break ties toward `fewer-crossings`, `compact` or `stable`.      |
| `--from <id>`     | Search around a variant of the last run.                         |
| `--scope <group>` | Vary that group's layout line instead of the root's.             |
| `--budget <time>` | Stop trying new variants after this long, such as `60s` or `2m`. |
| `--out <folder>`  | Write the images somewhere else.                                 |
| `--json`          | Print `variants.json` instead of the table.                      |

[Layout variants](#layout-variants) explains how variants are chosen and ranked.

## set, rm and mv

```sh
draftably set architecture.draft api label="Public API" color=teal
draftably rm architecture.draft cache
draftably mv architecture.draft db orders_db
```

Edit a file by ID. `set` changes a declaration: `label="…"` replaces its label and `color=`
with no value removes the attribute. Write `node.x`, `group.x` or `edge.x` when a bare ID is
ambiguous. `rm` removes nodes, groups or edges with their edges, refinements and state mentions;
a removed group's members move to its container. `mv` renames an ID everywhere. All three
rewrite the file through the formatter, then check it.

## extract

```sh
draftably extract architecture.png --write architecture.draft
```

Prints the `.draft` source embedded in a PNG or SVG export, or saves it with `--write`. Exits 1
when the image has no source.

## skill

```sh
draftably skill install
draftably skill print
```

Installs the [agent skill](#agent-skill) into `./.claude/skills/draftably`. `--global` uses
`~/.claude/skills`, `--dir <folder>` picks another skills folder, and `--force` replaces an
existing copy. `skill print` prints its `SKILL.md`.
