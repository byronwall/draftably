# Get started

draftably turns short text into a laid-out diagram. Start in your browser: you need no install to
make a diagram and keep it.

## Make a diagram in your browser

You write the boxes and lines. draftably places the boxes and routes every line. The example below
is live: it has two boxes and no line.

```draft
diagram "First diagram" version=1
node idea "Idea" color=blue
node sketch "Sketch" color=teal
```

1. Add this line at the end of the source:

   ```text
   edge e1 idea -> sketch "becomes"
   ```

2. Look at the drawing. It redraws with a line from Idea to Sketch.
3. Select **Edit in playground**. The Playground opens with your diagram. After you edit it there,
   the browser keeps your last draft.
4. Keep a copy: select **Copy link** to get a URL that holds the source, or select **Download**
   and pick PNG, SVG or `.draft`.

Edits on this page are not kept. [Save, share and reopen](#saving) tells you where each copy of
your work is kept.

## Pick your next step

- **Continue in the browser.** Use the [Playground](/play) for short diagrams and shared links. Read
  [Rules](#rules) for every statement.
- **Install the CLI to save files on disk.** Your diagrams become `.draft` files that you can
  commit, check in CI and give to a coding agent. The editor saves each edit to the file. The
  steps are below.

## Install

draftably is one npm package with the CLI and the editor in it. It needs Node 22.21 or later.

```sh
npx draftably --help                 # run it without installing
pnpm add --global draftably          # or install it once
```

Every command below works as `npx draftably …` or, once installed, `draftably …`.

## Write your first file

Save this as `architecture.draft`. Each line is one statement: a `node` is a box, a `group` is a
container, and an `edge` is a line between two of them. Change a label or add a node, and the
drawing redraws.

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
