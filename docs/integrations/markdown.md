# Markdown integration

`@draftably/markdown/remark` transforms only parser-recognized code nodes with
the complete language name `draft`. A fence without attributes is valid:

````markdown
```draft
diagram "Checkout" version=1
node web "Web app"
node api "API"
edge request web -> api "HTTPS"
```
````

The canonical metadata form uses one brace group and quoted values:

````markdown
```draft {src="./diagrams/checkout.draft" alt="The web app sends requests to the API." caption="Checkout path"}

```
````

Only `id`, `alt`, `caption`, `src`, `mode="static"`, and `state` are accepted.
Theme and layout belong in the `.draft` body. Unknown keys and interactive mode
fail. Literal code examples remain code because the plugin walks the parsed AST
and never scans code contents.

## Unified and MDX

Use the async transformer before code highlighting. The adapter emits ordinary
image nodes, or a generated figure with a text-only caption. It does not create
HTML strings, JSX, or executable data. Keep the same durable asset store across
page-cache hits and builds. The emitter runs on each transform, including warm
render-cache hits.

Set `sources.rootDir` to the content root to enable `src`. Include resolution
starts from the containing Markdown file and checks both the lexical path and
the canonical real path. Missing include paths are reported through
`onDependency` and the document manifest. A missing dependency also reports
the nearest existing in-root directory as `watchPath`. Hosts must connect these
paths to their watcher and keep dependencies with their page cache.

Use a content-addressed emitter and include the site's base path in returned
URLs. The adapter rejects URL schemes such as `javascript:` and control
characters. Build output must not expose absolute filesystem paths. Inspect
`file.data.draftably` for emitted assets, dependencies, and diagnostics.

The default error policy is `fail`. `errors: 'placeholder'` replaces expected
content, metadata, or include errors with the plain text “Diagram unavailable.”
Host emitter, dependency callback, and renderer failures still fail the build.
The placeholder never includes source or an exception stack. Inline SVG and
interactive output are not supported here.

## Consumer proof

See [the runnable Unified and MDX examples](../../integration-examples/unified/README.md).
The fixture pins `unified@11.0.5`, `remark-parse@11.0.0`,
`remark-rehype@11.1.2`, `rehype-stringify@10.0.1`, and `@mdx-js/mdx@3.1.1`.
Run it after packing both `@draftably/runtime` and `@draftably/markdown`.
