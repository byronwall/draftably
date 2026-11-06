# VitePress generated-image consumer

Pinned to stable VitePress 1.6.4. This is a preprocessing recipe. It uses the
packed remark adapter to replace `draft` fences with ordinary image Markdown
before VitePress starts rendering pages.
The two Draftably dependencies are pinned to proposed version 0.1.0; the packed
proof runner replaces them with the built tarballs before installation.

Install the local packed runtime and Markdown packages, then run:

```sh
pnpm install
pnpm dev
pnpm build
```

Open `/manual/`. The dev runner watches Markdown and `.draft` files, regenerates
`generated-docs/index.md` and writes SVGs under `generated-docs/public/_draftably/`.
VitePress applies its configured base path to public assets. The generated
directory and public assets are build outputs; do not edit them by hand.
