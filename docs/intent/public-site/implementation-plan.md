---
title: 'Public site: landing page, playground and docs — plan'
slug: 'public-site'
phase: plan
status: draft
last_updated: '2026-10-28'
---

# Public site: landing page, playground and docs

## Goal

Draftably gets a public static site on GitHub Pages at `https://byronwall.github.io/draftably/`. It has
four parts:

- A **landing page** that shows what Draftably does and how to install it.
- A **playground** where a visitor types `.draft` source and sees the diagram at once.
- **Docs**: getting started, the CLI, the language reference, themes, the agent skill and examples.
- The existing **viewer**, at `/draftably/app/`, as it is today.

A custom domain comes later. The move to a domain must be a one-line change.

## How explorEDA does it

Source: `~/Projects/explorEDA` (`apps/demo`, `.github/workflows/deploy.yml`,
`docs/research/documentation-system-recommendation.md`).

| Topic       | explorEDA                                                                                                                                                                                                                              |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Stack       | React 19, Vite 6, Tailwind. One app (`apps/demo`) holds the landing page, docs and the workspace.                                                                                                                                      |
| Deploy      | `deploy.yml` on push to `main`: pnpm install, build, unit tests, Playwright docs check, then `upload-pages-artifact` and `deploy-pages`. A failed check stops the deploy.                                                              |
| Routing     | Path routes (`/docs/...`, `/examples/<id>`, `/viewer`) with `BrowserRouter`. A Vite plugin copies `index.html` to `404.html`, so Pages loads deep links. `base: "/"`, because exploreda.dev is a custom domain.                        |
| Docs engine | Build-time MDX with `@mdx-js/rollup` (`mdxPlugin.ts`), compiled before the React plugin. No docs framework. The research doc compared Starlight, Docusaurus and Nextra and rejected them: they add a second app and build for no gain. |
| Docs shape  | `docs/catalogue.ts` is a typed list of pages (topic, title, group, icon, lede, summary). `DocsSite.tsx` lazy-loads one MDX module per page. Components: layout with sidebar, on-this-page TOC, code blocks, callouts.                  |
| Search      | `searchIndex.ts` imports each page with `?raw` and builds a client-side index. `mdxPlugin.ts` skips `?raw` imports so they stay text.                                                                                                  |
| Live demos  | `<LiveExample id=...>` lazy-mounts the real workspace when it scrolls into view and is wide enough. Narrow screens get a screenshot. "Open full" links to `/examples/<id>`.                                                            |
| Checks      | `docs:check` (Vitest, runs in `build`) validates the catalogue. `docs:verify` (Playwright) opens every page, runs each live example's steps, checks overflow at narrow widths and writes the narrow-screen screenshots into `dist`.    |
| Lazy load   | The landing page and docs do not load the heavy workspace code until it is needed (`lazy(() => import(...))`), and big libraries go into named chunks.                                                                                 |

## What carries over

explorEDA is React and Draftably is Solid, so we copy the structure and the small build pieces, not
the components. A shared docs package across the two repos is more work than it saves.

| Piece                                       | Action                                                                                                                        |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `deploy.yml`                                | Copy and adapt. Change the build command, the check steps and the upload path.                                                |
| `spaFallback()` Vite plugin (`404.html`)    | Copy as is.                                                                                                                   |
| `mdxPlugin.ts` (`?raw` guard)               | Copy, then set the MDX output for Solid (see the spike in step 4).                                                            |
| `catalogue.ts` page shape                   | Copy the type and the idea. Write a new, short page list.                                                                     |
| `search.ts` / `searchIndex.ts`              | Port to plain TypeScript. The ranking code has no React in it.                                                                |
| Layout, TOC, callout, code block            | Rewrite in Solid with the viewer's CSS tokens. Use the explorEDA pages as the visual reference.                               |
| `LiveExample`                               | Replace with `<Diagram>`: compile `.draft` source and draw it with `renderSvg`. No workspace to mount, so it is much simpler. |
| Playwright `docs:verify`                    | Do the same job with `playwright-core` in a `scripts/prove-site.mjs`, like the other `prove:*` scripts.                       |
| Tailwind, React Router, daily, folder pages | Do not take.                                                                                                                  |

## What Draftably already has

- `pnpm build` writes a static viewer to `dist/` with `base: './'`. It runs from any subfolder, so it
  works at `/draftably/app/` with no change. It asks `./api/workspace`, gets a 404 page on Pages and
  falls back to browser storage.
- `?example=<id>` opens a bundled example from `examples/*.draft` with no server
  (`src/model/examples.ts`).
- `compile()` (`src/dsl/compile.ts`) and `renderSvg()` (`src/cli/svg.ts`) are browser-safe: no
  `node:` imports, fonts are inlined. The playground and the docs can import them directly.
- `docs/DSL.md` (833 lines) is the language reference. The CLI package ships it and
  `skills/draftably/SKILL.md` follows it.
- The repo is public. Pages is not turned on yet.

The viewer has no text editor for source. The playground is new UI.

## Shape of the build

Keep the viewer build as it is. The CLI copies `dist/` into its package (`scripts/build-cli.ts`), so
the site must not change that output.

Add a second Vite entry for the site:

```
site/
  index.html          Site entry (landing, playground, docs)
  main.tsx            Solid router
  landing/            Landing page sections
  play/               Playground
  docs/               catalogue.ts, layout, search, pages/*.mdx
vite.site.config.ts   base from SITE_BASE, MDX, spaFallback, out dir dist-site/
```

`pnpm site:build` runs `pnpm build`, then the site build, then copies `dist/` to `dist-site/app/`.
The Pages artifact is `dist-site/`.

Routes, all under the base:

| Path                     | Page                                                                        |
| ------------------------ | --------------------------------------------------------------------------- |
| `/`                      | Landing page                                                                |
| `/play`                  | Playground. `/play#<encoded source>` opens shared source.                   |
| `/docs`, `/docs/<topic>` | Docs index and pages                                                        |
| `/examples`              | Gallery of every `examples/*.draft`, drawn with `renderSvg`                 |
| `/app/`                  | The viewer, a separate static build. `/app/?example=<id>` opens an example. |

The base is `SITE_BASE`, default `/draftably/`. The router and links read `import.meta.env.BASE_URL`.
When the domain arrives: set `SITE_BASE=/` in the workflow and add `site/public/CNAME`.

## Steps

Each step is one PR in a `gh stack`. Each step deploys something that works.

### 1. Deploy the current viewer

The smallest proof that Pages works.

- Add `.github/workflows/deploy.yml`, copied from explorEDA: push to `main` and manual run;
  `pnpm install --frozen-lockfile`; `pnpm build`; upload `dist/`; deploy.
- Turn on Pages with the source set to GitHub Actions. This is a repo setting, so Byron runs it
  once:

  ```sh
  gh api -X POST repos/byronwall/draftably/pages -f build_type=workflow
  ```

- Set the repo homepage to the Pages URL.

Done when `https://byronwall.github.io/draftably/` opens the viewer and `?example=checkout` works.

### 2. Site shell and landing page

- Add `site/`, `vite.site.config.ts`, `@solidjs/router`, `pnpm site:dev` and `pnpm site:build`.
- Copy `spaFallback()`. Move the viewer to `/app/` in the artifact.
- Landing page. The hero is a **live diagram above the fold**, not a screenshot: one large editor
  frame with editable `.draft` source on the left third and the diagram, compiled and drawn in the
  browser, on the right two thirds (layout from `mockups/landing-b.jpg`). Above it: headline,
  subline, "Try it in the browser", "Read the docs" and the `npx draftably open` chip. Below it: the
  three "why" points and the example cards with one-line descriptions from `mockups/landing-a.jpg`.
  The hero editor shares its code with the playground (step 3), so build that component here.
- Mockups in `mockups/` set layout, type and spacing only. Their `.draft` source is invented; use
  real examples.
- Use the viewer's fonts and CSS tokens. Light and dark.
- Change the deploy workflow to `pnpm site:build` and upload `dist-site/`.
- Use the name "Draftably" on the site. The viewer's user-facing name changes from "Diagram Studio"
  to Draftably in its own PR (decided 2026-10-28).

Done when the landing page, `/app/` and a deep link reload all load on Pages.

### 3. Playground

Layout from `mockups/playground.jpg`. The docs page layout and its "code above, diagram below, Edit
in playground" card come from `mockups/docs.jpg` (step 4).

- Split view: source on the left, the drawn SVG on the right, diagnostics below the source.
- Recompile on input with a short debounce. Keep the last good drawing while the source has errors.
- An example picker from `examples/*.draft` and a theme picker.
- Buttons: Copy source, Download `.draft`, Download SVG, Open in the editor.
- Start with a `<textarea>` with a mono font. Move to CodeMirror 6 only if line numbers or
  highlighting turn out to matter.
- Share: put the source in the URL hash, compressed with `CompressionStream`. The hash never goes to
  a server.
- Open in the editor needs a way to hand source to `/app/`. Add `?source=` (hash) support to
  `src/state/launch.ts` that opens a scratch copy, like an example. This touches `src/`, so it needs a
  changeset.

Done when a visitor can edit an example, see the diagram update, and share a link that reopens it.

### 4. Docs

**Spike first:** prove MDX compiles to Solid. Try `@mdx-js/rollup` with `jsx: true` and let
`vite-plugin-solid` compile the JSX (include `.mdx` in its filter). The other option is
`jsxImportSource: 'solid-js/h'`. Pick the one that renders a component inside an MDX page with
working reactivity. If neither works in an hour, write pages as Solid TSX and keep markdown for
text with a small `marked` call.

Then:

- Port the catalogue, the layout (sidebar, on-this-page TOC, prev/next) and search.
- `<Diagram>` component: a fenced ` ```draft ` block in MDX renders as the source plus the drawing,
  with an "Edit in playground" link.
- Pages:
  - **Get started**: install, `draftably open`, first file.
  - **CLI**: one section per command (`open`, `svg`, `png`, `edit`, `vary`, `links`, `skill`).
  - **Language reference**: built from `docs/DSL.md`. The site imports it `?raw` and splits it into
    one page per `##` section. `DSL.md` stays the one source, so the CLI package, the skill check
    and the site agree.
  - **Themes**: one diagram drawn in each preset.
  - **Agent skill**: what `skills/draftably` does and how to install it.
  - **Examples**: the gallery from step 2, each with source and an open link.

Done when every DSL section has a page, search finds it, and every ` ```draft ` block draws.

### 5. Checks in the deploy

- A Vitest test: every ` ```draft ` block in `docs/DSL.md` and `site/docs/pages` compiles with no
  error diagnostics. Copy the pattern from `tests/skill.test.ts`.
- `scripts/prove-site.mjs` (`pnpm prove:site`): serve `dist-site/`, open every route at desktop and
  phone width, fail on console errors, horizontal overflow or an empty diagram. Use `playwright-core`
  as the other proofs do.
- Run both in `deploy.yml` before the upload, so a broken site never deploys. Add `prove:site` to
  the `proofs` job in `ci.yml` too.
- Add the commands to `docs/CHECKS.md`.

### 6. Custom domain (later)

Set `SITE_BASE=/`, add `site/public/CNAME`, set the domain in the Pages settings.

## Decisions I made

- **One repo, separate site entry.** Not a docs framework. explorEDA's research reached the same
  answer, and here the playground and docs import the compiler directly.
- **Viewer at `/app/`, site at the root.** The landing page is what a link from npm or GitHub should
  show. The viewer keeps its own build because the CLI ships it.
- **`DSL.md` stays the language source.** The site renders it. No second copy to drift.
- **Diagrams in docs render in the browser.** `compile` and `renderSvg` are fast. If the first load
  is slow, render the SVG at build time in a Vite plugin instead.

## Answers from Byron (2026-10-28)

1. Share by URL hash in the playground: yes.
2. Rename the viewer's "Diagram Studio" title to Draftably now: yes.
3. More landing-page sections beyond hero, why, examples and install: no.

## Deep usability audit (2026-10-29)

The completed browser and Pro review is preserved with its original evidence. Read the [reviewed summary](usability-audit-2026-10-29/summary.md), [staged repair plan](usability-audit-2026-10-29/repair-plan.md), [issue register](usability-audit-2026-10-29/issues.md), and [complete original asset index](usability-audit-2026-10-29/assets-index.md). Several historical defects were fixed during collection. The reviewed plan distinguishes those repairs from remaining work. This report does not authorize implementation.
