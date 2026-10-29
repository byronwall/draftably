# Get started

Draftably turns a short text file into a laid-out diagram. You write the boxes, groups and lines;
it places them and routes every line. This page takes you from nothing to a diagram open in the
editor in about two minutes.

## Install

Draftably is one npm package with the CLI and the editor in it. It needs Node 22.21 or later.

```sh
npx draftably --help                 # run it without installing
pnpm add --global draftably          # or install it once
```

Every command below works as `npx draftably …` or, once installed, `draftably …`.

## Write your first file

Save this as `architecture.draft`. Each line is one statement: a `node` is a box, a `group` is a
container, and an `edge` is a line between two of them. The example below is live: change a label
or add a node and the drawing redraws.

```draft
diagram "Architecture" version=1
group backend "Backend" color=teal
node app "Web app" color=blue
node api "API" in=backend
node db "Database" in=backend shape=pill
edge request app -> api "HTTPS"
edge query api -> db "query"
```

There are no coordinates in the file. Layout reads the connections and places `app` before `api`
before `db`. The same file always draws the same picture.

## Open it in the editor

```sh
npx draftably open architecture.draft
```

`open` serves the editor on `http://127.0.0.1:5180/` and opens your browser. Edits in the editor
save back to the file, and edits to the file in any other program show in the editor at once.
Run `open` with no file to get a page that lists every `.draft` file in the folder.

## Check it and export it

```sh
npx draftably check architecture.draft                  # errors, warnings, drawing conflicts
npx draftably inspect architecture.draft --svg > a.svg  # a static SVG with the source inside
npx draftably vary architecture.draft                   # try other layouts and rank them
```

`check` exits 1 when the file has errors, so it fits in CI. Exported SVG and PNG files carry the
source, so `draftably open a.svg` gets the diagram back.

## Next

- [Rules](#rules): every statement and attribute on one page.
- [CLI](#cli): what each command does and its options.
- [Themes](#themes): the five looks, drawn from one file.
- [Agent skill](#agent-skill): let a coding agent write and check diagrams for you.
