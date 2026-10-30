---
title: 'Diagram themes — texture research'
slug: 'diagram-themes'
phase: research
status: current
last_updated: '2026-10-26'
---

# Textured themes: research

Byron's voice memo (Oct 26) says the themes are "good, not great". He asks for a more opinionated base
style: a neutral but textured background, a little texture on shapes and edges, a hint of embossed
depth, and some planned variation in stroke width. The goal is a look that is clearly draftably.

He chose to ship this as a new theme first. The five current presets stay as they are.

The [sample sheet](texture-preview.svg) draws the four finalists with the technique this note
recommends. It is a hand-written concept SVG, not output from the renderer.

## Twenty directions

Each direction changes four things: the ground (paper), the inks (palette), the texture technique and
the depth treatment.

| #   | Direction          | Ground                | Inks                          | Texture technique           | Depth                        |
| --- | ------------------ | --------------------- | ----------------------------- | --------------------------- | ---------------------------- |
| 1   | Cotton letterpress | Warm off-white cotton | Navy, vermilion               | Fine noise grain            | Debossed lines               |
| 2   | Blueprint          | Prussian blue         | White chalk, amber, mint      | Faint grid + chalk dust     | None                         |
| 3   | Kraft              | Brown kraft           | Black ink, white gouache      | Long fibers                 | None                         |
| 4   | Washi              | Pale fibrous paper    | Sumi black, indigo, persimmon | Stretched fiber noise       | None                         |
| 5   | Engineering pad    | Pale green            | Graphite, red pencil          | Ruled grid                  | None                         |
| 6   | Risograph          | Off-white             | Fluoro pink, teal, blue       | Heavy grain, halftone fills | 1px misregistration          |
| 7   | Blind emboss       | White on white        | One accent only               | None                        | Raised nodes, embossed edges |
| 8   | Chalkboard         | Dark slate            | Chalk pastels                 | Chalk dust                  | None                         |
| 9   | Newsprint          | Gray newsprint        | Black, one red                | Halftone dots               | None                         |
| 10  | Vellum             | Light gray            | Cool pastels                  | Frosted layers              | Translucent stacked groups   |
| 11  | Bookcloth          | Woven linen           | Deep green, oxblood           | Crosshatch weave            | Foil-stamped titles          |
| 12  | Cyanotype          | Sun-print blue        | Monochrome white              | Blotchy exposure grain      | None                         |
| 13  | Phosphor           | Near-black            | Green, amber                  | Scanlines                   | Glow                         |
| 14  | Swiss print        | Flat white            | Black, red                    | None                        | None                         |
| 15  | Museum card        | Cool gray board       | Muted gallery tones           | Very fine grain             | Soft bevel                   |
| 16  | Watercolor         | Cold-press paper      | Washes that bleed             | Wash edges                  | None                         |
| 17  | Fieldnotes+        | Existing warm paper   | Existing forest, clay         | Grain                       | Subtle deboss                |
| 18  | Ledger             | Cream                 | Green ink, red                | Faint ruling                | None                         |
| 19  | Die-cut card       | Neutral               | Colored card stock            | None                        | Raised cut cards, shadow     |
| 20  | Pencil sketch      | White sketch paper    | Graphite                      | Jittered hand-drawn strokes | None                         |

## Comparison

The dimensions come from the memo and from [FEEL.md](../diagram-quality/FEEL.md):

- **Recognizable** means a stranger can tell a draftably diagram at thumbnail size.
- **Label legibility** covers 11px connection labels and 13px titles on the textured ground.
- **Four roles** means the palette carries two to four meaning colors plus neutrals, as FEEL.md asks.
- **Export survival** covers SVG and PNG from the CLI, plus downscaled PR and doc thumbnails, where
  fine texture turns to mush or moiré.
- **Change marks** means the `+ - ~` diff colors and future emphasis states still read clearly on it.
- **Restraint** is the memo's "just a hint": texture you feel, not texture you notice first.

Scores run from 0 (fails) to 10 (strong). They are design judgments, not measurements.

| #   | Direction          | Recognizable | Label legibility | Four roles | Export survival | Change marks | Restraint | Note                                        |
| --- | ------------------ | -----------: | ---------------: | ---------: | --------------: | -----------: | --------: | ------------------------------------------- |
| 1   | Cotton letterpress |            8 |                9 |          8 |               8 |            8 |         8 | Strongest base; deboss is cheap in SVG      |
| 2   | Blueprint          |            9 |                8 |          7 |               9 |            6 |         7 | Best dark option; red/green diff needs care |
| 3   | Kraft              |            8 |                7 |          5 |               6 |            5 |         5 | Brown ground mutes accents                  |
| 4   | Washi              |            8 |                8 |          7 |               6 |            7 |         6 | Fibers must stay faint                      |
| 5   | Engineering pad    |            6 |                8 |          6 |               7 |            6 |         6 | Grid fights the layout's own alignment      |
| 6   | Risograph          |            9 |                6 |          7 |               6 |            4 |         3 | Loud; halftone hurts text                   |
| 7   | Blind emboss       |            7 |                9 |          2 |               7 |            3 |        10 | Too few colors for meaning                  |
| 8   | Chalkboard         |            7 |                6 |          6 |               5 |            5 |         4 | Novelty; chalk text is hard to read         |
| 9   | Newsprint          |            6 |                6 |          3 |               5 |            4 |         5 | Halftone moirés when downscaled             |
| 10  | Vellum             |            6 |                7 |          7 |               5 |            6 |         7 | Transparency stacks muddy nested groups     |
| 11  | Bookcloth          |            7 |                6 |          6 |               4 |            5 |         4 | Weave moirés badly at thumbnail size        |
| 12  | Cyanotype          |            8 |                7 |          2 |               7 |            2 |         6 | Monochrome cannot carry roles or diffs      |
| 13  | Phosphor           |            6 |                6 |          4 |               6 |            4 |         3 | Off-brand for editorial diagrams            |
| 14  | Swiss print        |            3 |               10 |          6 |              10 |            9 |         9 | Clean control, not distinct (≈ Graphite)    |
| 15  | Museum card        |            6 |                9 |          7 |               8 |            8 |         9 | Elegant, but cool gray reads as generic     |
| 16  | Watercolor         |            7 |                5 |          6 |               4 |            4 |         4 | Bleeding fills blur node edges              |
| 17  | Fieldnotes+        |            6 |                9 |          7 |               8 |            7 |         8 | Safe upgrade, not new                       |
| 18  | Ledger             |            5 |                8 |          5 |               7 |            6 |         7 | Ruling reads as a table                     |
| 19  | Die-cut card       |            7 |                9 |          8 |               8 |            7 |         7 | Raised cards give hierarchy for free        |
| 20  | Pencil sketch      |            8 |                6 |          3 |               6 |            4 |         4 | Excalidraw look; jitter hurts precision     |

The table drops these directions:

- **Blind emboss, Cyanotype and Newsprint** have too few colors to carry meaning or diffs.
- **Bookcloth, Newsprint and Watercolor** break down when downscaled or exported.
- **Pencil sketch and Chalkboard** look like other tools or like novelties.

## Combined set

Five themes, each a hybrid of the strongest parts above:

| Theme                          | Built from                                                       | Role                                                 |
| ------------------------------ | ---------------------------------------------------------------- | ---------------------------------------------------- |
| **Pressed** (new, build first) | 1 Cotton letterpress + 7 deboss + 19 raised cards + 15 restraint | The signature look and the future default            |
| **Blueprint** (new)            | 2 Blueprint + 12 grain                                           | Textured dark theme; may later replace flat Midnight |
| **Kraft** (upgrade Fieldnotes) | 4 Washi fibers + 17 Fieldnotes palette + 3 sumi ink weight       | The warm editorial theme with real paper             |
| **Riso** (later, optional)     | 6 Risograph, toned down                                          | Presentation and blog diagrams only                  |
| **Graphite** (keep flat)       | 14 Swiss print                                                   | Dense maps, and hosts that recompress images         |

**Choice:** build Pressed first as its own preset, then Blueprint, then fold the Kraft paper into
Fieldnotes. Riso waits until someone asks for it.

**Why:** Pressed scores high on every dimension and is the closest match to the memo ("embossed in
really nice paper", "a hint of depth on the lines"). Blueprint covers the dark case, which flat
Midnight leaves without texture.

**Watch:** texture that looks rich at 2× turns to noise at thumbnail size. Check every theme at 0.5×.

## Pressed: the spec to build

- **Ground:** `#F4F1EA` with the four-layer paper recipe below, in a 256px tile.
- **Cards:** neutral cards use `#FBF9F4` with the two tooth layers only, at about half strength. Each
  has a 1px `#CFC8BA` border and a soft drop shadow (`#5A4A30` at 0.16, 0.7 blur, 1.2px down).
- **Inks:** ink `#2B2E33`, oxblood `#7A2E2A`, pine `#2F5446`, plus one ochre for a fourth role. Fill
  text is light on oxblood and pine.
- **Debossed lines:** draw each edge and group frame twice. First draw a white highlight at 0.7
  opacity, offset 0.8px down (or right, for vertical runs). Then draw the ink line on top. This needs
  no lighting filter, so it costs little and survives export.
- **Stroke weight by role:** about 1.25 for side branches, 1.55 for the main path, 1.75 for exits. It
  is planned variation, not random jitter. Derive the role from the layout (main run versus branch)
  rather than asking the author.
- **Titles:** serif titles (Georgia-class, from the vendored faces) and sans connection labels.

## The fine paper recipe

Byron asked for the finest, most subtle textures possible. One layer of gray noise looks like a
screen effect. Real paper has three properties, so the ground uses four quiet layers. All are
`feTurbulence` with `stitchTiles="stitch"` and `color-interpolation-filters="sRGB"`, inside a 256px
pattern tile:

| Layer       | What it imitates                                  | `baseFrequency`                | Color           | Opacity in Pressed |
| ----------- | ------------------------------------------------- | ------------------------------ | --------------- | -----------------: |
| Formation   | How the fibers settled: a soft, large mottle      | 0.011, 3 octaves               | Warm brown      |               0.13 |
| Dark tooth  | Shadow side of the paper's surface                | 1.85, 2 octaves                | Warm dark brown |               0.32 |
| Light tooth | Lit side of the surface, offset from the dark one | 1.6, 2 octaves                 | Near-white      |               0.55 |
| Inclusions  | Rare specks in cotton paper                       | 0.9, thresholded to the top 5% | Brown           |               0.35 |

What the iterations showed (sample sheet versions 1 to 3):

- **The tooth must be two-tone.** Warm dark specks with offset light specks read as paper. Black
  noise alone reads as dirt or a screen effect.
- **Formation is the easiest layer to overdo.** At 0.5 opacity it looked like water stains. It reads
  as paper only at about 0.12–0.16. The formation layer should be felt, not seen.
- **Tint the noise with the ground's own hue.** Neutral gray noise on a warm ground looks cold and
  dirty.
- **Use the alpha channel for intensity.** The color matrix maps noise to alpha with a steep slope and
  a negative offset (`2.4 … -1.25`), so only the noise peaks show. The ground stays clean between
  them.
- **Fibers must be short.** A long, stretched fiber noise (`0.006 0.55`) looked like wood grain.
  `0.035 0.6` at 0.16 opacity reads as washi.
- **Make depth smaller than you first think.** A deboss highlight at 0.7 and a 0.16 shadow look
  pressed; anything stronger looks like a button.
- Blueprint uses formation plus a fine cool chalk tooth (1.9) at 0.10, and a 32px grid at 0.10 with a
  128px major grid at 0.12.

## Rules for building any textured theme

These come from the sample sheet and from how `src/cli/svg.ts` draws today:

1. **The texture is a `<pattern>` in diagram space, not a filter on the background rect.** Every edge
   draws an 8px halo in the canvas color ([svg.ts:99](../../../src/cli/svg.ts)), and every edge label
   sits on a canvas-colored box ([svg.ts:105](../../../src/cli/svg.ts)). With a flat `look.canvas`
   fill these show as smooth strips on the paper. Fill them with `url(#ground)` so they match the
   paper underneath.
2. **Inside a tinted group, a label box needs the group's tint too.** The sample sheet showed a
   visible patch where the "miss" label box used the bare ground inside a tinted group. Draw the box
   as the ground pattern plus the group's tint, or skip the box and use a halo of the same fill.
3. **Use `feTurbulence` with `stitchTiles="stitch"` inside a pattern tile of 256px or more.** Smaller
   tiles show repeats, and unstitched noise shows seams.
4. **Keep texture off text.** Halftone or grain behind a 13px label hurts reading, as Riso's
   "Read version" showed. Fills that hold text stay solid or carry grain under about 0.2 opacity.
5. **The viewer must use the same defs as the CLI SVG.** One `textureDefs(look)` helper should
   feed both renderers, so exports match the screen.
6. **Diff and emphasis colors stay solid.** Added, removed and changed marks never get texture, so the
   meaning reads before the style.
7. **Check every theme at 0.5× and at 2×,** and after a PNG round trip through a GitHub comment,
   which recompresses images.

## Not covered

- Font choice for Pressed beyond "serif titles". The vendored faces in `src/model/fonts.ts` set the
  options.
- Performance of `feTurbulence` in the viewer on large diagrams. Measure it on the biggest corpus
  file before shipping. If it is slow, render the tile once to a data URL.
- How Riso's misregistration would interact with change-mark outlines.
