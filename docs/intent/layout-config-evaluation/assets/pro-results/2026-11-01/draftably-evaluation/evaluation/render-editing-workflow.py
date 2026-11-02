#!/usr/bin/env python3
'''Render the proposed editing dispatch as precise, standalone vector artwork.
No product execution, measured layout output, or screenshot is represented here.
'''
from pathlib import Path
from html import escape
import subprocess
import shutil

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'renders'
OUT.mkdir(exist_ok=True)
W, H = 1400, 940
parts = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" role="img" aria-labelledby="title desc">',
    '<title id="title">Proposed Draftably editing dispatch</title>',
    '<desc id="desc">Appearance changes retain geometry; local improvement previews a bounded warm action; direction, format, and structural requests preview an actual source rebuild. Failed or rejected previews keep current. This is a proposed workflow, not a measured hybrid policy.</desc>',
    '<defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10Z" fill="#66758a"/></marker></defs>',
    '<rect width="1400" height="940" fill="#f6f8fc"/>']

def text(x, y, words, size=20, color='#20314a', weight=400, anchor='start'):
    parts.append(f'<text x="{x}" y="{y}" font-family="DejaVu Sans,Arial,sans-serif" font-size="{size}" font-weight="{weight}" fill="{color}" text-anchor="{anchor}">{escape(words)}</text>')

def rect(x, y, w, h, fill='#ffffff', stroke='#cfdae7', radius=16):
    parts.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{radius}" fill="{fill}" stroke="{stroke}" stroke-width="1.5"/>')

def line(x1, y1, x2, y2):
    parts.append(f'<path d="M{x1} {y1} L{x2} {y2}" fill="none" stroke="#66758a" stroke-width="2" marker-end="url(#arrow)"/>')

def card(x, y, title, lines, fill='#ffffff', h=116):
    rect(x, y, 380, h, fill)
    text(x+22, y+34, title, 21, weight=700)
    for i, value in enumerate(lines):
        text(x+22, y+63+i*25, value, 17)

text(60, 58, 'Editing operations need different execution paths', 31, weight=700)
text(60, 94, 'Proposed UI dispatch · current defaults retained · full Advanced and source escapes remain', 19, '#53657c')
rect(520, 130, 360, 66, '#20314a', '#20314a')
text(700, 172, 'Requested edit', 25, '#ffffff', 700, 'middle')
parts.append('<path d="M700 196 V220 H250 V248 M700 220 V248 M700 220 H1150 V248" fill="none" stroke="#66758a" stroke-width="2"/>')
for x in [250, 700, 1150]:
    line(x, 239, x, 258)

lanes = [
    (60, '#e9f4f2', 'Appearance only', ['Color and visual styling', 'No unsolicited arrangement']),
    (510, '#eaf0fb', 'Local arrangement', ['Improve this region', 'Warm action, scoped constraints']),
    (960, '#fff2dd', 'Direction, format, structure', ['Preview a new arrangement', 'Source recipe and explicit intent']),
]
for x, fill, title, lines in lanes:
    card(x, 264, title, lines, fill, 112)
    line(x+190, 378, x+190, 410)

card(60, 418, 'Retain geometry', ['Keep boxes, sides, and route points.', 'The color control tested this', 'in all 12 bases per actual policy.'], h=138)
card(510, 418, 'Respect the current drawing', ['Keep pins, manual regions, and scope.', 'Use the selected bounded action;', 'Separate remains an optional repair.'], h=138)
card(960, 418, 'Compile the actual source', ['Preserve nested recipes and sides.', 'Use real direction and fit semantics;', 'sequence, lanes, and cells stay explicit.'], h=138)
for x in [250, 700, 1150]:
    line(x, 558, x, 588)

card(60, 596, 'Normal appearance review', ['Inspect the style change.', 'Geometry equality is separate', 'from hard validity.'], h=138)
card(510, 596, 'Preview before committing', ['Show current and candidate together.', 'Show movement and hard failures.', 'Do not treat a direction job as repair.'], h=138)
card(960, 596, 'Preview source and geometry', ['Show removed soft refinements.', 'Disclose: fit may change direction.', 'Do not infer success from a setting.'], h=138)
for x in [250, 700, 1150]:
    line(x, 736, x, 764)

card(60, 772, 'Save the appearance edit', ['One Undo step'], '#e9f4f2', 90)
card(510, 772, 'Keep the arrangement', ['Write changed layout; one Undo step'], '#eaf0fb', 90)
card(960, 772, 'Keep the source recipe', ['Save, reopen, and reproduce'], '#fff2dd', 90)
text(700, 907, 'Preview fails or is rejected → keep current and show diagnostics. No measured hybrid-workflow performance is claimed.', 18, '#3c4c63', 400, 'middle')
parts.append('</svg>')
svg = '\n'.join(parts)
(OUT / 'editing-workflow.svg').write_text(svg)
if shutil.which('inkscape'):
    subprocess.run(['inkscape', str(OUT / 'editing-workflow.svg'), '--export-type=png', '--export-filename=' + str(OUT / 'editing-workflow.png')], check=True, capture_output=True)
else:
    print('Standalone SVG written; optional PNG preview requires Inkscape.')
print(OUT / 'editing-workflow.svg')

