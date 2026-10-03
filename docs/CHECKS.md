# Current verification

Date: October 3, 2026. Environment: macOS, Node 22.21.1, pnpm 11.9.0.

## Automated checks

| Check | Result |
| --- | --- |
| TypeScript and JavaScript module bindings | Passed. |
| Production static build | Passed; includes three separate worker assets. |
| Comparison fit regression | Passed for enlarged candidates, hidden cards, and grid restore. |
| Layout and routing regression | 195 assertions and 55 broad cases passed. |
| Timeline and brush engine regression | 54 assertions passed. |
| Original-versus-migrated engine comparison | 320 comparisons passed across 13 fixtures and 11 algorithms. |
| Archived release integrity | All 63 original file checksums passed. |

Run the maintained checks with:

```sh
pnpm typecheck
pnpm test:app
pnpm test:engines
pnpm build
```

The parity check covers layout geometry, routing, timeline recordings, and
brush calculations. It excludes execution time and recording creation time.
Reports are written to `tmp/verification-current/`.

## Browser checks

Independent browser passes used fixed production builds on separate local
origins. The reviewers used visible controls and rendered geometry. They did not
read application source or call its internal API.

The completed comparison and local layout pass covers:

- Six layout candidates in Grid and Overlay, including anchor, visibility, and opacity controls.
- The three comparison camera modes and normal grid fitting.
- Six routing candidates from two parameter lists, followed by Apply and Undo.
- Timeline computation, keyboard scrubbing, hover preview, ghost choices, bookmarks, restore, keep, cancel, and reopen.
- All five brush modes, radius changes, local holds, stroke undo, and temporary overlap repair.
- Visible comparison cards and timeline controls at 1440 × 900 and 1024 × 768.

Candidate enlargement exposed a fitting defect. Hidden cards affected its zoom
calculation. The repair uses the visible candidate's viewport and bounds.

The comparison repair passed a focused retest from `/studio/`. At both tested sizes,
Enlarge showed the full diagram. Fit all, Home, and Back to grid worked in all
three camera modes. Routing comparisons and timeline computation also completed
from this subdirectory. The radius status and slider both updated from 190 to
200. The final browser error and warning list was empty.

The editing and file pass covers:

- Add a shape, add a connected sibling, delete, undo, and redo.
- Objects search, inspector fields, parent membership, container collapse, and container size changes.
- Shape choices, pins, start/end preferences, connection styles, and automatic ports.
- File and example menus, keyboard help, zoom controls, and canvas pan.
- A new shape and dark theme surviving a normal page reload.
- JSON, editable SVG, and PNG downloads through the Export menu.

The download event observer timed out, but the files reached the Downloads
folder. Direct inspection confirmed eight shapes and eight connections in JSON.
SVG metadata contained the same document. The PNG measured 2368 × 768 pixels
and passed a visual check. Browser export messages alone were not treated as
proof of a downloaded file.

Pasting the saved JSON through the browser clipboard reopened the diagram.
The app showed eight shapes, eight connections, and the saved test shape.
It reported `Opened diagram`, with no console errors or warnings.

The native file chooser test did not finish. Its browser tool call stalled and
was stopped. File-picker import remains unverified; clipboard import passed.

The title checks exposed a separate focus and commit defect. The repair commits
on Enter or focus loss. Clicking the canvas also commits before handling the
selected shape.

The final repair passed at `/app/`. Enter and canvas-click commits persisted
through later edits and reload. A canvas click moved focus out of the title and
enabled Undo immediately. One Undo restored the old title; one Redo restored
the new title. Shape selection, keyboard creation, and dragging still worked.
The final browser error and warning list was empty.

## Scope

These are current migration results. The reports in `reference/v7/verification/`
belong to the original ChatGPT release and are retained as historical evidence.

Engine parity does not prove browser interactions or all graph layouts. The
algorithms can retain crossings and ordering conflicts. They do not guarantee a
globally optimal drawing.

The browser checks cover Chrome and the built-in browser on macOS. Safari,
Firefox, mobile touch, and physical trackpad gestures remain untested. These
checks are not a complete accessibility audit. Small comparison cards can shorten metric lines with
ellipses. Overlaid diagrams also have repeated shape controls; one automated
first-match selection was ambiguous. Selecting the visible shape control worked.
