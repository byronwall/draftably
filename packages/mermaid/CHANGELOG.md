# @draftably/mermaid

## 0.6.0

### Minor Changes

- 65ef4e3: The Mermaid importer reads frontmatter: `title` becomes the diagram title, `config.theme: dark` becomes `theme blueprint`, and other settings are ignored with a warning. Before, any frontmatter block was refused.

### Patch Changes

- Updated dependencies [2370558]
- Updated dependencies [21cbcff]
  - @draftably/runtime@0.11.1

## 0.5.0

### Minor Changes

- ae3414b: New releases use the Functional Source License, FSL-1.1-MIT, in place of MIT. You can use, change and redistribute the code for any purpose except a competing commercial product or service. Each release becomes MIT two years after its release date. Versions already on npm (0.10.0 and older) stay MIT.

### Patch Changes

- 8753fa9: Mermaid import reads labels with linkedom as well as with a browser or JSDOM document, so the hosted render service can import Mermaid.
- Updated dependencies [7b61ef4]
- Updated dependencies [7b61ef4]
- Updated dependencies [ae3414b]
  - @draftably/runtime@0.11.0

## 0.4.1

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

## 0.4.0

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

## 0.3.2

### Patch Changes

- Updated dependencies [609b3d7]
- Updated dependencies [2821fb9]
- Updated dependencies [4703419]
- Updated dependencies [424d4f6]
- Updated dependencies [58f2712]
- Updated dependencies [dc74563]
- Updated dependencies [f7e76e2]
  - @draftably/runtime@0.8.0

## 0.3.1

### Patch Changes

- Updated dependencies [884a002]
- Updated dependencies [ad2c8a9]
- Updated dependencies [6a0cd1e]
- Updated dependencies [57965e9]
- Updated dependencies [43dd8ff]
  - @draftably/runtime@0.7.0

## 0.3.0

### Minor Changes

- df6625b: The Mermaid sequence import writes what each message is: a solid arrow is a call, an open arrow is a send, and a dotted line is a reply that names the call it answers. It turns activation bars on when each bar in the source runs from a call to its reply, and it no longer writes kind=async for a sequence.

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

- 73c3a5d: Add a drop-in for the `mermaid` package. Pages keep `mermaid.initialize`, `run`, `render` and `parse`. Draftably draws Draftably source and converted Mermaid flowcharts and sequences, and Mermaid draws every other family.

### Patch Changes

- fe01bb5: The guides for every package moved to draftably.dev/docs, and each package README now links there. The Emphasis states page draws each state live.
- Updated dependencies [3b77f78]
- Updated dependencies [fe01bb5]
- Updated dependencies [ba5f518]
- Updated dependencies [b05bb95]
- Updated dependencies [a0786b0]
- Updated dependencies [fdb759b]
  - @draftably/runtime@0.2.0
