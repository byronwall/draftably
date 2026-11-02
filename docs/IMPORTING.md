# Import diagrams

Open a DOT, Mermaid flowchart or D2 file from **Import text diagram** in the editor, or choose a file on the site. The import opens as a new native draft. Review any warnings before opening it. The input file stays unchanged.

You can also use `draftably import` from the terminal:

```sh
draftably import systems.dot --output systems.draft
draftably check systems.draft
draftably open systems.draft
```

The output file must not already exist. Omit `--output` to print the native source to standard output. Diagnostics go to standard error. An ambiguous file name needs `--from dot`. Pass `--accept-lossy` after reviewing warnings to accept appearance or layout changes. Errors cannot be accepted.

The command supports Graphviz DOT graphs, Mermaid flowcharts and ordinary D2 graphs. It preserves supported nodes, groups, labels and connections. Layout is recalculated. Unsupported meaning, including DOT record fields, named ports and two-ended arrows, stops the import. Some valid DOT grammar is outside the parser profile. Mermaid sequences and D2 sequence, class, table and multi-board diagrams are not yet supported.

Mermaid and D2 run in a separate worker with a 30-second deadline. D2 compiles its input into a graph snapshot; its variables and rules do not remain live in the native file. The CLI package includes the D2 compiler and its runtime, which adds to installation size.

In the browser, D2 runs in a worker with a 30-second deadline. Mermaid parses on the main thread after a 100 KB input limit; a complex input can make the page unresponsive. The browser loads the D2 compiler only when needed. PlantUML, DBML, nomnoml and Mermaid diagram families other than flowcharts are not supported yet.
