# Draftably embedding and distribution

Build a small native runtime, one Markdown integration package, and an optional independent viewer.
Use generated images to reach hosts that cannot run a custom renderer.
Keep the current CLI and editor as separate tools.

This is a reviewed design, not an implemented SDK. Package names and code examples remain proposals.
Start with the [implementation plan](https://github.com/byronwall/draftably/blob/525e8807e1f05a528a973757714bf0584d94594a/docs/intent/embedding-ecosystem/implementation-plan.md).
The [asset index](https://github.com/byronwall/draftably/blob/525e8807e1f05a528a973757714bf0584d94594a/docs/intent/embedding-ecosystem/asset-index.md) preserves every original Pro result.

## What to build

| Surface                     | Proposed contract                                                                         | First useful release                                                                       |
| --------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `@draftably/runtime`        | Asynchronous source-to-SVG rendering in Node and browsers. Typed results and diagnostics. | A packed package produces portable SVG without Chrome, the editor, or import dependencies. |
| `@draftably/markdown`       | Shared `draft` fence handling, then thin remark and markdown-it adapters.                 | Build-time SVG images work in unified/MDX without reader JavaScript.                       |
| `@draftably/runtime/viewer` | Independent `mountViewer`, `update`, events, camera controls, and `destroy`.              | Vanilla JS, React, and Solid recipes use the same viewer.                                  |
| Fixed Markdown hosts        | Generated SVG/PNG, source links, and a regeneration check.                                | Repository readers see diagrams before native host support exists.                         |

The package scope is unverified. Naming is a release decision, not a reason to block implementation.
Use recipes before maintaining a wrapper package for every framework.
Keep the compiler and editor document types private.

## Findings that decide the design

The extraction seam already exists: `site/draw.ts` compiles, projects, and renders native source.
The published package exposes only a CLI and declares Mermaid, D2, and jsdom dependencies.
Separate packages isolate installation cost as well as browser imports.
The [repository review](repository-review.md) records these checked source facts.

Rendering must remain asynchronous. `checkSource()` omits layout engines, so it cannot replace final compilation in a synchronous Markdown callback.
The markdown-it adapter must prepare results before rendering the same tokens.
Its official guide documents the separation of asynchronous work from synchronous rendering. [markdown-it development guide](https://github.com/markdown-it/markdown-it/blob/master/docs/development.md#i-need-async-rule-how-to-do-it)

Native host support requires the host to adopt Draftably.
GitHub documents its supported diagram formats; a repository plugin does not add another language for readers.
Images provide immediate reach while controlled websites use native adapters. [GitHub diagram documentation](https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/creating-diagrams)

Pro's current Astro recipe needs an explicit Unified processor.
The official guide confirms that Astro v7 defaults to Sätteri.
Host recipes must name tested versions and prove asset publication, rebuilds, and public paths. [Astro Markdown guide](https://docs.astro.build/en/guides/markdown-content/)

## Review decisions and corrections

All four original reports were read. The [29 recommendation decisions](https://github.com/byronwall/draftably/blob/525e8807e1f05a528a973757714bf0584d94594a/docs/intent/embedding-ecosystem/recommendations.md) retain the proposed direction with these qualifications:

- Follow repository interaction intent. Pro's modified-wheel proposal conflicts with `docs/intent/diagram-quality/FEEL.md`. The plan requires unmodified wheel zoom and background drag to pan inside the viewer.
- Keep the SVG refactor bounded. Share the existing drawing vocabulary between output writers; do not build a general scene framework.
- Treat the proposed 8 MiB output ceiling and five-second worker deadline as policies to verify. They are not measured limits.
- Keep the VitePress bridge experimental until one selected version passes a focused proof. Generated images remain useful if it fails.
- Inspect release automation in the checkout. The actual Check workflow is `.github/workflows/ci.yml`. Release checks and changeset helpers currently target the CLI and need package-aware changes.
- Use the actual native shape symbol, `DSL_SHAPES`. The report's `syntax.ts::SHAPES` reference is a minor naming error.
- Apply normal checkout rules when execution begins. Pro's preflight wording does not authorize creating another worktree or requiring the old baseline indefinitely.

Current source confirms repeated marker IDs, broad link schemes, Vite-specific font imports, global editor state, and author-keyed ordinary dictionaries.
Those are concrete boundaries to address before publishing the SDK.
The reports do not demonstrate an exploit, benchmark the new runtime, or prove new integration examples.

## Validation and open decisions

`pnpm check` passed with local server and Chrome access: 575 unit tests, engine regression suites, 320 parity comparisons, and the build.
Two CLI exports of the checkout example matched byte for byte.
A text-only probe confirmed that current SVG output preserves a `javascript:` link.
These checks concern the current code, not the proposed SDK.

Before publication, resolve package names, test the supported browser range, and measure package, font, and worker costs.
The detailed APIs and host excerpts need implementation proofs before they become public documentation.
No further product decision prevents starting milestone one.

[Pro conversation](https://chatgpt.com/c/6aeaa852-3e08-83ea-997e-ca7c5ac0206d) ·
[Prompt](prompt.md) · [Run record](run.md) ·
[Original source register](https://github.com/byronwall/draftably/blob/525e8807e1f05a528a973757714bf0584d94594a/docs/intent/embedding-ecosystem/assets/pro-results/2026-11-03/embedding-sources.md)
