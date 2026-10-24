# Viewer feedback, 23 October 2026

A 12½-minute walkthrough of thirteen `deploy/*.draft` diagrams (Modeler's AWS and Railway
deployment docs) in `draftably open`. The recording, transcript and 44 marks are in the
ContextRecorder session `2026-10-23_16-08-41`. The diagram sources were not available when this
was written; the page snapshots (`pages/m*.mhtml`) hold the rendered SVG of each one.

Every request from the recording is listed below with its time, the diagram and where the cause
most likely lives. **PR** names the stacked pull request that takes it; "next" means it is
recorded here and in [NEXT.md](../diagram-quality/NEXT.md) but not fixed in this stack.

## Viewer interaction

| #   | Time       | Request                                                                                               | Cause                                                                                                                                                     | PR  |
| --- | ---------- | ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | --- |
| V1  | 0:10       | Clicking a diagram on the start page (or the files panel) flashes the screen blank.                   | Every switch is a full page load (`location.assign`, plain `href`s); `index.tsx` renders nothing until `launch()` has fetched the workspace and the file. | 4   |
| V2  | 0:25       | **Recent** looks missorted.                                                                           | The sort is right (modified time), but every row reads "Oct 22", so the order looks arbitrary.                                                            | 4   |
| V3  | 0:38       | Diagrams in sub-folders: show how they are organized (a tree).                                        | The list is flat paths.                                                                                                                                   | 5   |
| V4  | 0:56       | The mouse wheel must zoom, not pan; no Cmd needed.                                                    | `onWheel` pans unless Ctrl/Cmd is held.                                                                                                                   | 2   |
| V5  | 1:10       | Zoom feels jumpy; drop Cmd + mouse movement.                                                          | Cmd + hover zoom (`modifierMove`) fires whenever Cmd is down; the wheel factor halves the zoom per notch.                                                 | 2   |
| V6  | 1:22       | Drag the background to pan, drag an object to move it.                                                | Already so; kept.                                                                                                                                         | 2   |
| V7  | 1:40       | Anything that moves when dragged should look interactive.                                             | Shapes and containers have no hover state or grab cursor.                                                                                                 | 3   |
| V8  | 1:50, 2:06 | Moving a container took about five seconds; collapsing felt slow (fast in diagram 10).                | The save (`PUT /api/source`) took 3,037ms; the canvas waits for the recompile.                                                                            | 7   |
| V9  | 2:09       | Animate collapse and expand.                                                                          | Collapse swaps geometry at once.                                                                                                                          | 6   |
| V10 | 4:23, 7:33 | Fit is edge to edge and too close; about 90–95% would be better.                                      | `fitView` pads 40px and allows 120%.                                                                                                                      | 2   |
| V11 | 10:05      | Edges move around while clicking objects.                                                             | Selecting re-derives routes (selection or a zero-length drag reaches the router).                                                                         | 8   |
| V12 | 10:27      | Double-click editing shows a textarea with a scroll bar; edit in place instead.                       | `InlineEditor` is a fixed-size `<textarea>` over the shape.                                                                                               | 9   |
| V13 | 12:03      | A collapsed container's title shifts and sits tight to its header; keep the header text where it was. | The collapsed card lays its title out differently from the open header.                                                                                   | 6   |

## Color

| #   | Time  | Request                                                                                                | Cause                                                         | PR  |
| --- | ----- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------- | --- |
| C1  | 4:01  | Red on green looks like a Christmas tree.                                                              | Agent-chosen families; the skill gives little color guidance. | 10  |
| C2  | 6:49  | Red and blue together, chosen for no reason.                                                           | Same.                                                         | 10  |
| C3  | 6:54  | Red node in a red container: a member must never take its container's color.                           | Nothing stops a member from matching its container's family.  | 10  |
| C4  | 8:15  | Three nested containers in the same red: nest by shading, lighter underneath, smaller emphasis on top. | A nested group gets the same fill as its parent.              | 10  |
| C5  | 9:07  | A poor gray.                                                                                           | Same as C1.                                                   | 10  |
| C6  | 9:21  | Give the agent a legend and show it on screen, so coloring has a schema.                               | No legend in the language.                                    | 11  |
| C7  | 11:24 | A giant stack of colors does not help.                                                                 | Same as C1.                                                   | 10  |

## Edges against containers

| #   | Time  | Request                                                                                                                                         | Cause                                                           | PR  |
| --- | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | --- |
| E1  | 11:20 | Where an edge crosses a container border, the border reads as the stronger line. Break the border under the edge (a halo) or soften the border. | Group borders are a 1.2px saturated stroke; edges have no halo. | 12  |

## Routing and placement

These are engine changes, measured with `pnpm audit:compare` over the corpus, the held-out set
and the examples.

| #   | Time                                     | Diagram            | Request                                                                                                | Cause                                                                                                | PR   |
| --- | ---------------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- | ---- |
| R1  | 2:19, 3:12, 3:24, 5:53, 6:27, 6:36, 8:02 | 01, 02, 05, 06, 08 | Lines enter boxes from the bottom. In a flow, enter on the left or top; leave on the right or bottom.  | Side choice in `routing-engine.js` prices length and bends only; NEXT.md item 1 ("back-side entry"). | 13   |
| R2  | 2:33, 3:36, 6:40                         | 01, 02, 06         | The bottom entries may come from avoiding a group's title band, or an edge label.                      | Title-band avoidance (#71) and label blocks push the route round.                                    | 13   |
| R3  | 2:58, 4:36, 6:00                         | 02, 04, 05         | Circuitous paths ("all these bends just to come in at the top"; "come out the bottom and in the top"). | NEXT.md item 1 (detours).                                                                            | 13   |
| R4  | 5:17                                     | 04                 | An edge to a node outside its container should leave the container and keep going, not run inside it.  | The router treats the source's group interior as free space; nothing prices a run inside a group.    | 14   |
| R5  | 4:59                                     | 04                 | An edge label sits tight against a node; move it along a little.                                       | `placeEdgeLabels` accepts a spot touching a box's padding.                                           | 15   |
| R6  | 7:47, 8:52, 9:52                         | 08, 09, 11         | Excessive crossings; one edge could have run below another and not crossed.                            | Edges are routed one at a time; crossings are not repaired afterwards.                               | next |
| R7  | 10:44                                    | 11                 | A node placed a long way down the flow could sit beside its neighbour.                                 | Rank assignment ignores a single-edge leaf's distance.                                               | next |
| R8  | 12:19                                    | 13                 | Configuration sits between groups; it should sit right of Operator tools, which feeds it.              | Group order in a row ignores edges between siblings' members.                                        | next |

## Stack

1. This assessment.
2. Wheel zooms, Shift + wheel pans, no Cmd + hover zoom, gentler zoom steps, fit at about 92%.
3. Hover and grab cursors on objects that drag.
4. Switch diagrams in the page, without a reload; Recent shows times.
5. Folders in the diagram list.
6. Collapsed containers keep their header; collapse and expand animate.
7. Faster saves after a drag or a collapse.
8. Routes stay put while selecting.
9. Inline title editing in place.
10. Color: members never match their container; nested containers step lighter; skill guidance.
11. A `legend` statement, drawn on the canvas.
12. Softer container borders and an edge halo where a line crosses one.
13. Ports: prefer entering a box's leading side in a flow; price back-side entry.
14. Leave a container before running to an outside target.
15. Edge labels keep clear of boxes.
