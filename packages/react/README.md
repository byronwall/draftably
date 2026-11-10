# `@draftably/react`

Draftably diagrams in React. `DraftDiagram` wraps the `<draft-diagram>` element from
`@draftably/runtime`, so every framework gets the same viewer: zoom, pan, keyboard outline, and
cleanup when it unmounts. Any number of diagrams can share a page.

```sh
pnpm add @draftably/react
```

See [Frameworks](https://draftably.dev/docs/frameworks) for the component, server
rendering with the `svg` prop, and a complete example.

## React Flow

`@draftably/react/flow` exports `DraftablyEdge`, a React Flow custom edge that draws the lines
and labels that `layout({ reactFlow })` from `@draftably/runtime/graph` routed. It does not need
React Flow as a dependency. See [Drop in your graph layout](https://draftably.dev/docs/layout-drop-in#react-flow).

```tsx
import { DraftablyEdge } from '@draftably/react/flow';

<ReactFlow nodes={nodes} edges={edges} edgeTypes={{ draftably: DraftablyEdge }} />;
```
