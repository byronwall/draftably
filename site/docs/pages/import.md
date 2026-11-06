# Import diagrams

Turn a Graphviz DOT, Mermaid or D2 file into an editable `.draft` file. The import keeps the
boxes, groups, labels and connections, and lays the diagram out again. The input file stays as it
is.

```sh
draftably import systems.dot --output systems.draft
draftably check systems.draft
draftably open systems.draft
```

In the editor or the [Playground](/play), choose **Import text diagram** and pick a file. It opens
as a new draft, with any warnings shown before you open it.

| Format            | Imports                              | Stops on                                         |
| ----------------- | ------------------------------------ | ------------------------------------------------ |
| Graphviz DOT      | Graphs, clusters, labels, arrowheads | Record fields, named ports, crow's feet          |
| Mermaid flowchart | Nodes, subgraphs, labels, line ends  | Unsupported arrow types, a node in two subgraphs |
| Mermaid sequence  | Participants, boxes, messages, notes | Half arrows, central connections                 |
| D2                | Ordinary graphs, containers, labels  | Sequence, class, table and multi-board diagrams  |

PlantUML, DBML, nomnoml and other Mermaid chart types are not supported yet. To move many Mermaid
fences in Markdown at once, use [`draftably migrate`](#convert-the-source).

## Options

| Option           | Effect                                                                         |
| ---------------- | ------------------------------------------------------------------------------ |
| `--output FILE`  | Writes the result. The file must not exist yet. Without it, the source prints. |
| `--from FORMAT`  | Names the format (`dot`, `mermaid`, `d2`) when the file name does not.         |
| `--accept-lossy` | Writes the result although it has warnings. Errors always stop the import.     |

Diagnostics print to standard error. A warning means some appearance or layout detail changes; read
it before you pass `--accept-lossy`.

Line ends map to `head=` and `tail=`, including two-ended arrows and Mermaid circle and cross ends.
D2 variables and rules become plain values in the native file.

## Mermaid sequence diagrams

A Mermaid sequence becomes a native [sequence diagram](#sequence-diagrams):

| Mermaid                                | Draftably                                                     |
| -------------------------------------- | ------------------------------------------------------------- |
| `participant`                          | `node`                                                        |
| `box`                                  | `group`                                                       |
| `-->>`                                 | `kind=async`                                                  |
| `-x`                                   | `head=cross`                                                  |
| `->`                                   | `head=none`                                                   |
| `Note over A,B` after a message A to B | A note anchored to that message; otherwise to the participant |
| Top-level `alt`, `opt`, `par`, `loop`… | A phase band per branch, labeled such as `alt: ok`            |

Branch logic stays only in the band label, so the import warns. A nested block has no band of its
own. The import also warns about activation bars, `autonumber`, `rect`, `create`, `destroy`,
participant symbols, participant links and the open async arrow `-)`.

## Limits

The CLI runs Mermaid and D2 in a worker with a 30-second deadline. It includes the D2 compiler,
which adds to its install size.

In the browser, D2 loads only when you import a D2 file and runs in a worker. Mermaid parses on
the page, with a 100 KB input limit, so a very complex input can make the page slow for a moment.
