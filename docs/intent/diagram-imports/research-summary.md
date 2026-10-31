# Diagram import research

Pro recommends converting foreign source into native `.draft` source, then using the existing compiler and editor. It supplied partial adapters for DOT, Mermaid flowcharts, and D2. These are research artifacts, not integrated product code.

The current source at `dd2ababc` confirms that `projectScene` forces directed edges and `translateEdit` rejects undirected edges. CLI SVG also always draws an arrow. A native persistence change is needed to preserve undirected relationships through editing and saving. Scratch sessions also need review before use for imports.

## Decisions

| Recommendation                                               | Disposition | Reason                                                                   |
| ------------------------------------------------------------ | ----------- | ------------------------------------------------------------------------ |
| Native source, detection, diagnostics, and atomic conversion | Build       | Native source is the existing edit and save authority.                   |
| Undirected native edges                                      | Build       | DOT, Mermaid, and D2 can contain undirected relationships.               |
| DOT core and Mermaid flowcharts                              | Build       | They cover common graph use and have supplied adapters.                  |
| D2 ordinary graphs                                           | Build       | Byron explicitly requested D2; measure and isolate its compiler cost.    |
| CLI and browser import                                       | Build       | Both paths must create a new native document without changing the input. |
| Mermaid sequences and other common formats                   | Explore     | Choose a bounded family from parser and native-model evidence.           |
| Foreign-format output and synchronization                    | Avoid       | Outside the requested scope.                                             |

The shipped feature matrix must state supported families and losses. Check parser licenses, runtime costs, execution boundaries, and every integration claim against the current code. The supplied tests and measurements describe the research kit; they do not prove the product integration.

[Complete result inventory](asset-index.md) · [Pro conversation](https://chatgpt.com/c/6ae55efc-831c-83e9-aa06-3df3d1ae526b) · [Original report and companions](assets/pro-results/2026-10-31/START-HERE.md) · [Detailed Pro plan](assets/pro-results/2026-10-31/draftably-importers-plan.md)
