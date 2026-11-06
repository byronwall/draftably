# Build an adapter

An adapter lets another host, such as a Markdown engine or an editor, draw `draft` fences. Keep it
thin: find the host's code block, read its options, call `@draftably/runtime`, publish the SVG
through the host and pass diagnostics back. Never add a second parser, layout engine or renderer.

The [Markdown package](#markdown) is the reference: its remark and markdown-it adapters share one
core and differ only in how they walk the document.

## Read the fence

Transform only fenced blocks whose language is exactly `draft`. Options sit in one brace group
with quoted values:

````markdown
```draft {id="checkout" alt="Web sends an order through the API." caption="Checkout path"}
node web "Web"
node api "API"
edge order web -> api "order"
```
````

The keys are `id`, `alt`, `caption`, `mode`, `src` and `state`. Reject unknown or repeated keys,
broken quotes or braces, newlines in values and trailing text. `src` names a local `.draft` file and
cannot appear with a body. Options never set a URL, callback, CSS, HTML, link policy or file root.

## Keep authority in the host

The host, not the fence, decides what is allowed:

- **Files.** Resolve `src` from the Markdown file, inside a configured content root, and turn it off
  when there is no root. Reject absolute paths, URL schemes, drive and UNC paths, other file types
  and symlinks that leave the root. Check the size before you read.
- **Rebuilds.** Report each included file, even a missing one, as a dependency. Hash its bytes; do
  not rely on modified times.
- **Output.** Static output has no links and no embedded source by default. Built HTML must not
  show local paths.
- **Browser code.** Interactive mode sends the source to the reader's browser. Make it a host
  choice.

## Prepare, then render

Rendering is async. A synchronous renderer, such as markdown-it, must parse once, prepare those
tokens, then render the same tokens:

```js
const env = { draftably: { documentPath } };
const tokens = md.parse(markdownText, env);
await adapter.prepare(tokens, env);
const html = md.renderer.render(tokens, md.options, env);
```

Calling `md.render(markdownText, env)` after `prepare` parses new tokens and loses the work. Fail
clearly if an unprepared `draft` token reaches the renderer, and pass every other fence to the
renderer that was there before. Keep the prepared state with the token tree, never in a global.

## Map diagnostics

Keep the runtime's diagnostic codes and severities, and point each one at the Markdown file and
line. For a fence that opens on line 20, `.draft` line 3 is Markdown line 23. Lists, block quotes
and indented fences need a real line map, not one offset. For an error in an included file, point
at the `.draft` file and keep the fence as a related location.

Fail the build by default. A placeholder mode, if you offer one, shows plain text with no source
and no stack trace.

## Publish the output

Write a standalone SVG with embedded fonts, under a content-hash name, and return a public URL from
the host, never a file path. IDs must be the same in every checkout and unique on the page. When
the host serves a cached page, publish its SVG again: a cached page with a missing image is a
broken build.

## Test it

`tests/fixtures/integrations/` is a host-neutral corpus. Run its shared contract:

```sh
pnpm exec vitest run tests/fixtures/integrations/contract.test.ts
```

Then prove these at your adapter's boundary:

1. Valid source draws the same geometry every time.
2. Valid and invalid options normalize or fail as above.
3. A diagnostic points at the right fence and included file.
4. Output has alt text and no source by default.
5. Links stay off unless the host policy allows them.
6. A missing cached asset comes back, or the page rebuilds.
7. Other fences and literal examples pass through unchanged.
8. Render uses the exact prepared token tree.

To try the packages from a checkout in your host, run `pnpm integration:pack` in the Draftably
repository. It writes package archives and an `INSTALL.md` with install commands under
`tmp/integration-packages/`, and publishes nothing.
