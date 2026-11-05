# `@draftably/markdown`

This package converts canonical `draft` code fences to static SVG image nodes.
Its first adapter is async remark. It does not compile diagrams in the reader.

The host must provide `emitAsset`. It receives final SVG bytes and returns the
public URL. Use a durable content-addressed store with your page cache. Re-emit
the asset on a warm Markdown transform, and retain asset references with cached
pages. The host owns base paths, publication, cleanup, and watcher integration.

Use `src="./diagram.draft"` only with `sources.rootDir` and a Markdown file path.
The resolver rejects remote and absolute paths, non-`.draft` files, and symlink
escapes. It reports missing paths as dependencies and the nearest existing
in-root directory as `watchPath`, so the host can detect when a file appears.

Supported fence keys are `id`, `alt`, `caption`, `src`, `mode="static"`, and
`state`. Unknown, repeated, malformed, or control-containing values fail the
build. Captions and alternatives are plain text. The adapter does not evaluate
HTML or JSX. Interactive mode and inline SVG are not available.

For positioned author errors, preserve mdast positions and inspect
`file.data.draftably.diagnostics`. Production builds fail by default. Set
`errors: 'placeholder'` for expected content, metadata, or include errors. Host
emitter, dependency callback, and renderer failures still fail the build.

See [`docs/integrations/markdown.md`](../../docs/integrations/markdown.md) and
[`integration-examples/unified/`](../../integration-examples/unified/) for the
consumer proof and a pinned Unified/MDX setup.
