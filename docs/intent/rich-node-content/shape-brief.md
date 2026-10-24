---
title: "Rich node content — shape brief"
slug: "rich-node-content"
phase: shape
status: current
last_updated: "2026-10-15"
---

# Rich node content — what we are adding

**Outcome:** Diagrams carry inspectable screenshots, image nodes, and searchable title icons, with content saved in readable files.

**Primary flow:** Select a node → paste screenshots → inspect detail → save and reopen; use “Make portable” before moving the folder.

## Feature scope

```text
Rich node content
├── PLANNED ADDITIONS
│   ├── Image attachments on ordinary nodes
│   │   ├── Paste onto one selected node; append without replacing earlier images
│   │   ├── Show the first thumbnail and a quiet image count
│   │   └── Inspector image list: open, remove, and make first
│   ├── Image inspection
│   │   ├── Full-viewport viewer, fitted on open; pan and cursor-centered zoom
│   │   ├── Previous/next image, image count, fit, actual pixels, and close
│   │   └── Original image detail; keyboard controls and focus return
│   ├── Image nodes
│   │   ├── Paste with no selection; contain the image without cropping
│   │   └── Move, resize, connect, group, pin, copy, and delete like other nodes
│   ├── Title icons
│   │   ├── One icon to the left of the title, using the existing node colors
│   │   └── Searchable, browsable picker with current choice and Remove icon
│   └── File-backed content
│       ├── Pasted originals in assets/; relative and absolute image references
│       ├── DSL edits and viewer edits preserve the same image order and icon
│       ├── Make portable: copy images and update references for this diagram
│       └── Images and icons remain visible in existing drawing exports
└── DEFERRED
    └── Attachment drag reordering/replacement, favorites, and recent icons
```

## Behavior

| Situation | Expected result |
| --- | --- |
| Paste with multiple objects, a group, or an image node selected | Create an image node; do not guess an attachment target. |
| Paste while editing text | Keep normal text-editing behavior. |
| Click a thumbnail | Inspect it without starting a graph drag. Dragging elsewhere still moves the node. |
| Inspect an image node | Use an explicit Open image action or double-click; single-click selects it. |
| Image loads slowly or is missing | Keep node dimensions stable. Show the path and an error in its image slot; allow source correction. |
| Remove an attachment or undo insertion | Change the diagram reference. Keep the original file on disk. |
| Make portable fails to copy an image | Name the failed path; keep existing source links. Do not report completion. |
| Source changes before saving new links | Use the existing conflict flow. Never overwrite the newer source silently. |

## Examples

Proposed DSL syntax; exact spelling remains subject to parser review:

```text
node issue "Layout shift" icon="lucide:bug"
attach issue "assets/grid-before.png"
attach issue "/Users/byronwall/Pictures/grid-after.png"
node capture "Grid screenshot" shape=image image="assets/grid.png"
size capture width=300 height=200
```

Attachment statement order determines the first image. “Make first” changes that order. Paths resolve from the diagram directory. Portable conversion copies originals into its `assets/` folder and rewrites references relative to the diagram. It leaves source images intact. Generated thumbnails are disposable and absent from the DSL.

## Decisions and boundaries

**Appetite:** Extend the current editor and local file workflow. Reuse node operations, source editing, undo, and conflict handling. Build no separate asset manager.

**Interaction:** Keep the canvas and inspector layout. Propose a contained thumbnail below the title, with space included in node geometry. Keep icons beside the title across supported shapes. Image arrival must not trigger layout. The viewer gives the image most of the screen; its compact toolbar stays fixed. The picker is an anchored popover with search above a fixed-size scrollable grid. Arrow keys move focus; Enter selects; Escape closes and restores focus. Show icon names on focus or hover and a clear empty result.

**Key decision:** Store original image files separately from previews. Prove persistence before viewer polish. The compiler uses source-defined dimensions, never image loading, so CLI and browser geometry agree.

Use one bundled icon library with stable names and local search terms. Lucide is the proposed default; verify its catalog and search metadata before selecting the package. It provides [SVG assets and framework packages](https://lucide.dev/guide/). Keep existing interface icons outside this change.

**Boundary:** Target local `.draft` editing first. When no writable diagram exists, offer Save as file before importing images. Do not build a second browser-only asset store. Keep existing supported raster formats; SVG diagram import remains separate. Exported drawings embed their visible images and icon paths. They are not a replacement for the portable diagram folder. Preserve image references in editable export metadata. No cloud storage, image editing, automatic file deletion, recursive workspace packaging, or new general rich-text system.

**First proof:** Open a real temporary diagram with two attached screenshots and one image node.

**Try:** Paste an original larger than 2,048 pixels, save, reopen, inspect at actual pixels, then make an external image portable. Move the folder and reopen it.

**Observe:** Original bytes remain intact, image order survives, geometry stays fixed, and every image resolves after the move.

**Decide:** Proceed to picker and viewer polish only when those checks pass. If persistence or geometry fails, fix that path before adding controls.

See [confirmed intent](intent-brief.md) and [implementation sequence](implementation-plan.md). Implementation has not started.
