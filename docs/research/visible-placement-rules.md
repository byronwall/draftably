# Can the placement rule explain a surprising move?

This is a read-only editor prototype based on the November 28, 2026 Repo Reading Brief and [StickyLines (UIST 2016)](https://hci-museum.lisn.upsaclay.fr/content/4-all-generative/stickylines.pdf). StickyLines found a benefit for creating more involved layouts with persistent guides. It did not test explaining an agent's later edit. Draftably already persists relative placement. This trial asks whether exposing one existing rule helps a reader understand the result.

## Try it

1. Build with `pnpm build`. Open a disposable copy of `examples/checkout.draft` with `pnpm draftably open <copy>` and follow the Viewer URL.
2. In that copy, append `near payments orders side=below gap=32`. Select **Payments** and open **Properties** (right side, shortcut `]`). The prototype names Orders, the requested gap and the source line. It reports a relaxation only when the compiler emits one for that rule.
3. Keep Payments selected. In the file, add an adjacent box and edge:

   ```draft
   node fraud "Fraud check" in=services
   edge score payments -> fraud "score"
   ```

   Then change the Orders label to a longer one, for example `Orders and fulfillment reconciliation`. Watch which boxes move. Check that the explanation follows the named anchor after each edit. This is the same kind of edit as an agent writing to the file.

4. As a separate check in the disposable copy, remove just the `near payments …` line and confirm the explanation vanishes. Compare the stable object and edge IDs before and after. The prototype never removes a rule or writes source.

## Compare with today's editor

Run the same tasks against the base revision and this branch, starting with identical copies. Leave Properties open for both arms; alternate which build goes first across people. To avoid memorizing the answer, use a second equivalent fixture with different node names and a different side for the second run.

Ask the reader why the selected card tends to sit where it does and what they would change if they wanted it to stop. Have them attempt the answer before opening Source, but record it if they do open Source. Record time to a correct answer, named anchor and side, whether they distinguish preference from guarantee, and any unnecessary drags or source edits. Judge usefulness separately from discovery: a second pass can start with the panel closed like a normal editing session. The browser proof covers the interaction contract, not that people answer faster.

Keep the experiment narrow. No new DSL, inference about automatic layout, canvas guides, or write control. If readers cannot find the explanation, compare a small selected-node cue before adding an editing workflow.
