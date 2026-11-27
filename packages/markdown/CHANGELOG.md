# @draftably/markdown

## 0.5.1

### Patch Changes

- Updated dependencies [0cba7b6]
- Updated dependencies [67a7555]
- Updated dependencies [b15b2f1]
- Updated dependencies [7dfc0c4]
- Updated dependencies [91bbcf3]
- Updated dependencies [a2f2e89]
- Updated dependencies [fdd349a]
- Updated dependencies [fb2a61c]
- Updated dependencies [c5ff4ae]
  - @draftably/runtime@0.12.0

## 0.5.0

### Minor Changes

- 65ef4e3: The Mermaid importer reads frontmatter: `title` becomes the diagram title, `config.theme: dark` becomes `theme blueprint`, and other settings are ignored with a warning. Before, any frontmatter block was refused.

### Patch Changes

- Updated dependencies [2370558]
- Updated dependencies [21cbcff]
  - @draftably/runtime@0.11.1

## 0.4.0

### Minor Changes

- ae3414b: New releases use the Functional Source License, FSL-1.1-MIT, in place of MIT. You can use, change and redistribute the code for any purpose except a competing commercial product or service. Each release becomes MIT two years after its release date. Versions already on npm (0.10.0 and older) stay MIT.

### Patch Changes

- Updated dependencies [7b61ef4]
- Updated dependencies [7b61ef4]
- Updated dependencies [ae3414b]
  - @draftably/runtime@0.11.0

## 0.3.1

### Patch Changes

- Updated dependencies [25852bf]
- Updated dependencies [76fe166]
- Updated dependencies [bb96cfe]
- Updated dependencies [61825b7]
- Updated dependencies [7704141]
- Updated dependencies [86a9834]
- Updated dependencies [9e31121]
- Updated dependencies [dc93b3f]
  - @draftably/runtime@0.10.0

## 0.3.0

### Minor Changes

- 4073fa0: Add timelines: `layout <group> timeline` places nodes on a real date axis as rows in bands, with open, unknown-start and partial-step spans, milestone rules, a today rule, a generated legend and an optional zoom panel. A timeline sits beside ordinary boxes, and lines join its rows to them.

  Mermaid `gantt` charts and dated `timeline` charts now import as native timelines: `draftably import`, `draftably migrate` and the `@draftably/mermaid` drop-in keep Mermaid's computed dates and draw `after` dependencies as arrows.

### Patch Changes

- Updated dependencies [3f77d2b]
- Updated dependencies [caca35c]
- Updated dependencies [c34d585]
- Updated dependencies [6c536fe]
- Updated dependencies [b7f43ad]
- Updated dependencies [4073fa0]
- Updated dependencies [443cceb]
  - @draftably/runtime@0.9.0

## 0.2.6

### Patch Changes

- Updated dependencies [609b3d7]
- Updated dependencies [2821fb9]
- Updated dependencies [4703419]
- Updated dependencies [424d4f6]
- Updated dependencies [58f2712]
- Updated dependencies [dc74563]
- Updated dependencies [f7e76e2]
  - @draftably/runtime@0.8.0

## 0.2.5

### Patch Changes

- Updated dependencies [884a002]
- Updated dependencies [ad2c8a9]
- Updated dependencies [6a0cd1e]
- Updated dependencies [57965e9]
- Updated dependencies [43dd8ff]
  - @draftably/runtime@0.7.0

## 0.2.4

### Patch Changes

- Updated dependencies [df6625b]
  - @draftably/runtime@0.6.0

## 0.2.3

### Patch Changes

- Updated dependencies [10e1ade]
- Updated dependencies [7ac4e4c]
- Updated dependencies [d003c4b]
- Updated dependencies [db18254]
  - @draftably/runtime@0.5.0

## 0.2.2

### Patch Changes

- Updated dependencies [34c0845]
- Updated dependencies [f98d285]
- Updated dependencies [e539e30]
- Updated dependencies [c0f7e7c]
- Updated dependencies [7348833]
- Updated dependencies [0f0df75]
- Updated dependencies [54a5098]
- Updated dependencies [45923b9]
- Updated dependencies [65a875e]
- Updated dependencies [7af26f5]
- Updated dependencies [dd3ee13]
- Updated dependencies [bc0a6e5]
- Updated dependencies [acbd88f]
- Updated dependencies [e46dd29]
  - @draftably/runtime@0.4.0

## 0.2.1

### Patch Changes

- Updated dependencies [544be76]
- Updated dependencies [2f625b2]
- Updated dependencies [da6799e]
- Updated dependencies [dbf251a]
- Updated dependencies [f170a08]
- Updated dependencies [9260ac2]
- Updated dependencies [7259d8c]
- Updated dependencies [1ff30f9]
- Updated dependencies [e8754d1]
- Updated dependencies [3eba208]
- Updated dependencies [b4a84ab]
  - @draftably/runtime@0.3.0

## 0.2.0

### Minor Changes

- 98664eb: Add shared file assets and one-call Markdown rendering
- d8f89ef: Add an async markdown-it adapter and an opt-in viewer client entry. Static
  Markdown continues to render an accessible SVG image without client code.
- 3f04900: Add the shared Markdown core and async remark adapter for static SVG diagram assets.
- 4ad188c: New `mermaid: 'convert'` option for the remark and markdown-it adapters. A `mermaid` fence that holds a flowchart or sequence becomes the same static SVG image as a `draft` fence, with no Mermaid in the browser. Pie, gantt and every other Mermaid family stay code blocks for the site's Mermaid setup.

### Patch Changes

- fe01bb5: The guides for every package moved to draftably.dev/docs, and each package README now links there. The Emphasis states page draws each state live.
- Updated dependencies [3b77f78]
- Updated dependencies [fe01bb5]
- Updated dependencies [ba5f518]
- Updated dependencies [b05bb95]
- Updated dependencies [a0786b0]
- Updated dependencies [fdb759b]
  - @draftably/runtime@0.2.0
