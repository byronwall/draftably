# Checks

## Automated

```sh
pnpm check:fast   # typecheck, lint, format check, Vitest: about 10 seconds
pnpm check        # check:fast, the engine suites (about 80 seconds) and the build
```

Run `check:fast` while iterating and `check` before pushing. CI runs `pnpm release:check`, which
is `check:fast`, the engine suites and the packaged-CLI proof.

| Suite                                   | What it covers                                                                                                                                                                                                                                                                                                                                           |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tsc` (strict, no unused code)          | All application code, tests and config.                                                                                                                                                                                                                                                                                                                  |
| `tests/model.test.ts` (Vitest)          | Examples load and round-trip through `normalize`; validation and v1 migration; connected shapes, inserted steps, wrap/ungroup, delete with and without contents, collapse, container resize limits, align, build from a list, copy/paste, layout intent; comparison camera fitting.                                                                      |
| `tests/dsl.test.ts` (Vitest)            | `.draft` parsing errors with line numbers, formatting that keeps comments, nested layout, pins across content additions, relative placement, relaxed-preference and group-size diagnostics, projection into a valid editor document, and repeatable canonical geometry.                                                                                  |
| `tests/engine-recipes.test.ts` (Vitest) | `layout … engine=` parsing and errors, engine arrangements that repeat exactly, refinements and nested recipes on top of an engine, group-scoped engines, synchronous checks, projected settings, and the `routing` statement.                                                                                                                           |
| `tests/translate.test.ts` (Vitest)      | Editor edits as source: drag to `near`, pin/unpin, shape and group sizes (ignoring grid snaps), add/rename/connect/style/delete with readable IDs, wrap/ungroup, connection edits, rejection of bends, anchors around a refinement, distant regions after an agent's addition, movement reports, and reflow.                                             |
| `tests/themes.test.ts` (Vitest)         | Font-table wrapping, theme padding in node and group sizes, exact `size` with overflow diagnostics, `theme`/`theme-color` parsing and errors, custom families and shade references, JSON round trips, light-to-dark ramps and contrast targets in every theme, shade edits that move nothing, theme switches that keep custom families, and the CLI SVG. |
| `tests/engine-layout.mjs`               | Layout and routing regressions: 195 assertions and 55 broad cases.                                                                                                                                                                                                                                                                                       |
| `tests/engine-sculpt.mjs`               | Timeline and brush regressions: 55 checks.                                                                                                                                                                                                                                                                                                               |
| `tests/engine-parity.ts`                | 320 comparisons of the engines against the original release in `reference/v7/` across 13 examples and 11 algorithms. Timing fields are excluded.                                                                                                                                                                                                         |

Engine reports are written to the ignored `tmp/verification-current/` folder.

## Performance

`pnpm bench` times CLI commands and viewer interactions on the five diagrams in
`scripts/bench/diagrams/` (6 to 28 boxes, and a sequence) against two budgets: interactive actions
under 200 ms and document load under 1 s. Viewer times run from the input until the drawing is
settled: not compiling, layout idle, saved, and geometry unchanged for 250 ms. It prints a Markdown
table with ✗ on each time over budget and writes the medians to `tmp/bench/latest.json`.

```sh
pnpm bench                                     # 3 runs each, about 15 minutes on main today
pnpm bench --only cli --files xl               # one part, some diagrams
pnpm bench --out tmp/bench/after.json --compare tmp/bench/before.json   # before → after cells
```

CI runs it once per change as a non-blocking `bench` job and puts the table in the job summary.
Performance PRs paste a before → after table.

## File-backed editing

`tests/file-session.test.ts` checks the first title entered after a new shape receives its source
ID. It also checks selection and the active title editor after projection. `tests/edge-labels.test.ts`
checks labels across short gaps, group headers, existing labels, and long text.

`pnpm cli:build && pnpm prove:installed` packs draftably, installs the archive in a fresh temporary
project, and runs its executable outside the repository. It checks help, validation, formatting,
repeatable JSON, SVG, bundled viewer assets, API saves, and conflicts. It then runs the browser proof
below against the installed CLI. Only the proof harness uses the repository's Playwright dependency.
The installed product has no runtime package dependencies or install scripts.

GitHub's Check workflow and the release gate run `pnpm release:check`, including the clean-install
CLI and HTTP proof. The workflow's `proofs` job runs `prove:file` and `prove:layout` in Chromium
and uploads their screenshots when they fail.

Both browser proofs share `scripts/lib/proof.mjs`. It starts `draftably open --port 0`, so a proof
never collides with another worktree's viewer. When a check fails, the summary names it and the
output folder gets `failure.png` (the page at the end of the run) and `failure.json` (failed checks,
the viewer's file state and the last 50 console lines). One failed run is enough to start
diagnosing; don't rerun until it passes.

`pnpm build && pnpm prove:file` drives the real editor in Chromium (`playwright-core` with an
installed Playwright Chromium) against a temporary copy of `examples/checkout.draft` served by
`pnpm draftably open`. It resizes a group, drags a sibling, pins an object, moves the camera, undoes and
redoes, appends a connected node from outside, restarts the server, writes invalid source, and
races an outside write against a viewer save. At each step it compares the browser's geometry
with `pnpm draftably inspect --json`. Screenshots go to `tmp/proof/`. It takes about 10 seconds.
It launches full Chromium rather than the headless shell the other proofs use, so on a new
machine run `pnpm exec playwright-core install chromium` once; without it the proof stops at
once and prints that command.

The file proof also switches between more than six diagrams with Chrome’s back/forward cache enabled, then restores a cached page after an external file change. This catches retained EventSource connections that can exhaust the browser’s HTTP/1 pool; Playwright disables that cache by default.

## The public site

`pnpm site:build && pnpm prove:site` serves `dist-site/` the way GitHub Pages does and drives it in
Chromium with real clicks and keys. It covers the links between surfaces, narrow Playground panes,
docs overlays, export blocking, reopening an exported image, and a failed module load. Direct URLs
miss most of these failures, so a journey clicks what a visitor clicks. Pass a word from a journey's
name to run one: `pnpm prove:site narrow`. Screenshots go to `tmp/proof-site/`.

## Themes in file mode

`pnpm build && pnpm prove:themes` serves a temporary copy of `examples/theme-proof.draft` on a free
port and drives the editor in Chromium. With Fieldnotes it checks serif node and group titles,
real text bounds inside every shape, group titles clear of their content, geometry equal to
`draftably inspect`, and that the browser SVG, CLI SVG and PNG exports render the embedded fonts
on their own. It then saves a shade change (nothing moves), restarts the server, writes an invalid
theme and a padding change from outside, renders all five themes from source, and uses the
**Appearance** menu to change theme and padding with undo and redo. Screenshots and exports go to
`tmp/proof-themes/`.

## Layout tools in file mode

`pnpm build && pnpm prove:layout` drives the editor against a temporary copy of
`examples/order-pipeline.draft`. It applies a Compare candidate (a layout recipe), runs Improve,
keeps a timeline step and paints a brush stroke (positions), appends a node from outside, and
restarts the server. After every step the browser's geometry must equal `draftably inspect` of
the saved file, and the arranged region away from the addition must not move. Screenshots go to
`tmp/proof-layout/`.

## Browser

The SolidJS rewrite was exercised in Chrome (the Claude desktop browser pane) at 1440 × 900 and
820 × 700, in light and dark themes, through real pointer and keyboard input plus
`window.diagramStudio` for state inspection:

- Startup, restore from browser storage, and examples loaded through the File menu with confirmation.
- Shape drag with snapping, dropping into and out of containers, undo and redo.
- **N**, typing, **Tab** to extend, **Enter** to commit; quick-add buttons; Connect tool with preview.
- Drawing and naming a container, moving it with its contents, collapsing it.
- Inspector edits: label, color, shape, position, pin; edge bends by double-click.
- Copy, paste, paste-a-list into Build from a list, object search.
- Layout pass, previewed rebuild with discard, layout lab (**Alt+L**), routing menu, Reroute.
- Compare: six candidates, grid fitting, overlay with layers, Apply and Undo.
- Timeline: record, scrub, Keep & brush; brush hover preview and a committed stroke.
- Editable SVG export and re-import, PNG conversion.

## Not covered

- Native file pickers and drag-and-drop of files (the import code paths are shared with paste and
  were exercised that way).
- Safari, Firefox, touch input and trackpad gestures.
- A full accessibility audit.

The layout engines are heuristics: they can leave crossings or ordering conflicts and do not
promise a globally optimal drawing.

## Diagram quality audit

`node scripts/diagram-audit.mjs docs/intent/diagram-quality/corpus tmp/audit/rN` measures the
audit corpus and writes metrics, PNGs, contact sheets and `summary.md`. The rubric, the corpus
rules and the round loop are in
[intent/diagram-quality/RUBRIC.md](intent/diagram-quality/RUBRIC.md); past rounds are in
`rounds/`.

- A full run with screenshots takes about 90 seconds. While iterating on one cause, pass
  `--only slug,slug` and `--no-shots`, then do a full run before the PR.
- Run full rounds in the background and wait for them to finish; don't poll with sleep loops.
- `--baseline tmp/audit/rN-1` adds before/after `compare-*.png` sheets for PR screenshots.

To measure a fix, use `pnpm audit:compare` instead of hand-built baselines, corpus copies and
diff scripts. It audits the corpus, the held-out diagrams and `examples/` against
`origin/main` and against the working tree, in parallel. Both sides use this checkout's audit
script and inputs, so only the engine differs. It then prints `compare.md`: mean defect index
per set, the issue kinds whose counts changed, and the renders that moved most.

- `--base <ref>`, `--sets corpus,heldout,examples`, `--only slug,slug`, and `--shots` for the
  images and before/after `compare-*.png` sheets (slower). Output goes to `tmp/audit/compare/`
  (`--out` to change it).
- The base ref is checked out once into `tmp/audit-base/<sha>`, and its results are cached
  there, so later runs only audit the working tree.

## Screenshots

`pnpm shoot <target> tmp/out.png` captures a URL, a `.draft` file (drawn through
`draftably inspect --svg`), or an SVG, PNG or HTML file. `pnpm shoot --sheet tmp/sheet.png
Label::a.draft b.draft …` lays several targets out as a labeled contact sheet. `--crop x,y,w,h` zooms
in on one region at 2x, in the target's own pixels. Use it for PR screenshots and visual checks
instead of writing a one-off Playwright script or an image library. Keep the output in the
ignored `tmp/` folder.
