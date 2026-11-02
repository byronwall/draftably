---
title: 'PR 221 review: diagram library gaps'
slug: 'diagram-library-coverage'
phase: intent
status: draft
last_updated: '2026-10-30'
---

# PR 221 review

[The plan](plan.md) replaces the recommended order below. Checked on 2026-10-30 against `main` at `dd2abab`. The research baseline is `2995a98`, 118 commits
earlier. I ran the probes below with the real CLI. I did not recheck competitor claims, except
that I recounted the two CSVs and looked at one Graphviz cell.

## Verdict

The direction is sound: depth before breadth, and comparison first. The evidence is stale in two
places, the top defect is under-reported, and the bets bundle work that should be split. The PR
cannot merge today.

## What blocks the PR

| Problem                 | Evidence                                                                                                                       | Fix                                                                       |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| CI `check` fails        | Prettier flags `docs/intent/diagram-library-coverage/README.md`, so the "full `pnpm check` passed" claim does not hold at head | Run Prettier on that file                                                 |
| Merge conflict          | `.prettierignore`: `main` added a narrow public-site rule on the same lines                                                    | Keep the PR's `docs/intent/**/assets/pro-results/**` rule; it covers both |
| Stale pointers          | `summary.md` and `next-steps.md` say the Pro report lives in the ChatGPT conversation, but the originals are now in the repo   | Link to the committed files                                               |
| Stale judgments         | "Attached notes" P and "PDF export" U; BET-04 "start with plain notes"; REC-09 PDF                                             | Mark them as shipped after the baseline, or add a dated correction        |
| Data held twice         | Both CSVs exist in reduced and original form, about 1.5 MB of docs in all                                                      | Keep one set                                                              |
| Operator detail, public | `run.md` records local paths, the Chrome profile, heartbeat IDs and upload-review notes. The repository is public              | Your call. Nothing here is a secret, but it does not help a reader        |

## Finding 1: comparison is worse than the PR says

`compare.ts` was not changed after the baseline. The PR reports `count`. These all print
`No changes.` too:

| Edit between versions                     | CLI says    | Before panel draws                     |
| ----------------------------------------- | ----------- | -------------------------------------- |
| `count=2` → `count=3`                     | No changes. | The new count                          |
| `href` A → B                              | No changes. | The new link                           |
| `note` text and `near=` target            | No changes. | The new note                           |
| Sequence: swap two `edge` lines           | No changes. | **The new message order**              |
| `phase` relabelled and moved to a message | No changes. | The new phase                          |
| `layout root` direction                   | No changes. | The new direction                      |
| `shape=circle` → `shape=diamond`          | 1 changed.  | **A diamond, with the mark "changed"** |

The last two bold rows are the worst cases. The panel titled Before shows the after state, and in
the sequence case nothing warns the reader. In an interaction diagram, order is the meaning.

There are two defects, and they want different fixes:

1. **Silence.** `objectKey` and `edgeKey` list fields by hand, and statements other than `node`,
   `group` and `edge` are not compared at all.
2. **False Before panels.** The merged file holds new values only, and `was=` covers labels only.

**Pushback on the proposed fix.** The PR proposes a policy table that classifies each field, plus
a rule that each new field declares its comparison behavior. A smaller proposal, not yet proven:

- Key each declaration on its canonical parsed line (arguments and sorted attributes) instead of a
  field list. Every present and future attribute then counts by default.
- After the merge, compare the two files statement by statement, including order. Report anything
  that the marks do not explain: `Also changed, not drawn: layout root, phase p, note, message order.`

This closes the silence with little code and needs no gate on later language work, which also
removes BET-01 as a dependency of BET-02, 03 and 04. Faithful old values stay a separate decision.

PR 116 (draft) predicted this defect from reading the code and called it unreproduced. It is now
reproduced. Fold that PR's semantic-signature idea into this work, then close it.

## Finding 2: notes changed BET-04 and BET-03

PR 282 shipped `note "text" near=id side=…`. It differs from what the research assumed:

- A note has no ID, so `compare` cannot match it.
- `near=` takes a node or group. `near=m1` on a message fails with `Unknown node/group m1`.
- It has no leader line, and it never moves the layout. This answers the research's question about
  how a note affects layout.

BET-04's first slice is therefore no longer "add notes". The remainder is much smaller: anchor a
note to a message. `docs/DSL.md` line 258 still says sequence notes are not supported, while
`near=a` on a participant does work, so that sentence needs an update too.

## Finding 3: the bets bundle separable work

BET-02 joins endpoint markers (13 of 15 alternatives), cardinality, typed field rows and named
ports. Only the markers are broad and cheap. Split them:

- **Endpoint markers:** ship alone, with plain edges unchanged.
- **Cardinality and typed rows:** wait for a real schema diagram.
- **Named ports:** cell IDs already cover the field case. Wait for an interface job.

## Finding 4: demand evidence is weak

"J5" job scores cite your supplied examples, not use. Across 93 corpus, held-out and example files:

| Pattern                  | Files |
| ------------------------ | ----- |
| `layout root sequence`   | 1     |
| `layout … cells`         | 4     |
| Change marks             | 1     |
| `compare` line           | 0     |
| PK/FK text               | 0     |
| Cardinality-style labels | 0     |

Three more `.draft` files exist in other local projects, and they use none of these. The corpus
was built to stress layout, so this is a weak signal. Still, nothing in the PR shows demand
beyond competitor frequency, which the prompt warned about. The research also never weighs features
against [the quality backlog](../diagram-quality/NEXT.md), which is the work with real evidence.

## Finding 5: the matrix flatters the top differentiator

Draftably scores N on "Aligned before / after semantic panels", while the same PR's lead finding
is that those panels can mislead. Finding 1 suggests P. The claim that no base has this natively
also depends on the research's own definition: 14 alternatives could build it. It is a reason to
protect the feature, not proof that people want it.

## Smaller notes

- A phase with `m1 m3` passes `check` with `m2` between them, so the research's point stands: a
  band can enclose a message that is not listed. Do not build fragments on `phase` as it is.
- `kind=data` parsed but did nothing at this review. On 2026-11-01, `check` rejects it.
- Unquoted `href=https://…` silently loses its path, because `//` starts a comment. `check` does
  not catch it. This is a separate, small bug.
- PR 28 (rich nodes) is planning only, 15 days old, and covers images and icons. It overlaps the
  deferred end of BET-04. There is no conflict until that work starts.

## Recommended order (proposal)

1. Refresh and land PR 221, with the fixes above.
2. Comparison honesty: no silent differences, and sequence order counts. No new grammar.
3. Decide the Before panel promise, then build it.
4. Endpoint markers, alone.
5. Notes on messages, then one flat `alt` with its own interval rule.

Below the line for now: typed field rows, cardinality, named ports, views, rich text, icons.
