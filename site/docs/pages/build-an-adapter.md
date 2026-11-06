# Contributing an integration

Use [the support matrix](support.md) for the current proof and release state. The contracts below describe how an adapter should work; an example does not mean its package entry point is released.

Keep a new adapter thin. It should recognize its host's code node, normalize metadata, call the native runtime, publish output through the host, and map diagnostics. It must not implement a second parser, layout engine, SVG writer, or renderer.

## Start with a host route

For a Markdown or editor host, record its exact version, supported extension hook, file identity, asset publication API, cache behavior, watch behavior, and security model. Mark the adapter experimental until its pinned consumer proof passes. Name the person who will maintain it.

For MkDocs, Pandoc, and other non-JavaScript hosts, start with generated images. A future bridge can send structured requests to one long-lived or batched native renderer process. It must not reimplement geometry in Python, Lua, or another language. Do not spawn a browser for each fence or interpolate source into a shell command.

## Normalize the fence

Only transform parser-recognized fenced blocks whose full language token is `draft`. Do not scan other code blocks for nested Draftably fences. The common metadata form is one brace group with quoted values:

````markdown
```draft {id="checkout" alt="Web sends an order through the API to the database." caption="Checkout path"}
node web "Web"
node api "API"
edge request web -> api "order"
```
````

Recognized keys are `id`, `alt`, `caption`, `mode`, `src`, and `state`. Reject duplicate or unknown keys, malformed quotes/braces, literal newlines in values, and trailing tokens. `src` is a local `.draft` path and cannot appear with a non-empty body. `mode` is `static` unless the host has an implemented interactive bridge. Metadata cannot set a URL, callback, CSS, HTML, link policy, file root, or renderer service. Put theme and layout declarations in `.draft` source.

Hosts with their own attribute parser must produce the same normalized record. Pandoc adapters must reconcile a dedicated identifier with `id`; reject disagreement. This grammar is an adapter contract, not a promise that every Markdown parser accepts the same spelling.

## Keep authority in the host

Resolve `src` from the containing Markdown file, under a configured content root. Disable `src` when no root is configured. Reject absolute paths, URL schemes, drive or UNC paths, NUL bytes, non-files, unsupported extensions, and symlink escapes. Canonicalize both root and candidate, then check containment by path segments. A lexical `..` is acceptable only when the resolved file remains inside the root. Check file size before reading and reject oversized content before compilation.

Track included files as build dependencies, including missing files where the host can watch their nearest existing parent. Hash included bytes. Do not rely on mtime or filename alone. When a file appears, repeat canonical containment checks. Build errors may mention local paths; emitted HTML and cache manifests must not expose workstation paths.

The host owns resource limits, link policy, output publication, public base URLs, CSP, cleanup, and whether browser code runs. Fence metadata cannot grant filesystem, network, navigation, or script authority. Static rendering defaults to no links and no embedded source. `includeSource: true` is an explicit host choice and can expose comments and paths. Interactive browser recompilation sends source to the reader's browser even when the static SVG omits it.

## Prepare and render in order

Rendering and Markdown preparation are asynchronous. For a markdown-it adapter with async preparation, parse once, prepare those exact tokens, then render them synchronously:

```js
const env = { draftably: { documentPath } };
const tokens = md.parse(markdownText, env);
await adapter.prepare(tokens, env);
const html = md.renderer.render(tokens, md.options, env);
```

The markdown-it adapter uses an explicit async `prepare(tokens, env)` operation. Packed consumer and browser proofs cover this entry point. Do not call `md.render(markdownText, env)` after preparation. That reparses new tokens and loses the preparation association. The plugin must fail clearly if a Draftably token reaches rendering without preparation. It must delegate every other fence to the renderer that was installed before it. Store preparation with the token tree/document; never use a process-global “current document.”

The remark adapter follows the same semantic order in its async transform. Both adapters call the same runtime API and share metadata validation, source resolution, policies, cache identity, and diagnostics. They may differ in AST/token mechanics only.

## Preserve diagnostics and source positions

Keep runtime diagnostic codes and severities. Map runtime DSL line positions to the original Markdown file and line. For a top-level fence opened at Markdown line 20, DSL line 3 is Markdown line 23. Lists, blockquotes, tabs, indentation stripping, line endings, and source includes need a real extraction map; do not guess one offset for all contexts. If a column is unknown, omit it. For an external source error, point to the `.draft` file and keep the Markdown include site as a related location.

Production errors should fail the build by default. If a host offers an explicit placeholder mode, emit a text-only unavailable figure without source or stack traces. Do not report a superseded preview job as an author error.

## Publish deterministic output

The default output is a standalone SVG image asset with embedded fonts. Use its content-addressed name and return a public URL from the host's emitter; never return a filesystem path. Generated IDs must remain stable across equivalent builds in different checkouts and unique within a document. Do not encode an absolute path. Each host adapter chooses and documents a stable content or page identity. The shared fixture checks the result without requiring one page-key algorithm.

The host must replay asset publication on a warm page-cache hit. A successful cached page with a missing SVG is a broken build. Test cold builds, warm builds, empty output directories, missing cached assets, changed included sources, concurrent duplicate emissions, and non-root public base paths.

Static HTML must not contain raw DSL, source JSON, copy/download controls, or source paths unless the host made an explicit source-retention choice. A client-enhanced page keeps its static figure until the viewer commits successfully; failed module, worker, or font loading must leave the image useful. Use host-safe serialization for initialization data. Browser recompilation is source disclosure.

## Reuse the fixture corpus

Use `tests/fixtures/integrations/` as the adapter-independent corpus. A host adapter should prove:

1. Valid source renders with deterministic geometry for a fixed runtime/font identity.
2. Valid and invalid metadata normalize or fail as specified.
3. A diagnostic maps back to the original fence and included file.
4. Static output has accessible alternative text and no source metadata by default.
5. Links are absent by default; host policy is the only way to permit safe HTTP(S) links.
6. Cached assets are restored or the page rebuilds when an asset is missing.
7. Non-Draft fences and literal examples pass through unchanged.
8. `draft` preparation is async, and render uses the exact prepared token tree.

Do not copy compiler internals into the adapter test. The shared runtime baseline is `tests/fixtures/integrations/contract.test.ts`; run it with `pnpm exec vitest run tests/fixtures/integrations/contract.test.ts`. Add host parser, source-map, cache-replay, and pass-through checks at the adapter boundary. Record proof commands and results by host version. A code review or generated HTML sample alone is not a build proof.

## Mark support honestly

Record these separately: runtime code in the repository; a built or packed package artifact; an npm-published version; an installed plugin; a generated-image recipe; and native provider recognition. Each is a different release or host event. An adapter may be community-maintained or experimental without becoming a first-party support commitment.

## Bounded prototypes

These are proposed experiments, not current support:

- **VS Code preview:** one minimal extension using stable preview hooks, local resource restrictions, workspace trust, and disposal. Cap implementation at two focused days. If the proof fails, keep only a recipe.
- **Custom element:** wrap the existing viewer and compare host integration work against direct `mountViewer`. Prove two instances, reconnect/disconnect cleanup, SSR fallback, focus, CSP, and duplicate runtime copies. Do not build a second renderer.
- **Self-hosted iframe:** test a dedicated no-analytics page on a separate origin; validate exact origin and source window, channel IDs, message size limits, focus, CSP, and teardown. Source sent to the child remains disclosed to that origin. Keep it deferred unless isolation solves a real host constraint.

An experiment result does not authorize an extension release, npm publication, or upstream request.
