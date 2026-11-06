# Render Draftably diagrams in Markdown

This action renders each ` ```draft ` fence in your Markdown files to an SVG and adds an image
link under the fence.

```yaml
- uses: byronwall/draftably/actions/render-markdown@main
  with:
    files: README.md docs/**/*.md
- uses: stefanzweifel/git-auto-commit-action@v5
```

The full workflow, inputs and fence options are at
[draftably.dev/docs/github-action](https://draftably.dev/docs/github-action).
