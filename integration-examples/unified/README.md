# Unified and MDX package proof

Run `pnpm markdown:build && pnpm markdown:pack-check` from the repository root.
The proof packs both packages and installs them in a clean consumer outside the
repository. To run this fixture by hand, pack both archives into
`tmp/markdown-package-proof/`, then install the fixture with
`pnpm install --lockfile=false`.
`pnpm prove` builds ordinary Markdown and MDX from the packed packages.
It checks that the result contains an image with a base-path URL, alt text, and
dimensions; JavaScript is not needed to read the generated HTML.

The emitter writes SVGs to `out/diagrams/` and returns `/docs/diagrams/` URLs.
Replace it with the target framework's durable asset hook before production.
