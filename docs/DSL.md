# Diagram files (`.draft`)

A `.draft` file is a readable diagram source that a person and an agent can both edit. It holds the
model (objects, groups, connections), the automatic layout recipe, and layout refinements. It
never holds a picture of the final layout: the same file always compiles to the same geometry.

The language is adapted from the Meld 0.1 prototype in `reference/meld/original/DSL.md`. Views,
checkpoints, and the grid and radial recipes are not supported yet.

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

| Statement                          | Meaning                                                                                                                           |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `diagram "title" version=1`        | Optional title. At most one.                                                                                                      |
| `node id "label"`                  | A shape. `in=group`, `color=`, `shape=box\|pill\|circle\|diamond\|text`.                                                          |
| `group id "label"`                 | A container. `in=group`, `color=`.                                                                                                |
| `edge id source -> target "label"` | A connection between two nodes. `kind=async` draws it dashed; `from=`/`to=` choose sides.                                         |
| `layout scope flow\|row\|column`   | How a scope (`root` or a group) arranges its direct children. `gap=`, `direction=auto\|right\|down`, `min-width=`, `min-height=`. |

Colors are `auto`, `violet`, `blue`, `mint`, `amber`, `rose` and `slate`; Meld's `teal` and
`orange` are read as `mint` and `amber`. An `auto` color inherits from the nearest colored group.
Without a `layout` line, `root` uses `flow gap=48` and groups use `column gap=24`.

## Refinements

Refinements adjust the automatic layout for one object. Positions are relative to the parent's
content area, not the whole canvas, so moving a group moves everything inside it.

| Statement                                | Strength | Meaning                                                             |
| ---------------------------------------- | -------- | ------------------------------------------------------------------- |
| `near id ref side=right gap=28 offset=0` | soft     | Place next to a sibling. `strength=required` enforces side and gap. |
| `nudge id dx=0 dy=0`                     | soft     | Offset from the automatic position.                                 |
| `stay id x= y= weight=8`                 | soft     | Prefer this position; resists movement when content changes.        |
| `pin id x= y=`                           | hard     | Exactly this position. Automatic layout never moves it.             |
| `size id width= height=`                 | —        | Requested node size. Long labels can make it taller.                |
| `order scope id...`                      | soft     | Preferred order of a scope's children.                              |
| `align x\|y id...`                       | soft     | Align centers of siblings. `strength=required` locks them.          |

Soft rules give way to keep siblings from overlapping. When one does, `check` reports it with its
line. Pins never move; conflicting pins are reported as errors.

## Command line

```bash
pnpm draftably check examples/checkout.draft      # errors and diagnostics; exit 1 on errors
pnpm draftably format examples/checkout.draft     # print formatted source (--write to save)
pnpm draftably inspect examples/checkout.draft    # canonical node and route geometry as JSON
pnpm draftably inspect examples/checkout.draft --svg > checkout.svg
pnpm draftably open examples/checkout.draft       # serve the viewer for this file (after pnpm build)
pnpm draftably open                              # start page for the current folder's diagrams
```

`open` serves a folder: the current folder, the folder you name, or the current folder around
the file you name. Without a file, the viewer starts on a page that lists every `.draft` file in
the folder (skipping dot folders and `node_modules`), creates a new one, or opens an example. Each
file opens at `?file=path/in/folder.draft`, so links and reloads keep it.

`open` watches the open file. Edits made in another program appear in the viewer at once. If the
source becomes invalid, the viewer keeps the last valid drawing and shows the error line. During
development, `DIAGRAM_ROOT=folder pnpm dev` serves the same folder from Vite;
`DIAGRAM_FILE=path/to/file.draft` serves the current folder and prints the file's address.

## Examples

`examples/` holds 15 diagrams, from flat flows to five levels of containers. They are bundled
into the viewer, so they open without a server at `?example=id`. An example is a scratch copy:
an amber **Example** bar stays across the top, the toolbar reads _Example · not on disk_, and
nothing is written anywhere. Edits behave exactly as in a file. **Save as file…** writes the
current source to a new file in the served folder and opens it; on the static site the bar offers
**Download .draft** instead. Leaving an edited example asks first.

The file is the source of truth while it is open: browser storage is not read or written, and
moving the camera never changes the file.

`inspect` uses the editor's own router, so its geometry matches the viewer. Edge label positions
are left out because the browser measures label text with real fonts.

## Editing in the viewer

Edits made in the viewer are written back to the file as readable statements:

| In the viewer                         | In the file                                                       |
| ------------------------------------- | ----------------------------------------------------------------- |
| Drag an object                        | `near` the closest sibling it does not overlap; `nudge` if none.  |
| Pin or unpin (**P**)                  | `pin` at its position; unpinning leaves a soft `stay`.            |
| Resize a shape or container           | `size`, or `min-width`/`min-height` on the container's `layout`.  |
| Add, rename, connect, delete, recolor | `node`, `group` and `edge` declarations, with IDs from the label. |
| Wrap in a container or ungroup        | A `group` and the members' `in=`.                                 |
| Clear manual markers                  | Removes the object's soft position refinements.                   |

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

Layout passes, the timeline, the brush, Compare, connection bends, label positions, start/end
preferences and images are unavailable while a file is open, because the file cannot store their
results yet.
