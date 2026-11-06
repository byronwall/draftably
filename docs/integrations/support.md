# Integration support

Status on 2026-11-05. Each surface has packed-package and browser proofs in CI. `@draftably/runtime` and `@draftably/markdown` publish to npm with the CLI. No provider plugin is installed.

| Surface                      | Verified behavior                                                                                              | Availability                                                                                    |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Native runtime               | Packed Node, strict TypeScript, and nested-path browser consumers render portable SVG.                         | `@draftably/runtime` on npm.                                                                    |
| Static Markdown              | Packed Unified, MDX, and markdown-it consumers emit accessible SVG images and restore cached assets.           | `@draftably/markdown` on npm.                                                                   |
| Independent viewer           | Packed workers, React Strict Mode, Solid cleanup, keyboard controls, and 390-pixel inspection pass.            | Optional runtime entry. Vue and Svelte have recipes, without wrapper packages.                  |
| Diagram element              | Packed Vite and browser imports provide automatic styles, source updates, fallback, and cleanup.               | Optional `@draftably/runtime/element` entry.                                                    |
| Markdown client              | Visible enhancement and restore controls, static fallback, cancellation, and late-result handling pass.        | Optional adapter entry; browser recompilation discloses source.                                 |
| Host recipes                 | Production and development include-edit builds pass. Chrome 156 checks confirm SVG load, alt text, and reload. | Exact pins are listed below.                                                                    |
| Generated-image bridge       | Existing SVG and PNG exports can accompany source links.                                                       | Useful for readers without a Draftably adapter, including MkDocs and Pandoc workflows.          |
| Installed plugins            | No plugin release is part of this stack.                                                                       | VS Code and Obsidian integrations need separate implementation and release.                     |
| Native provider support      | This work adds no external provider integration.                                                               | Use images and source links for GitHub, GitLab, npm pages, Slack, and generic Markdown readers. |
| Preview and embed prototypes | No implementation is included.                                                                                 | VS Code preview, self-hosted iframe, and Kroki remain proposed experiments.                     |

## Qualified hosts

Proofs use Node 24.21.0 and Chromium. The independent browser review uses Chrome 156.

- Astro 7.4.5, Starlight 0.42.9, and `@astrojs/markdown-remark` 7.3.5.
- Docusaurus 3.10.2 and React 19.2.0.
- VitePress 1.6.4 with generated-image preprocessing.

Docusaurus uses standard webpack and clears the MDX cache before production builds. Its development wrapper covers one page, direct includes, and one locale. Faster caching did not pass the include-edit check.

VitePress prepares image Markdown before its synchronous site pipeline. Astro and VitePress also recover when a missing nested include is created during development. These results apply to the pinned fixtures, not every host configuration.

## Choose a route

- **A site build you control:** follow a pinned recipe and provide its asset emitter.
- **A reader you do not control:** publish an image with a link to the `.draft` source. Use PNG where SVG is blocked.
- **A new adapter:** follow the [contributor guide](contributing.md) and run the shared fixtures.
- **Interactive display:** keep the static image until the viewer commits and restore it during cleanup.

[Checks](../CHECKS.md#portable-runtime) lists the proof commands.
