# Draftably

Draftably is a local diagram DSL and viewer. Write a readable `.meld` file, open it in the browser,
and refine its automatic layout. Viewer edits save to the file; external edits update the viewer.

Requires Node 22.21 or later. The package includes the compiled CLI, viewer, and computation workers.
It does not compile code or download a browser during installation.

## Run

```sh
pnpm dlx draftably --help
pnpm dlx draftably open architecture.meld
```

Or install once:

```sh
pnpm add --global draftably
draftably open architecture.meld
```

Create `architecture.meld` with:

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
draftably check architecture.meld
draftably format architecture.meld --write
draftably inspect architecture.meld --json
draftably inspect architecture.meld --svg > architecture.svg
draftably open architecture.meld
```

`check` exits with code 1 for source errors or unsatisfied hard constraints.
The bundled [language guide](DSL.md) describes the syntax. An example is included in `examples/checkout.meld`.

Drag nodes to save relative placement preferences. Pins retain exact positions. Labels, connections,
groups, sizes, and basic styles also save to source. Formatting preserves comments and unrelated content.
Invalid external source retains the last valid drawing. A stale viewer save cannot overwrite a newer file.

Some advanced tools from the standalone editor are disabled in file mode, including the layout brush,
timeline, comparison Apply, custom edge bends, and edge label positions.

Source: [byronwall/draftably](https://github.com/byronwall/draftably).
The language adapts the Meld prototype; its license notice is included in `THIRD_PARTY_NOTICES`.
