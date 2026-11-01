# Published-site browser observations

Observed on **1 November 2026** at <https://draftably.dev>. These are interactions with the hosted deployment, not proof that its code equals the pinned source packet. They were checked separately from local CLI/model execution and the offline artifact viewer.

| Page | Actual interaction | Observed result | Boundary |
| --- | --- | --- | --- |
| `/docs/layout-engines` | Read the lesson/table; changed the editable engine from compound-flow to boundary-align; opened Expand, closed it, and used Reset | One editable graph and a ten-engine table. The edited SVG changed from viewBox1060×356 to1277×560 with the same labels. Expand rendered the drawing and Reset restored the original input. | This live example omits the attached comparison's title, so its frame is46 units shorter than the titled1060×402 /1277×606 packet graph. Do not compare those heights as an engine regression. |
| `/docs/routing` | Read both editable examples; changed crossing-penalty900 to2000; used Reset | The editor displayed `Line 9: Expected crossing-penalty from 0 to 1200; got 2000.` The valid state returned after Reset. | This checks a real range error and recovery, not every router value or native routing menu. |
| `/docs/layout-tools` | Read the prose and control table | The inspected page explains operations with prose/table, without editable examples for the operation families. | Read-only observation; no native Editor pass/Compare/brush lifecycle was exercised here. |
| `/docs/sequence-diagrams` | Read three editable examples; inserted a self-message `edge m3 app -> app "load profile"` between existing messages; used Reset | The added label appeared between the original messages; the viewBox changed416×288→451×346 and Reset restored it. | Shows the hosted live example responds to source order and a self-message. It is not the pinned model fixture's measured output. |
| `/docs/swim-lanes` | Read the lesson and editable example | One editable example inspected. | No lane edit claimed. |
| `/docs/cells` | Read the lesson and four editable examples | Four editable examples inspected. | No cell edit claimed. |

The source review established the navigation/reference derivation and `draft` fence mechanism independently. Browser inspection did not replace the compiler/registry audit.

## Distinct local viewer proof

The delivered `atlas-preview.html` was later tested in a downloaded stable Chrome Headless Shell. That proof visits all109 groups and source/native variants, checks paired world-coordinate frames, tests search, original-SVG download fidelity, keyboard selection and390px layout, and records screenshots in [preview-qa/](preview-qa/). It is a proof of the **delivered artifact viewer**, not a screenshot or lifecycle proof of Draftably's native Editor. The 24 native operation results are real model executions rendered by Draftably; gesture, Undo, save/reopen, Compare Apply staleness and session hold behavior remain explicit integration proof tasks.
