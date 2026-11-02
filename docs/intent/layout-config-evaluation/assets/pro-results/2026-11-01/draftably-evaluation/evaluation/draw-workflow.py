"""Draw the exact evaluation workflow; diagram geometry is not engine output."""
from pathlib import Path
from xml.sax.saxutils import escape

root=Path(__file__).resolve().parents[1]
out=root/'renders/analysis'
out.mkdir(parents=True,exist_ok=True)
parts=['<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1050" viewBox="0 0 1200 1050">',
       '<defs><marker id="arrow" markerWidth="9" markerHeight="9" refX="7" refY="4" orient="auto"><path d="M0 0L8 4L0 8Z" fill="#62758a"/></marker></defs>',
       '<rect width="1200" height="1050" fill="#f5f8fb"/>',
       '<style>text{font-family:DejaVu Sans,sans-serif;fill:#172b43}.title{font-size:30px;font-weight:700}.head{font-size:21px;font-weight:700}.body{font-size:17px}.small{font-size:15px}.arrow{fill:none;stroke:#62758a;stroke-width:2.4;marker-end:url(#arrow)}</style>']

def label(x,y,text,cls='body',anchor='start',fill=None):
    style=f' style="fill:{fill}"' if fill else ''
    parts.append(f'<text x="{x}" y="{y}" class="{cls}" text-anchor="{anchor}"{style}>{escape(text)}</text>')
def box(x,y,w,h,title,lines,fill='#ffffff',stroke='#c7d5e3'):
    parts.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="13" fill="{fill}" stroke="{stroke}" stroke-width="1.5"/>')
    label(x+20,y+32,title,'head')
    for i,line in enumerate(lines): label(x+20,y+62+i*25,line)
def arrow(points):
    parts.append('<path class="arrow" d="'+' '.join(('M' if i==0 else 'L')+f'{x} {y}' for i,(x,y) in enumerate(points))+'"/>')

label(46,52,'Draftably: from immutable source to a bounded recommendation','title')
label(46,82,'Actual shipped algorithms • frozen decisions • failures retained • no product changes','body')
box(46,116,535,126,'Immutable source',[
    'Commit f14d9b891adba75de6cc172b190017ea5a5ca091',
    '451 original files verified; production compiler and renderer',
    'Separate stock checks and real browser flow evidence'])
box(619,116,535,126,'Corpus and user jobs',[
    '72 bases / 12 families / 5 preference profiles',
    '48 development + 24 genuinely new heldout cases',
    '24 edit bases; frozen routing fixtures; explicit constraints'])
parts.append('<path d="M313 242V267H886V242 M221 267H979" fill="none" stroke="#62758a" stroke-width="2.4"/>')
for x in [221,600,979]: arrow([(x,267),(x,293)])
box(46,295,350,146,'Cold source rebuilds',[
    '10 engines; meaningful directions',
    'Native recipes kept separate',
    'Full compile → route → labels',
    'Defaults + bounded preset search'])
box(425,295,350,146,'Warm editing',[
    'Shared prior positions and ports',
    'Pins, manual flags and scope',
    'Local repair vs global reflow',
    'Color controls retained'])
box(804,295,350,146,'Routing experiments',[
    'Fixed positions; 12 parameters',
    'Six interaction grids and ports',
    'Layout × routing cross-check',
    'History isolated by candidate'])
parts.append('<path d="M221 441V455H979V441 M600 441V455" fill="none" stroke="#62758a" stroke-width="2.4"/>')
arrow([(410,455),(410,467)])
arrow([(979,455),(979,467)])
box(46,469,729,144,'Hard validity before soft quality',[
    'Objects, connections, finite geometry, pins, sides and supported scope',
    'Then visible score components, area, length, movement and runtime',
    'First terminal attempt wins; timeout checkpoints stay partial',
    'Metric coverage gaps remain explicit, with separate diagnostic audits'],fill='#eaf2fb')
box(804,469,350,144,'Visual review',[
    'Production SVG + browser PNG',
    'Matched, shuffled A/B pairs',
    'Judgments sealed before keys',
    'Single expert model; not users'],fill='#eaf2fb')
arrow([(410,613),(410,641),(600,641),(600,667)])
arrow([(979,613),(979,641),(600,641)])
box(46,669,1108,96,'Freeze boundary — before heldout execution',[
    'Metrics, practical bands, subsets, presets, selector trees, dependencies and routing choices sealed by hash',
    'Oracle availability is kept separate from a pre-layout selector and from user choice effort'],fill='#e4f3ed',stroke='#7ba995')
arrow([(600,765),(600,779),(313,779),(313,791)])
box(46,793,535,150,'Fresh heldout assessment',[
    'Apply frozen choices once; no refitting',
    'Common-job coverage + specialist escape + hard regressions',
    'Cluster uncertainty by base or family',
    'Heldout visual disagreements do not rewrite scores'])
box(619,793,535,150,'Decision and handoff',[
    'Default changes require the original 95% coverage gate',
    'Separate UI disclosure from implementation deletion',
    'Exact inventory + staged implementation plan',
    'Reports, raw outcomes, source and replay commands'])
arrow([(581,864),(617,864)])
label(46,983,'Measurement boundaries','head')
label(46,1012,'Synthetic frequencies are not market prevalence. Cloud time is not desktop latency. Oracle wins are not automatic choices.','body')
parts.append('</svg>')
svg=out/'evaluation-workflow.svg';svg.write_text('\n'.join(parts)+'\n')
print(svg)
