# GitHub Action

GitHub, GitLab and npm do not draw `draft` fences. The `render-markdown` action draws them in
CI. For each ` ```draft ` fence in your Markdown files, it:

1. Renders the fence with the published [`draftably`](https://www.npmjs.com/package/draftably)
   CLI (`draftably inspect --svg`).
2. Writes the SVG beside the Markdown file. The SVG keeps its source, so `draftably open` edits it.
3. Adds an image link directly under the fence, after a marker comment.

A rerun updates the SVG and the link in place. It does not add a second link. Files that do not
change are not written.

The action does not commit. The workflow below commits changed Markdown and SVG files. Grant
`contents: write` only when you use a commit step.

## Workflow

Save this as `.github/workflows/diagrams.yml`:

```yaml
name: Diagrams

on:
  push:
    branches: [main]
    paths: ['**/*.md']

permissions:
  contents: write

jobs:
  render:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: byronwall/draftably/actions/render-markdown@main
        with:
          files: README.md docs/**/*.md
      - uses: stefanzweifel/git-auto-commit-action@v5
        with:
          commit_message: Render Draftably diagrams
```

A commit made with the default `GITHUB_TOKEN` does not start another workflow run, so this job does
not loop. After a successful run, changed Markdown files contain the marker and image link below,
and each referenced SVG sits beside its Markdown file.

## Inputs

| Input     | Default   | What it does                                                                                                                      |
| --------- | --------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `files`   | `**/*.md` | Glob patterns for the Markdown files, separated by spaces or new lines. `**` matches any folder depth. `node_modules` is skipped. |
| `version` | `latest`  | The `draftably` version from npm.                                                                                                 |

## What a rendered fence looks like

````markdown
```draft
diagram "Request path"
node web "Web app"
node api "API"
edge e1 web -> api "HTTPS"
```

<!-- draftably: readme-1.svg -->

![Request path](readme-1.svg)
````

For `README.md`, the first image is `readme-1.svg`; its alt text is the diagram title, or `Diagram`
when the diagram has no title. The action writes the image beside the Markdown file.
The [fence options](#fence-options) change this:

- `id="checkout-flow"` names the image `checkout-flow.svg`. Use it so that adding a fence above
  does not rename the images below.
- `alt="..."` sets the alt text.
- `state="..."` draws one emphasis state.

For example, ` ```draft {id="checkout-flow" alt="Cart, payment, then receipt."} `.

Do not edit the marker comment or generated image line. The next run replaces them. If you delete a
fence, delete its SVG too. Use `id="checkout-flow"` when you want a stable filename after adding
fences above it.

If a fence does not compile, the action reports the Markdown path and line as an error annotation,
renders other fences, then fails. The commit step will not run after that failure. Fix the source
with `draftably check path/to/file.draft` or copy the fence to a `.draft` file and check it there,
then rerun the workflow. `files` accepts space or newline separated shell glob patterns; paths
under `node_modules` are skipped. Set `version` to pin the CLI release instead of using `latest`.
