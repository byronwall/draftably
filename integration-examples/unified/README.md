# Unified and MDX package proof

Run `pnpm markdown:build && pnpm markdown:pack-check` from the repository root.
This packs both packages and runs the static and interactive consumer proofs.
To run the fixture directly, use `pnpm --dir integration-examples/unified
install` and then `pnpm --dir integration-examples/unified prove`.
It checks that the result contains an image with a base-path URL, alt text, and
dimensions; JavaScript is not needed to read the generated HTML.

The emitter writes SVGs to `out/diagrams/` and returns `/docs/diagrams/` URLs.
Replace it with the target framework's durable asset hook before production.

The interactive fixture has a separate `emitInit` callback that writes
content-addressed JSON. It checks that the page references the JSON URL without
putting diagram source in HTML, and that the document result lists the client
entry. [`attach-client.ts`](./attach-client.ts) shows host module loading and
route cleanup. `pnpm markdown:browser-check` runs a real Chromium check against
the packed runtime viewer. It checks static output with JavaScript disabled,
update commit, policy and redirect failures, destroy, and delayed work. It does
not replace the viewer with a test stub. It saves a screenshot under
`tmp/markdown-package-proof/`.
