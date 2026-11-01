# Import diagrams

Use `draftably import` to convert a foreign diagram into native `.draft` source. The input file stays unchanged. Edit the new file with the normal draftably viewer.

```sh
draftably import systems.dot --output systems.draft
draftably check systems.draft
draftably open systems.draft
```

The output file must not already exist. Omit `--output` to print the native source to standard output. Diagnostics go to standard error. An ambiguous file name needs `--from dot`. Pass `--accept-lossy` after reviewing warnings to accept appearance or layout changes. Errors cannot be accepted.

The command supports Graphviz DOT graphs, Mermaid flowcharts and ordinary D2 graphs. It preserves supported nodes, groups, labels and connections. Layout is recalculated. Unsupported meaning, including DOT record fields, named ports and two-ended arrows, stops the import. Some valid DOT grammar is outside the parser profile. Mermaid sequences and D2 sequence, class, table and multi-board diagrams are not yet supported.

Mermaid and D2 run in a separate worker with a 30-second deadline. D2 compiles its input into a graph snapshot; its variables and rules do not remain live in the native file. The CLI package includes the D2 compiler and its runtime, which adds to installation size.
