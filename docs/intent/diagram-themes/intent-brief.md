---
title: 'Diagram themes and stronger default styles'
slug: 'diagram-themes'
phase: intent
status: current
last_updated: '2026-10-15'
---

# Diagram themes and stronger default styles

## My read

Diagram Studio should produce diagrams with a deliberate visual identity from the first node. Byron wants professional defaults that feel chosen for this tool. The current pastel colors resemble other diagram tools and do not express a strong point of view. The first improvements should address color choices and the space inside nodes.

The broader goal is to let a diagram match an existing design system without many individual edits. A theme should supply a coherent set of visual choices. It should cover the drawing, including nodes, groups, connections, labels, and canvas. Changing an accent alone will not achieve that outcome if the remaining colors and spacing still clash.

The immediate request is to capture this initiative and propose five initial themes. Those themes should offer useful visual variety while remaining suitable for professional diagrams. They should differ in density, color treatment, and typography. One theme must have an editorial character with serif titles. Exact colors, padding values, theme names, and the recommended default are proposals for visual review. This request does not start implementation.

## What matters most

- Improve the default color choices with a clear visual identity.
- Support additional named colors and numeric shades within each family; use 500 as the default.
- Make node padding deliberate and allow useful variation between themes.
- Let authors adapt diagrams to a design system through a small set of shared choices.
- Offer five coherent starting themes with distinct professional uses.
- Include an editorial theme with serif titles and deliberate type variation across the collection.

## The experience you want

An author starts a diagram and gets a composed result without adjusting each node. The author can choose another theme to change its character. For a branded diagram, they can replace shared colors and spacing instead of editing every object. Authors can add named colors and use lighter or stronger shades within one family to show emphasis or detail.

Theme changes should keep the diagram understandable. Text must remain readable, labels must fit, and connections must still reach node boundaries. Padding must affect actual content space and sizing. It cannot be only a painted effect. A theme should also remain recognizable in an exported diagram.

## Boundaries

Prioritize node interiors and diagram colors. Editor controls, layout algorithms, custom font browsing, animation, and a full visual theme editor are outside this initial proposal. There is no request for a theme marketplace, automatic brand extraction, or a general design-token platform.

Keep diagram appearance separate from the editor's light or dark mode. That separation is a recommendation, not an accepted interface design. A dark diagram should not require dark editor controls.

Do not silently replace authored node sizes or placement when applying a spacing profile. The exact rule for reconciling fixed sizes and padding remains a shaping decision.

## What seems settled

Color and node padding lead this work. The first collection needs five professional themes. One must use serif titles with an editorial treatment. Shades use a numeric scale with 500 as the default. Names, font families, and exact color values remain provisional.

## Current reality that matters

The current theme field selects light or dark mode. Nodes use six fixed color names. Node text space, icon offsets, default sizes, and compiler sizing use separate constants. Group padding already exists, but it does not provide node content padding.

The DSL file owns the theme and style overrides. Agents and humans must be able to override default colors, add named color families and shades, and set padding, radius, and supported typography directly in that file. Viewer edits must write those values back. Reopening, CLI rendering, and export must use the saved declarations. Exact syntax remains an implementation detail.

## Next step after confirmation

Use the [five theme directions](theme-directions.md) and [comparison sheet](theme-preview.svg) to shape the theme model. First prove one palette, padding profile, and title font across sizing, rendering, save/reopen, and export. Then extend the same model to all five themes. The initiative remains planned.
