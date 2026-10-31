# Audit repair ledger

This ledger reconciles the [audit](summary.md) with `main` at `2f210ce`. Each row has a browser check in `pnpm prove:site` or a reason for no check. The [issue register](issues.md) is the audit's record. This file is the current status.

GitHub marked #254 and #264 closed, but the audit asked for more than those PRs delivered. Status comes from the proof, not from the issue state.

## Open work

| ID         | Problem                                                                                | Baseline proof                                                                           | Batch |
| ---------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ----- |
| #306 / F07 | Space does nothing on a focused Editor button.                                         | Fails: the File menu stays closed and the pan state starts.                              | A     |
| #254 / F06 | Docs search lets focus reach the page behind it. Escape then stops working.            | Fails: Tab leaves search in all three states. Search has no `aria-modal`. Focus is lost. | B     |
| U05        | The expanded drawing has no keyboard zoom or pan.                                      | Source only: the overlay handles the wheel and the pointer.                              | B     |
| #308 / F13 | The expanded drawing hides that the source has an error.                               | Fails: the overlay does not say "last valid" or give a line.                             | B     |
| #304 / F02 | A Playground module that fails to load leaves a blank page.                            | Fails: no message and no action.                                                         | C     |
| #305 / F03 | The start dialog's Blank diagram still makes the false saving promise from an example. | Fails: the dialog says "saved in this browser" in an example session.                    | D     |
| #305 / F03 | File › New leaves the example, but the blank draft is still called an example.         | Fails: the status says `Example · not on disk`.                                          | D     |
| #307 / F12 | Layout actions do not say what they change, or how to reverse them.                    | Expert judgment. No proof failure exists.                                                | E     |
| F08        | The Editor hides its save status below 720px.                                          | Source only: `.save-status` has `display: none`.                                         | F     |

## Verified complete

These audit items pass in a real browser against the built site, with no change.

| ID                 | Result                                                                        |
| ------------------ | ----------------------------------------------------------------------------- |
| U01 / F01 (#250)   | The landing link shows the Editor on its first click. Back returns.           |
| U03 / F05 (#251)   | The landing demo carries edited source to the Editor.                         |
| U02 / F08 (#249)   | The source pane has usable width at 390px and 768px, with no sideways scroll. |
| U08 (#259)         | The GitHub link and Theme control keep their names at narrow widths.          |
| U04 (#257)         | Large and wide examples open inside their frame.                              |
| U05 / F06 (#254)   | The expanded drawing takes focus, keeps Tab, closes on Escape, returns focus. |
| U06 (#248)         | The nav returns to the same Playground work after Docs.                       |
| F04 (#256)         | Image export is blocked while the source has errors.                          |
| F14 (#248)         | Undo restores the picker name.                                                |
| U09 (#260)         | The File menu reaches the docs and the Playground.                            |
| U10 / F11 (#261)   | `reopen`, `export png` and `save diagram` each lead to a task section.        |
| Audit coverage gap | An exported SVG and PNG each reopen with their source.                        |

## No action

| ID         | Decision                                                                                 |
| ---------- | ---------------------------------------------------------------------------------------- |
| F15        | The clipboard evidence is inconclusive. The audit said not to file a defect.             |
| F08 nav    | Docs at phone width has no Editor link. This waits for the open decision on phone tasks. |
| F12 layout | Moving or hiding tool families needs task evidence. The audit said not to do this yet.   |

## Decisions

Each table scores only the outcomes that the audit's acceptance checks name. A score of 10 means the check passes with no known gap.

### #305: where a new diagram goes

| Option                                    | Prior browser copy kept | Reload keeps the new work | Status tells the truth | Main tradeoff                                          |
| ----------------------------------------- | ----------------------: | ------------------------: | ---------------------: | ------------------------------------------------------ |
| Correct the sentence only                 |                      10 |                         0 |                      4 | The new work still disappears from the start dialog.   |
| Replace the browser copy                  |                       2 |                        10 |                      9 | One slot holds the copy, so New can silently erase it. |
| One scratch-draft path, with its own name |                      10 |                         9 |                     10 | The draft is kept per URL, so the URL matters.         |

**Choice:** one scratch-draft path. File › New already uses it. The start dialog joins it, and the session gets its own name. **Watch:** scratch keeps the 10 newest drafts. The saving guide must say this.

### #306: which Space presses pan

| Option                                  | Native button activation | Space-drag after a toolbar click | Space on the canvas | Main tradeoff                                                 |
| --------------------------------------- | -----------------------: | -------------------------------: | ------------------: | ------------------------------------------------------------- |
| Pan only when focus is on the canvas    |                       10 |                                0 |                  10 | A mouse click on a tool leaves focus there, so panning stops. |
| Never pan on any button                 |                       10 |                                0 |                  10 | Same failure, by a different rule.                            |
| Native only on keyboard-focused buttons |                       10 |                               10 |                  10 | The rule depends on `:focus-visible`.                         |

**Choice:** keyboard-focused buttons keep Space. A button that a mouse focused still lets Space pan. **Watch:** a keyboard user with the pointer over the canvas gets button activation, which is correct.

### #254: how search holds focus

| Option                             | Underlay cannot take focus | Escape from any control | Focus returns | Main tradeoff                                                            |
| ---------------------------------- | -------------------------: | ----------------------: | ------------: | ------------------------------------------------------------------------ |
| Copy the Zoom Tab loop             |                          7 |                      10 |            10 | Search has links and inline buttons, so a list of buttons is not enough. |
| Add `inert` to the page            |                         10 |                       6 |             7 | The Docs page needs a new owner for the state.                           |
| Native `<dialog>` with `showModal` |                         10 |                      10 |            10 | The backdrop moves from a `div` to `::backdrop`.                         |

**Choice:** native `<dialog>`. The browser makes the page inert, handles Escape and restores focus. The editor's dialogs already use this pattern. The expanded drawing already passes, so it stays as it is. **Watch:** removal from the DOM does not restore focus, so cleanup must call `close()`.

### #304: recovery from a failed module

Two failed loads named two different hashed files, on one day with many deploys. A deploy replaces every hashed file, so a page that stayed open can ask for a file that no longer exists. This is the likely cause, but the audit did not prove it.

| Option                        | Visible way out | Incoming source kept | No reload loop | Main tradeoff                                                  |
| ----------------------------- | --------------: | -------------------: | -------------: | -------------------------------------------------------------- |
| Reload automatically once     |               5 |                   10 |              6 | It hides the failure, and needs a guard in storage.            |
| Bundle the Playground eagerly |              10 |                   10 |             10 | The landing page loads the code editor, which the site avoids. |
| Error boundary with Reload    |              10 |                   10 |             10 | The visitor must press one button.                             |

**Choice:** error boundary with a Reload button. The source is in the URL hash, so a reload keeps it, and fresh HTML names files that exist. **Watch:** this repairs the failure surface. It does not prove the cause.

### #307: where layout actions explain themselves

| Option                                    | Scope visible before the action | Keyboard and touch reach it | Tools stay where they are | Main tradeoff                            |
| ----------------------------------------- | ------------------------------: | --------------------------: | ------------------------: | ---------------------------------------- |
| Longer tooltips                           |                               4 |                           2 |                        10 | Touch and keyboard users never see them. |
| Move tools into a layout panel            |                               8 |                           8 |                         0 | The audit said not to move tools yet.    |
| A live line in the menu, and a docs table |                               9 |                           9 |                        10 | The menu grows by a few lines.           |

**Choice:** each layout item in the Edit menu states what it changes, with the scope from the live selection. A short docs table compares the actions. **Watch:** this is not a user study. The issue's task test remains open.

## Batches

| Batch | Stack layer                             | Closes            |
| ----- | --------------------------------------- | ----------------- |
| Base  | This ledger and `pnpm prove:site`       | none              |
| A     | Space on Editor buttons                 | #306              |
| B     | Docs overlays: search, zoom, stale text | #308, #254's rest |
| C     | Playground load recovery                | #304              |
| D     | One honest New path                     | #305              |
| E     | Layout action scope                     | #307              |
| F     | Narrow Editor save status               | F08's rest        |

Each fix layer adds its journey to `scripts/prove-site.mjs`. The old failure fails without the fix.
