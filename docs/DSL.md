# Diagram files (`.meld`)

A `.meld` file is a readable diagram source that a person and an agent can both edit. It holds the
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
pnpm meld check examples/checkout.meld      # errors and diagnostics; exit 1 on errors
pnpm meld format examples/checkout.meld     # print formatted source (--write to save)
pnpm meld inspect examples/checkout.meld    # canonical node and route geometry as JSON
pnpm meld inspect examples/checkout.meld --svg > checkout.svg
pnpm meld open examples/checkout.meld       # serve the viewer for this file (after pnpm build)
```

`open` watches the file. Edits made in another program appear in the viewer at once. If the
source becomes invalid, the viewer keeps the last valid drawing and shows the error line. During
development, `DIAGRAM_FILE=path/to/file.meld pnpm dev` serves the same session from Vite.

The file is the source of truth while it is open: browser storage is not read or written, and
moving the camera never changes the file.

`inspect` uses the editor's own router, so its geometry matches the viewer. Edge label positions
are left out because the browser measures label text with real fonts.
