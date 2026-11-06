# Astro and Starlight consumer

Pinned to Astro 7.4.5, Starlight 0.42.9, and the Unified processor package 7.3.5.
The recipe selects Unified because Astro 7 defaults to Sätteri.
The two Draftably dependencies are pinned to proposed version 0.1.0; the packed
proof runner replaces them with the built tarballs before installation.

Install the local packed runtime and Markdown packages into this consumer, then run:

```sh
pnpm install
pnpm dev
pnpm build
```

Open `/manual/`. Edit `src/content/docs/request.draft`; the watched dependency restarts
Astro so the Markdown transform reads the changed source. The SVG is served from a
persistent content-addressed store in development and copied to `dist/_draftably/`.
The `src/content.config.ts` file registers Starlight's docs collection.
