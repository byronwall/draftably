# Mermaid drop-in example

A page written for Mermaid, unchanged. The `mermaid` dependency in `package.json` points at
`@draftably/mermaid`, so the flowchart, the sequence and the Draftably block render with
Draftably.

```sh
pnpm install
pnpm dev
```

`src/main.js` is ordinary Mermaid code: one `mermaid.initialize` call.
