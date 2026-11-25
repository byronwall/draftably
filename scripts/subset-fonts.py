"""
Rebuild the bundled diagram fonts from the upstream variable fonts.

Writes each face twice: WOFF2 in `src/assets/fonts` (embedded in SVG) and TrueType in
`src/cli/fonts` (resvg for PNG, PDFKit for PDF). Neither export path falls back to a system font,
so every character a label may use must be in the face itself.

Each face is the variable font pinned at its weight, subset to the Latin range plus arrows, box
drawing, geometric shapes and check marks. A symbol a face lacks is copied from Inter, scaled to
the face's em, so all three roles draw the same set.

Usage:
  uv run --with fonttools --with brotli python scripts/subset-fonts.py
  node scripts/font-metrics.mjs   # then update fontMetricsVersion in src/model/font-faces.ts
"""

import pathlib
import urllib.request

from fontTools.pens.transformPen import TransformPen
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.subset import Options, Subsetter
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

ROOT = pathlib.Path(__file__).resolve().parent.parent
CACHE = ROOT / "tmp/font-src"
# google/fonts at a fixed commit, so a rebuild gives the same bytes.
UPSTREAM = "https://raw.githubusercontent.com/google/fonts/83c62e30d87daa70216dab6b984d00d20d96d585/ofl"
SOURCES = {
    "Inter": "inter/Inter%5Bopsz,wght%5D.ttf",
    "Source Serif 4": "sourceserif4/SourceSerif4%5Bopsz,wght%5D.ttf",
    "JetBrains Mono": "jetbrainsmono/JetBrainsMono%5Bwght%5D.ttf",
}

# The Latin range of the earlier Fontsource subsets, then the symbol blocks diagram labels use.
LATIN = [(0x0000, 0x00FF), (0x0131,), (0x0152, 0x0153), (0x02BB, 0x02BC), (0x02C6,), (0x02DA,),
         (0x02DC,), (0x0300, 0x0301), (0x0303, 0x0304), (0x0308, 0x0309), (0x0323,),
         (0x0329,), (0x0102, 0x0103), (0x2000, 0x206F), (0x20AC,), (0x2122,),
         (0x2191,), (0x2193,), (0x2212,), (0x2215,), (0xFEFF,), (0xFFFD,)]
SYMBOLS = [(0x2190, 0x21FF), (0x2500, 0x257F), (0x25A0, 0x25FF), (0x2713, 0x2718)]
# Symbols every face must draw; ones a face lacks are copied from Inter.
REQUIRED = "→←↑↓↔◆◇■□●○▲▼✓✗"

# Layout features each face keeps: the ones the earlier subsets carried.
FEATURES = ["ccmp", "locl", "mark", "mkmk", "kern", "frac", "numr", "dnom", "pnum", "tnum"]
FACES = [
    # (file stem, family, style, weight, features beyond FEATURES)
    ("inter-latin-500-normal", "Inter", "Medium", 500, ["calt"]),
    ("inter-latin-600-normal", "Inter", "SemiBold", 600, ["calt"]),
    ("source-serif-4-latin-600-normal", "Source Serif 4", "SemiBold", 600, ["liga"]),
    ("jetbrains-mono-latin-500-normal", "JetBrains Mono", "Medium", 500, ["calt"]),
]


def source(family):
    path = CACHE / pathlib.Path(SOURCES[family]).name.replace("%5B", "[").replace("%5D", "]")
    if not path.exists():
        CACHE.mkdir(parents=True, exist_ok=True)
        urllib.request.urlretrieve(f"{UPSTREAM}/{SOURCES[family]}", path)
    return TTFont(path)


def codepoints():
    out = set()
    for r in LATIN + SYMBOLS:
        out.update(range(r[0], r[-1] + 1))
    return out


def instance(family, weight):
    font = source(family)
    axes = {a.axisTag: a.defaultValue for a in font["fvar"].axes}
    axes["wght"] = weight
    # The earlier static faces were cut at the 14 pt optical size; it keeps every advance width.
    if "opsz" in axes:
        axes["opsz"] = 14
    return instancer.instantiateVariableFont(font, axes)


def borrow(font, donor, chars):
    """Copy `chars` that `font` lacks from `donor`, scaled to `font`'s em and centred in its
    advance when `font` is monospaced."""
    cmap = font.getBestCmap()
    donor_cmap = donor.getBestCmap()
    scale = font["head"].unitsPerEm / donor["head"].unitsPerEm
    mono = font["post"].isFixedPitch
    width = font["hmtx"]["zero"][0] if mono else None
    glyphs = donor.getGlyphSet()
    for ch in chars:
        cp = ord(ch)
        if cp in cmap or cp not in donor_cmap:
            continue
        src = donor_cmap[cp]
        adv, _ = donor["hmtx"][src]
        # A wide symbol shrinks to fit the monospaced cell, so it never overlaps its neighbours.
        size = min(scale, width / adv) if mono else scale
        shift = (width - adv * size) / 2 if mono else 0
        pen = TTGlyphPen(None)
        glyphs[src].draw(TransformPen(pen, (size, 0, 0, size, shift, 0)))
        glyph = pen.glyph()
        name = f"uni{cp:04X}"
        font.setGlyphOrder([*font.getGlyphOrder(), name])
        font["glyf"][name] = glyph
        glyph.recalcBounds(font["glyf"])
        font["hmtx"][name] = (width if mono else round(adv * scale), glyph.xMin)
        for table in font["cmap"].tables:
            if table.isUnicode():
                table.cmap[cp] = name
        print(f"  borrowed {ch} from {donor['name'].getDebugName(16) or donor['name'].getDebugName(1)}")


def name_face(font, family, style, weight):
    names = font["name"]
    full = f"{family} {style}"
    for nid, value in {1: full, 2: "Regular", 4: full, 6: full.replace(" ", ""),
                       16: family, 17: style}.items():
        names.setName(value, nid, 3, 1, 0x409)
        names.setName(value, nid, 1, 0, 0)
    font["OS/2"].usWeightClass = weight


def main():
    donor = instance("Inter", 500)
    keep = codepoints()
    for stem, family, style, weight, extra in FACES:
        print(stem)
        font = instance(family, weight)
        borrow(font, donor, REQUIRED)
        options = Options()
        options.layout_features = FEATURES + extra
        options.name_IDs = ["*"]
        options.name_languages = ["*"]
        options.notdef_outline = True
        options.glyph_names = False
        sub = Subsetter(options)
        sub.populate(unicodes=keep & set(font.getBestCmap()))
        sub.subset(font)
        name_face(font, family, style, weight)
        missing = [ch for ch in REQUIRED if ord(ch) not in font.getBestCmap()]
        if missing:
            raise SystemExit(f"{stem} lacks {''.join(missing)}")
        # Keep the source's dates, so a rebuild writes the same bytes.
        font.recalcTimestamp = False
        font.flavor = None
        font.save(ROOT / "src/cli/fonts" / f"{stem}.ttf")
        font.flavor = "woff2"
        font.save(ROOT / "src/assets/fonts" / f"{stem}.woff2")
        print(f"  {len(font.getBestCmap())} characters")


main()
