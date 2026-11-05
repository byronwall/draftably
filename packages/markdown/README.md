# `@draftably/markdown`

This package converts canonical `draft` code fences to static SVG image nodes.
It supports async remark and markdown-it adapters. Static pages do not load or
compile diagrams in the reader.

The host must provide `emitAsset`. It receives final SVG bytes and returns the
public URL. Use a durable content-addressed store with your page cache. Re-emit
the asset on a warm Markdown transform, and retain asset references with cached
pages. The host owns base paths, publication, cleanup, and watcher integration.

For Node builds, `@draftably/markdown/files` provides a filesystem store for
content-addressed SVG and interactive JSON assets:

```js
import { createFileAssets } from '@draftably/markdown/files';

const assets = createFileAssets({ directory: '.cache/diagrams', publicPath: '/docs/diagrams/' });
const options = { emitAsset: assets.emitAsset };
// Add `assets.emitInit` to the optional interactive bridge.
await assets.copyTo('dist/diagrams');
```

The store checks each filename against the asset bytes and recreates deleted
files on warm transforms. The host still chooses paths and retains cached page
references.

Use `src="./diagram.draft"` only with `sources.rootDir` and a Markdown file path.
The resolver rejects remote and absolute paths, non-`.draft` files, and symlink
escapes. It reports missing paths as dependencies and the nearest existing
in-root directory as `watchPath`, so the host can detect when a file appears.

Supported fence keys are `id`, `alt`, `caption`, `src`, `mode`, and `state`.
Unknown, repeated, malformed, or control-containing values fail the build.
Captions and alternatives are plain text. The adapter does not evaluate HTML
or JSX. Inline SVG is not available.

## markdown-it

Call `createMarkdownItDraft(options)` and add its `plugin` to markdown-it. Use
`adapter.render(md, source, env)` to parse, prepare, and render one document. The
adapter also exposes `prepare(tokens, env)` for hosts that need custom rendering.
Prepared state stays local to each token tree, so separate documents can prepare
at the same time.

## Optional interactive mode

`mode="interactive"` requires a host `interactive` bridge. The bridge emits a
versioned JSON asset and names the client module. This mode publishes the
diagram source in that JSON asset by design. Keep the JSON and SVG references
with the page cache.

The host can load `@draftably/markdown/client` after hydration and call
`enhanceDrafts(root, { policies })`. The client validates same-origin URLs and
bounded JSON before it mounts `@draftably/runtime/viewer`. It hides the static
image only after the viewer commits an update. On failure or destroy, the
fallback image stays or becomes visible.

The host owns module loading and teardown. Static adapter entry points do not
import the client or viewer. Use interactive mode only when public source is
acceptable.

For positioned author errors, preserve mdast positions and inspect
`file.data.draftably.diagnostics`. Production builds fail by default. Set
`errors: 'placeholder'` for expected content, metadata, or include errors. Host
emitter, dependency callback, and renderer failures still fail the build.

See [`docs/integrations/markdown.md`](../../docs/integrations/markdown.md) and
[`integration-examples/unified/`](../../integration-examples/unified/) for
pinned Unified, MDX, markdown-it, and interactive consumer proofs.
