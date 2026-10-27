# Follow-up requests

Source: `~/Projects/chess-practice` (`src/App.tsx`, `src/views/PracticeView.tsx`,
`src/views/NotebookView.tsx`, `src/views/GameTrainer.tsx`, `src/components/PuzzleRunner.tsx`,
`src/lib/*.ts`; the import lines of each file).

Kind / layout / color strategy / theme: module dependency map, `stress`, shade ramp (teal 800 at
the app down to 200 at the leaf libraries; packages as plain pills) / signal. Added in round 5.

v0 expects `near` rather than `above`: stress has no reading direction, and `above` on stress is
a known false alarm (code-layers).

e1 (grow): "Add GameTrainer: the app opens it, and it uses Board and chess.js."

- New node `trainer`; edges app → trainer, trainer → board, trainer → chessjs.
- expects: keeps-order; near trainer board 200.

e2 (recolor + theme): "Make the outside packages slate and switch to the dark theme."

- `theme blueprint`; `color=slate` on `chess.js` and `content/*.json`.
- expects: still \* (color and theme never move anything).
