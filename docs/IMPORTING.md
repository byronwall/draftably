# Import diagrams

Use `draftably import` to convert a foreign diagram into native `.draft` source. The input file stays unchanged. Edit the new file with the normal draftably viewer.

```sh
draftably import systems.dot --output systems.draft
draftably check systems.draft
draftably open systems.draft
```

The output file must not already exist. Omit `--output` to print the native source to standard output. Diagnostics go to standard error. An ambiguous file name needs `--from dot`. Pass `--accept-lossy` after reviewing warnings to accept appearance or layout changes. Errors cannot be accepted.

The current command supports a subset of Graphviz DOT. It preserves ordinary nodes, nested clusters, labels, parallel and undirected connections, and selected shapes and colors. Layout is recalculated. Unsupported meaning, including record fields, named ports and two-ended arrows, stops the import. Some valid DOT grammar is outside the parser profile. Mermaid and D2 support is in progress.
