# Repository review

Baseline: `ed4eff3181ded0c501c35ae18ef6aed9c62de8c5`.
These observations supplement Pro's research. They do not establish a public embedding contract.

## Existing boundaries

| Observation                                                                            | Evidence                                                      | Consequence for the design                                                      |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| The published package exposes a CLI binary. It has no library `exports` or type entry. | `packages/cli/package.json`                                   | Public imports need an explicit package contract.                               |
| Browser code already compiles source and returns SVG plus diagnostics.                 | `site/draw.ts`, `draw`                                        | Extract this path before creating a second rendering pipeline.                  |
| The compiler fixes geometry at 1100 × 720 and uses stored font metrics.                | `src/dsl/compile.ts`, `RENDER_CONTEXT`; `src/model/fonts.ts`  | A host resize should change the camera, unless a new contract says otherwise.   |
| The public site's Markdown parser recognizes `draft` fences.                           | `site/docs/content.ts`, `isDraft`; `site/docs/Example.tsx`    | Markdown rendering exists internally, but the code depends on site components.  |
| SVG fonts use Vite `?inline` asset imports.                                            | `src/lib/font-data.ts`                                        | Library builds must emit usable assets for both browsers and Node.              |
| The editor creates document state at module scope.                                     | `src/state/document.ts`, `state`                              | Importing the editor is not an independent viewer instance API.                 |
| Existing viewer behavior includes camera state, resize observation, and callbacks.     | `site/live/DiagramView.tsx`                                   | Reuse these behaviors where useful; separate them from editing and site CSS.    |
| The live editor rejects stale asynchronous draws with a request counter.               | `site/live/LiveEditor.tsx`, `redraw`                          | Preserve that behavior in the public viewer lifecycle.                          |
| SVG markers use names such as `arrow`, without an instance prefix.                     | `src/cli/svg.ts`, `markersFor`                                | Multiple inline SVGs need a deliberate ID strategy.                             |
| URL detection accepts arbitrary multi-character schemes. SVG links preserve them.      | `src/model/link.ts`, `linkTarget`; `src/cli/svg.ts`, `linked` | Escaping labels does not establish a safe link policy for untrusted input.      |
| CLI SVG export embeds source by default.                                               | `src/cli/main.ts`, `withSource`; `src/model/embed.ts`         | Embedding needs an explicit source-disclosure default.                          |
| PNG export starts an installed Chrome process.                                         | `src/cli/png.ts`, `writePng`                                  | Keep the browser requirement out of a Node SVG rendering promise.               |
| Mermaid, D2, and jsdom are dependencies of the CLI package.                            | `packages/cli/package.json`                                   | Native renderer consumers should not acquire importer dependencies by accident. |

## Checks performed during this research

`src/dsl/compile.ts` documents that `checkSource` omits engine arrangements.
A synchronous Markdown renderer cannot use it as a substitute for asynchronous `compile`.

The following commands ran on this branch. Generated images remain in ignored working storage.

```sh
pnpm draftably inspect examples/checkout.draft --svg > tmp/pro/embedding-ecosystem/checkout-a.svg
pnpm draftably inspect examples/checkout.draft --svg > tmp/pro/embedding-ecosystem/checkout-b.svg
cmp tmp/pro/embedding-ecosystem/checkout-a.svg tmp/pro/embedding-ecosystem/checkout-b.svg
```

Both files contained 73,957 bytes. `cmp` returned 0. This proves repeatability for this example and invocation only.
It does not prove deterministic behavior for every diagram or future library build.

A separate `.draft` fixture declared `href="javascript:alert(1)"` and one directed edge.
The CLI's `--svg --no-source` output contained:

```text
marker id="arrow"
marker-end="url(#arrow)"
href="javascript:alert(1)"
```

The check inspected text only. It did not open the SVG or execute the link.
It establishes emitted markup, not an exploit in every host or image context.

## Validation environment

The first `pnpm check` run used the restricted sandbox.
It failed because tests could not bind loopback ports or run Chrome exports.
The test summary was 73 passed files, 3 failed files, and 565 passed tests.
The run was repeated with approved local server and browser access.
The final run record contains the result.
