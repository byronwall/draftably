---
origin: repo-reading-brief
source_edition: 2026-11-11
source_url: https://chatgpt.com/space/page_d4988565ae0c8191b525bf50010913df
topic_id: draftably.slot-state-versus-traversal-order.v1
artifact_type: assistant-generated-research
activity_ranking: excluded
repository_baseline: c0f7e7c9c3a23e263502517725f330d52d384c71
inspected_slots_head: 40c1b87a59c44fde3635a379dc1565e08cd6f2e5
experiment_status: proposed-not-run
---

# Slot state and traversal order are separate contracts

## Decision to investigate

When existing diagram items change order, which navigation order should their host controls keep,
and which editing state must survive any target movement? A retained DOM object, a focused input,
an unchanged selection and a meaningful next Tab stop are separate observations.

This is a documentation-only investigation of the explicit tradeoff in open draft
[#539](https://github.com/byronwall/draftably/pull/539), within the host contract owned by
[#526](https://github.com/byronwall/draftably/pull/526). It proposes neither a runtime change nor
an accessibility finding. The platform's state-preserving move primitive is a comparison condition,
not a recommended replacement. All experiments below are unrun.

## What the current work already establishes

The inspected slots head is `40c1b87a59c44fde3635a379dc1565e08cd6f2e5`. It is an open,
unmerged implementation branch, not part of this research branch's main baseline.

- [The anchor layer](https://github.com/byronwall/draftably/blob/40c1b87a59c44fde3635a379dc1565e08cd6f2e5/src/runtime/anchors.ts#L110-L175)
  ranks newly created targets using the geometry's node, group and edge enumeration. An existing
  target of the same kind keeps its element and is not moved in the DOM. Its box changes instead.
  The PR explicitly records that a later reorder retains old target order to protect focus.
- [The slot proof](https://github.com/byronwall/draftably/blob/40c1b87a59c44fde3635a379dc1565e08cd6f2e5/scripts/prove-slots.mjs#L192-L205)
  checks initial target order against a different host-child order.
  [Its update case](https://github.com/byronwall/draftably/blob/40c1b87a59c44fde3635a379dc1565e08cd6f2e5/scripts/prove-slots.mjs#L297-L359)
  checks a surviving input's focus, selection position and continued typing, target identity,
  relabeling, addition, removal and insertion of a new body. These checks are useful evidence,
  not absent features to propose again. They do not constitute the all-existing-target reorder
  and selection matrix below.
- [Low detail](https://github.com/byronwall/draftably/blob/40c1b87a59c44fde3635a379dc1565e08cd6f2e5/src/runtime/anchors.ts#L197-L214)
  makes the bodies container inert below zoom 0.4 unless full detail is requested. Removed focused
  items have a separate return-to-drawing path. Neither transition should be counted as an ordinary
  surviving-item reorder.

The PR reports 44 plain-DOM checks in each of Chromium, Firefox and WebKit, plus framework and
editor proofs. Those are author-reported results, not reruns by this investigation. Its manual
slot assignment, host-owned light DOM, input marker, accessible names and stable targets stay intact.

## What the readings contribute

Dominic Farolino's [Intent to Ship](https://groups.google.com/a/chromium.org/g/blink-dev/c/YE_xLH6MkRs),
dated November 14, 2024, describes `moveBefore()` as a distinct move operation that preserves such
state as focus, iframe documents and animations. It also expressly excludes preservation of DOM
live ranges, including document text selection. This is a narrower guarantee than preserving every
aspect of an editing session.

The [DOM Standard's move algorithm](https://dom.spec.whatwg.org/commit-snapshots/3e656a58421f173518398d79be387941d457f9ee/#concept-node-move), last updated
November 10, 2026 and inspected November 11, still runs live-range pre-remove steps before moving
the node. It requires the same shadow-including root and applies validity checks to the destination
and reference child. The historical intent's API spelling is not the current API definition.

Noam Rosenthal's [state-preserving move explainer](https://github.com/noamr/dom/blob/spm-explainer/moveBefore-explainer.md#selection)
separates intrinsic element state from ranges spanning tree positions. Its focus discussion also
allows later focus correction when a node becomes hidden or inert. Input/textarea selection metadata
and document `Selection` are not interchangeable; do not infer that every input caret is lost, or
that focused contenteditable text necessarily retains its range. IME composition is another
observation, not a guarantee inferred from the word "focus."

W3C's [Understanding Focus Order](https://www.w3.org/WAI/WCAG22/Understanding/focus-order.html),
inspected November 11, explains SC 2.4.3 in terms of meaning and operability. More than one logical
sequence can be valid. It does not require Tab order to duplicate visual placement. This informative
explanation is not a conformance assessment of Draftably: retained order may be appropriate, while
a visually matched order may still be confusing for a particular task.

The [MDN method reference](https://developer.mozilla.org/en-US/docs/Web/API/Element/moveBefore),
inspected November 11, marks support as limited. Record actual browser versions and native support
in any experiment rather than treating a platform launch or a "Baseline" claim as a supported
product matrix. An `insertBefore()` fallback is not evidence of equivalent state preservation.

## Bounded proposed experiment

Use a developer-only fictional three-card diagram, with stable item IDs A, B and C, on both viewer
and editor. Reuse the existing plain-DOM slot proof's host-owned children and manual assignment.
Keep source edits, host-child edits and target DOM moves distinguishable in the log.

First write the intended navigation relation for two fixtures: independent cards, where several
sequences are acceptable, and a deliberately ordered task with an explicit logical next step.
Geometry enumeration, source declaration order, visual position and task order are recorded
separately. Do not choose an oracle simply because one of them is easiest to inspect.

| Case                         | State before the update                                                       | Change and question                                                                                                                                                                 |
| ---------------------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Surviving input              | B's textarea is focused with a nonempty selection and known direction         | Reorder all existing items, without deleting or replacing their IDs. Does continued typing replace the intended text, and what do Tab and Shift+Tab reach?                          |
| Surviving document selection | B contains a marked contenteditable region with a range across two text nodes | Repeat the same reorder. Record focus and range endpoints independently, including whether the chosen move actually contains those text nodes in the DOM tree.                      |
| Visibility boundary          | Focused B survives by ID                                                      | Cross the existing low-detail threshold, then restore detail. Observe focus correction and the next usable keyboard destination without requiring focus to remain in inert content. |
| Identity boundary            | B has focus                                                                   | Delete B, then add a new B in a later update. Treat deletion/recreation separately from retained identity; retain the existing return-to-drawing behavior as the reference.         |

For the first two cases, compare three isolated conditions: today's retained-target order, ordinary
DOM insertion that changes target order, and native `moveBefore()` where supported and valid.
Use the same A/B/C to B/A/C permutation, explicitly moving B's wrapper before A in both move
conditions. Log the actual operation: rearranging only B's neighbors would not test movement of the
focused target. Reset the fixture and editing state between conditions. Move the same target
wrappers, not framework-owned content. Also retain a small direct-content
control: a range inside a moved DOM subtree is not the same topology as light-DOM content merely
assigned to a moved slot. This distinction prevents transferring the range exception to slotted
content without observing it.

Capture state at the committed update and again after the next rendered frame, before typing or
Tab changes it. Run continued typing and traversal as separately reset probes. Record for each
condition:

1. Exact source, host children, target IDs and target object identities before and after the commit.
2. The focused element through any shadow roots; input value, `selectionStart`, `selectionEnd` and
   `selectionDirection`; document selection anchor/focus nodes, offsets, direction and selected text.
3. Real Tab and Shift+Tab destinations, visible focus and continued typing. Do not replace keyboard
   traversal with a list of DOM children.
4. In a small manual composition pass, the platform, input method, composition events and final text.
   Synthetic key events alone cannot establish native IME behavior.
5. Native API support, browser/OS version, thrown errors and slot-assignment changes. An unsupported
   condition is "not tested," not a fallback pass. Reuse Chromium, Firefox and WebKit coverage without
   claiming those engine tests cover every browser or assistive-technology combination.

Run the plain-DOM comparison first. Only if it changes the decision, repeat the affected case through
one real framework-owned host and a relevant keyboard/screen-reader task. Keep the existing framework
suite as the baseline; do not create four competing wrapper implementations. Any future experiment
implementation belongs in the existing host-contract work and requires its own authorized change.

## Decision and stopping rule

Keep the current policy if it preserves the intended task's logical navigation and editing state.
If traversal is confusing, first document the product's order policy and the specific case that
breaks it. A native move is worth considering only if the exact target topology, supported browser
set and required editing states pass together. Focus retention alone is insufficient. An unsupported
or ambiguous condition remains explicit; no automatic reorder, polyfill or fallback is prescribed.

Stop after this small matrix if the competing policies are equivalent for supported host content,
or if no real host needs dynamic reordering. A feature demonstration does not establish better
usability, a passing keyboard probe does not establish WCAG compliance, and source inspection does
not establish a defect in #539.

## Provenance and non-duplication

Source edition: [Repo Reading Brief, November 11, 2026](https://chatgpt.com/space/page_d4988565ae0c8191b525bf50010913df).
The promotion history, all-state research/keyword PR searches and research branches were checked.
[#511](https://github.com/byronwall/draftably/pull/511) addresses graph-library adapter consumer
contracts, not editing-state preservation when slot targets move. Earlier graph navigation and PDF
reading-order readings do not examine this DOM move/selection boundary. #526 and #539 retain
implementation ownership. The other readings in today's edition remain brief-only.

Assistant-generated research. Exclude this document, branch, PR, commits and any derivative merge
from future independent activity ranking. Later independent feedback, implementation or evaluation
is a separate signal. No application code, tests, fixtures, dependencies, lockfiles, public guides,
DSL or release settings are changed. Publication does not authorize implementation, merge,
auto-merge or deployment.
