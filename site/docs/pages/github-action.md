# Render Draftably diagrams in Markdown

GitHub, GitLab and npm do not draw `draft` fences. This action draws them for you. For each
` ```draft ` fence in your Markdown files, it:

1. Renders the fence with the published [`draftably`](https://www.npmjs.com/package/draftably)
   CLI (`draftably inspect --svg`).
2. Writes the SVG beside the Markdown file. The SVG keeps its source, so `draftably open` edits it.
3. Adds an image link directly under the fence, after a marker comment.

A rerun updates the SVG and the link in place. It does not add a second link. Files that do not
change are not written.

The action does not commit. Your workflow commits the result.

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

A commit made with the default `GITHUB_TOKEN` does not start another workflow run, so the job does
not loop.

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

The image is named `<markdown file>-<fence number>.svg`, and its alt text is the diagram title.
The fence options of the [Markdown plugin](../../docs/integrations/markdown.md) change this:

- `id="checkout-flow"` names the image `checkout-flow.svg`. Use it so that adding a fence above
  does not rename the images below.
- `alt="..."` sets the alt text.
- `state="..."` draws one emphasis state.

For example, ` ```draft {id="checkout-flow" alt="Cart, payment, then receipt."} `.

Do not edit the marker comment or the image line. The next run replaces them. If you delete a
fence, delete its SVG too.

If a fence does not compile, the action reports the line as an error annotation, renders the other
fences and then fails.
