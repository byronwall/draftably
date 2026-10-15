# Agent authoring guide

Meld source is declarative. The current source and selected view are sufficient to reconstruct geometry; the edit history is not a rendering input.

## Recommended behavior

Read `DSL.md` before generating statements. Start with semantic groups/nodes/edges and one concise label per object. Use stable explicit IDs; edit a label without changing the ID. Use `in=` for containment. Add references freely before or after their declarations, but never create duplicate IDs.

Choose a named view and its viewport before optimizing a diagram. Distinguish a fixed-size static deliverable from an interactive exploration canvas. Do not hide required information merely to fit a small box; create a focus/overview view or request a larger viewport when the diagnostics show insufficient readability.

Begin with the default recipe or a per-container flow/row/column/grid choice. Prefer a small number of `order`, `near`, and `align` hints over many exact coordinates. Use a pin only when its location genuinely needs to be hard. Pairwise order/relative/alignment constraints must be within one direct sibling scope.

Use one complete statement per line. Quote user-provided text with JSON escaping. Preserve unrelated declarations and comments. Replace existing records in place where possible—especially node declarations, because declaration order is the default order. A source update should be idempotent: replace a hint rather than append a duplicate. The parser intentionally rejects duplicate declarations and unknown attributes.

When the user explicitly asks to preserve a current arrangement while adding content, capture parent-local soft stays as source inputs. Do not rely on in-memory last-frame coordinates. Do not overwrite an authored relative relationship with a stay unless that change is intentional.

After each meaningful source edit, compile, inspect diagnostics, inspect the rendered result, and verify the selected view again. A lack of solver warnings is not a guarantee that the diagram communicates well. Inspect crowded edge routes, detached labels, excessive branching, small text, and unwanted changes to the reading order.

## Headless interface

```js
const fs = require('node:fs');
const Meld = require('./src/meld-core.js');
const source = fs.readFileSync('examples/commerce.meld', 'utf8');
const model = Meld.parse(source);
const scene = Meld.layout(model, 'brief');
console.log(scene.diagnostics);
console.log(scene.scopes);
console.log(scene.hidden, scene.edgeStats);
console.log(Meld.geometry(scene));
```

`parse` returns records with their one-based source `line`. `layout` is pure with respect to the model, selected view, and explicit overrides. `compile(source, view, overrides)` combines them. `geometry(scene)` returns the complete canonical geometry string used in repeatability tests. `snapshotText(scene)` returns a generated cache block.

The optional `overrides` argument is useful for experimentation. Persist accepted overrides into the corresponding `view` declaration before handing the source to another renderer. An external render context that is not serialized is another dependency and must not be hidden.

## Browser integration surface

`window.MeldLab` exposes `getState`, `setSource`, `select`, `dragTo`, `addComponent`, `reflowScope`, `checkpoint`, `verify`, `exportSVG`, `changeView`, `changeLayout`, and `importFile`. These are local prototype functions, not a network API or a security boundary.

```js
MeldLab.select('workers');
MeldLab.changeLayout({ algorithm: 'grid', columns: 2, gap: 32 });
MeldLab.dragTo('payments', 240, 60, 'relative');
const result = MeldLab.verify();
```

`dragTo` accepts a parent-local target position and a mode: `relative`, `offset`, or `pin`. Relative mode infers a sibling relation and can choose a result that differs slightly from the requested pixel because the layout must resolve other constraints. Treat the resulting source and diagnostics as the committed outcome.

## Not implemented

There is no MCP server, remote tool execution, authenticated multi-user editing, CRDT, structured patch protocol, transactional collaboration service, or actual autonomous model in this artifact. A production adapter should add typed idempotent operations with stable operation IDs and preconditions, not instruct agents to repeatedly replay imperative “move by” commands.
