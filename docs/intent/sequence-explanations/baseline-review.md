# Baseline review

Baseline: `2f210ce4aa92593d7cafa9c514bb4ab3808dd2a4`.
These are source observations for the Pro review, not final design decisions.

## Existing work

- `src/dsl/compile.ts::participantWidth` narrows short participant headers. It preserves explicit size hints.
- `src/model/colors.ts::drawnSwatch` and `participantAccent` use neutral participant fills and color accents.
- `src/model/routes.ts` places sequence labels above message rows. `messageRoute` uses a straight segment or attached four-point self-loop.
- `src/dsl/compile.ts::sequenced` measures message labels and allocates variable row heights. It supports authored phases and participant groups.
- `src/cli/svg.ts::sequenceBackdrop` draws phase bands and a phase-label gutter. The viewer reuses this markup.
- `tests/sequence.test.ts` checks ordering, straight messages, label wrapping, narrow headers, participant bands, and phase bounds.

## Questions the research must settle

- `docs/DSL.md` describes `kind=async` as a dashed reply. Separate asynchronous sends from returns before adding execution semantics.
- `sequenced` computes message rows without consulting phase boundaries. Phase bands currently describe existing row spans.
- Participant groups keep members contiguous. This can change the listed participant order. Determine the intended precedence and diagnostics.
- The horizontal spacing calculation spreads label width across a message span but adjusts only the receiving gap. Check every span constraint.
- Self-message labels sit beside loops. Check bounds, adjacent lifelines, and the rightmost participant with long local-action labels.
- `examples/login-sequence.draft` still uses a broad title, no phases, and no success-path scope note.
- Geometry tests do not establish reader comprehension. Add task questions and visible proof to the proposed acceptance criteria.

## Evidence

`pnpm shoot examples/login-sequence.draft tmp/pro/sequence-explanations/baseline.png` completed successfully with approved Chromium access. Pro received that actual baseline render. No product source or examples changed during preparation.
