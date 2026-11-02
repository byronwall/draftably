# Import diagrams

Open a DOT, Mermaid flowchart, Mermaid sequence or D2 file from **Import text diagram** in the editor, or choose a file on the site. The import opens as a new native draft. Review any warnings before opening it. The input file stays unchanged.

You can also use `draftably import` from the terminal:

```sh
draftably import systems.dot --output systems.draft
draftably check systems.draft
draftably open systems.draft
```

The output file must not already exist. Omit `--output` to print the native source to standard output. Diagnostics go to standard error. An ambiguous file name needs `--from dot`. Pass `--accept-lossy` after reviewing warnings to accept appearance or layout changes. Errors cannot be accepted.

The command supports Graphviz DOT graphs, Mermaid flowcharts, Mermaid sequence diagrams and ordinary D2 graphs. It preserves supported nodes, groups, labels and connections. Layout is recalculated. Line ends map to `head=` and `tail=`, including two-ended arrows and Mermaid circle and cross links. Unsupported meaning, including DOT record fields, named ports and crow's feet, stops the import. Some valid DOT grammar is outside the parser profile. D2 sequence, class, table and multi-board diagrams are not yet supported.

Mermaid and D2 run in a separate worker with a 30-second deadline. D2 compiles its input into a graph snapshot; its variables and rules do not remain live in the native file. The CLI package includes the D2 compiler and its runtime, which adds to installation size.

In the browser, D2 runs in a worker with a 30-second deadline. Mermaid parses on the main thread after a 100 KB input limit; a complex input can make the page unresponsive. The browser loads the D2 compiler only when needed. PlantUML, DBML, nomnoml and other Mermaid diagram families are not supported yet.

## Mermaid sequence diagrams

A Mermaid sequence becomes a native sequence. Participants become nodes, and `box` becomes a group. `-->>` becomes `kind=async`, `-x` becomes `head=cross`, and `->` becomes `head=none`. A note anchors to the message it follows when it names the same participants. Otherwise it anchors to its participant.

Native sequences have no fragments. Each top-level branch of `alt`, `opt`, `par`, `loop`, `critical` or `break` becomes a phase band, with a label such as `alt: ok`. The import warns, because the branch logic stays only in that label. A nested block has no band of its own, and its messages stay in the outer band.

The import also warns about activation bars, `autonumber`, `rect`, `create`, `destroy`, participant symbols, participant links and the open async arrow `-)`. Half arrows and central connections stop the import.
