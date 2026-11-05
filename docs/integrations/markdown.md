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

Only `id`, `alt`, `caption`, `src`, `mode="static"` or
`mode="interactive"`, and `state` are accepted. Theme and layout belong in the
`.draft` body. Unknown keys fail. Literal code examples remain code because the
plugin walks the parsed AST and never scans code contents.

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
The placeholder never includes source or an exception stack. Inline SVG is not
supported.

## markdown-it

markdown-it fence rendering is synchronous. Create the adapter, attach its
plugin, then parse and prepare each document before rendering it:

```js
const adapter = createMarkdownItDraft(options);
const md = new MarkdownIt().use(adapter.plugin);
const env = { draftably: { documentPath: pagePath } };
const tokens = md.parse(markdown, env);
const manifest = await adapter.prepare(tokens, env);
const html = md.renderer.render(tokens, md.options, env);
```

Pass the same tokens and environment to prepare and render. Rendering an
unprepared Draft fence throws. The adapter stores prepared results per token
tree. Separate documents can prepare at the same time.

## Interactive enhancement

Interactive mode needs the host bridge:

```js
interactive: {
  clientModuleUrl: '/assets/draftably-client.js',
  policyId: 'docs',
  emitInit: async data => writeVersionedInitAsset(data),
}
```

The host emits the JSON bytes and returns their content-addressed filename and
public URL. The generated page includes a static SVG image and an empty viewer
region. Source appears only in the explicit versioned JSON asset. The manifest
lists that asset and the client module URL.

After hydration, load `@draftably/markdown/client` and call
`enhanceDrafts(root, { policies, onDiagnostic })`. The client accepts only
same-origin HTTP(S) initialization URLs without redirects and bounded JSON with
the expected version, key, and policy. It mounts the actual runtime viewer. It hides the
fallback image only after an update commits. Failed requests and viewer errors
keep the fallback visible. `destroy()` aborts work, destroys mounted viewers,
and restores the fallback.

The host controls client loading and viewer policies. The Markdown package
build keeps the reader entry separate and externalizes
`@draftably/runtime/viewer`. Static pages do not load client code or runtime
compiler code.

With Vite, exclude the runtime from dependency optimization so its worker URL
stays beside the packed viewer entry:

```js
export default defineConfig({
  optimizeDeps: { exclude: ['@draftably/runtime'] },
});
```

The client rejects initialization redirects. Serve the init JSON from the
same origin as the page.

## Consumer proof

See [the runnable Unified, MDX, markdown-it, and browser examples](../../integration-examples/unified/README.md).
The fixture pins `unified@11.0.5`, `remark-parse@11.0.0`,
`remark-rehype@11.1.2`, `rehype-stringify@10.0.1`, and `@mdx-js/mdx@3.1.1`.
Run it after packing both `@draftably/runtime` and `@draftably/markdown`.
