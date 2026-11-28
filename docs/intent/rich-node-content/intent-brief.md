---
title: "Rich node content"
slug: "rich-node-content"
phase: intent
status: current
last_updated: "2026-10-15"
---

# Rich node content

## My read

Make diagrams carry visual material alongside their relationships and labels. Byron should be able to put screenshots and other images where they explain the graph. An image can support an ordinary node or become a graph node itself. Title icons provide another way to identify nodes quickly.

These are three related capabilities with different jobs. Attachments preserve supporting detail without showing every image on the canvas. Image nodes make the picture the main content. Title icons provide a compact visual cue. The file format must describe each capability so viewer edits and direct source edits produce the same diagram.

For an ordinary node, show a thumbnail of its first attachment. Keep additional images accessible without placing all thumbnails on the graph. Clicking the thumbnail opens an inspection view with pan and zoom. For an image node, the image occupies the node and participates in normal graph positioning and operations. Pasting an image with no selection creates that kind of node.

The Product Grid screenshot illustrates images alongside substantial node text. It is visual inspiration, not a request to copy its full layout. The exact thumbnail position and proportions remain open. Lucide and Phosphor illustrate the breadth wanted from an icon library; neither library is selected yet.

## What matters most

- Paste images with little effort and inspect their useful detail.
- Keep attachments, image nodes, and title icons distinct and understandable.
- Save all supported content through the DSL and local image files.
- Make a large icon library easy to search, browse, and select.

## Boundaries

All three capabilities belong to this initiative. Implementation has not started. This brief does not choose their delivery order.

Images must support filesystem references. Pasted images need a home in an `assets/` folder. Source authors can specify paths relative to the diagram or absolute paths on the machine. Keep existing references when opening and editing a diagram. Provide a separate “Make portable” action that copies referenced images into the diagram's assets and updates the source links. The exact folder arrangement remains a design detail.

Do not infer an image editor, cloud asset service, arbitrary document attachments, or a general rich-text system from this request. Do not treat thumbnail generation as permission to discard original detail.

## What seems settled

- A node can hold multiple images but shows only its first thumbnail.
- Clicking that thumbnail opens image inspection with pan and zoom.
- Pasting with no selection creates an image node.
- Pasting with exactly one ordinary node selected attaches the image to that node.
- Preserve the original image detail. Use a smaller thumbnail on the graph.
- Users can remove attachments and choose which image appears first.
- An image node uses normal graph positioning and node operations.
- A chosen title icon appears on the left side of the node title.
- The icon picker supports name and related-term search plus a browsable grid.
- UI edits and DSL edits must preserve the same content.

General attachment reordering, individual replacement, icon favorites, and recent-icon lists are outside the agreed first version.

## Current reality that matters

The editor already renders image nodes and title glyphs. Its paste handler creates an image node. Existing image insertion downsizes images to a maximum dimension of 2,048 pixels and stores a data URL.

The `.draft` translator rejects images and icons. Its syntax excludes image shapes. The local server currently serves diagram sessions within a workspace folder. These are reuse points and constraints to investigate, not reasons to reduce the requested scope.

## Next step after confirmation

The product question round is complete. The [shape brief](shape-brief.md) and [implementation plan](implementation-plan.md) define the next work. The first proof saves and reopens original image content through a `.draft` file. Portable conversion must preserve its images after moving the diagram folder. Implementation has not started.
