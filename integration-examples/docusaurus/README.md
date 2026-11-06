# Docusaurus consumer

Pinned to Docusaurus 3.10.2. The packed proof runner replaces the proposed
Draftably 0.1.0 dependencies with the built tarballs before installation.
Then run:

```sh
pnpm install
pnpm start
pnpm build
```

Open `/manual/`. The dev script touches the Markdown entry after an included
`.draft` file changes, so Docusaurus recompiles that page. The persistent store
is exposed in development through `staticDirectories`; `postBuild` replays
every stored SVG into the clean output directory. This example uses one
locale. A localized site must compute the URL from that locale's effective
base URL. The default production build clears Docusaurus's MDX cache so edits
to included `.draft` files take effect.
