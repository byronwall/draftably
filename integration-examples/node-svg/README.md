# Node SVG

Install dependencies with `pnpm install`, then run `pnpm render`. The result is `checkout.svg`, with its used fonts embedded.

For a GitHub or package README, commit the generated image beside the source:

```md
![The web app calls the API, which stores an order.](checkout.svg)

[Diagram source](checkout.draft)
```

Run the renderer when source changes and commit both files. This works on hosts that display SVG images without native `draft` fence support.
