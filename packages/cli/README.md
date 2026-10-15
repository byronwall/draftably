# Draftably

Draftably is a local diagram DSL and viewer. Write a readable `.draft` file, open it in the browser,
and refine its automatic layout. Viewer edits save to the file; external edits update the viewer.

Requires Node 22.21 or later. The package includes the compiled CLI, viewer, and computation workers.
It does not compile code or download a browser during installation.

## Run

```sh
pnpm dlx draftably --help
pnpm dlx draftably open                    # start page: this folder's diagrams, new, examples
pnpm dlx draftably open architecture.draft
```

Or install once:

```sh
pnpm add --global draftably
draftably open architecture.draft
```

Create `architecture.draft` with:

```text
diagram "Architecture" version=1
node app "Web app"
node api "API"
node db "Database"
edge request app -> api "HTTPS"
edge query api -> db "query"
layout root row gap=48
```

The viewer runs on `http://127.0.0.1:5180/`. On macOS the browser opens automatically.
On other systems, open the printed URL. Use `--port 5190` to choose another port or
`--no-open` to skip the browser launch. Press Ctrl+C to stop.

## Commands

```sh
draftably check architecture.draft
draftably format architecture.draft --write
draftably inspect architecture.draft --json
draftably inspect architecture.draft --svg > architecture.svg
draftably open architecture.draft
draftably open                              # start page for the current folder
```

`open` without a file lists the folder's `.draft` files, creates new ones, and opens examples.
Examples are scratch copies marked by an amber bar; nothing is written until you save one as a
file.

`check` exits with code 1 for source errors or unsatisfied hard constraints.
The bundled [language guide](DSL.md) describes the syntax. Sixteen examples are included in `examples/`.

Drag nodes to save relative placement preferences. Pins retain exact positions. Labels, connections,
groups, sizes, and basic styles also save to source. Formatting preserves comments and unrelated content.
Invalid external source retains the last valid drawing. A stale viewer save cannot overwrite a newer file.

Some advanced tools from the standalone editor are disabled in file mode, including the layout brush,
timeline, comparison Apply, custom edge bends, and edge label positions.

Source: [byronwall/draftably](https://github.com/byronwall/draftably).
The language adapts the Meld prototype. License notices for Meld and the bundled SolidJS viewer
are included in `THIRD_PARTY_NOTICES`.
