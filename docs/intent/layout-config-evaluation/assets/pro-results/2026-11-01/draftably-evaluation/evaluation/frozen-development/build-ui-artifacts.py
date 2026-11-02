"""Generate declared UI task proxies and a precise light-mode proposal wireframe."""
from pathlib import Path
import json,csv,html
OUT=Path(__file__).resolve().parents[1]
(OUT/'data').mkdir(exist_ok=True); (OUT/'renders').mkdir(exist_ok=True)
jobs=[
('J01','First architecture render','common','Valid source with groups is opened; accept first automatic render if it meets the job. No controls need opening.',
 [],[],[],[0,0,0],[0,0,0]),
('J02','Shorten a long pipeline','common','Pipeline is too wide; candidate with wrapping is accepted at first preview if valid.',
 ['Open Layout menu','Open Automatic layout','Open Advanced layout settings','Choose Layered + fold','Open Approach controls','Set Long sequences to Fold to target aspect','Preview automatic layout','Keep layout'],
 ['Open Arrange','Choose Compact overview','Choose Format: Slide','Preview','Keep'],
 ['Open Arrange','Choose Format: Slide','Preview','Keep'],[3,3,2],[2,1,0]),
('J03','Change reading direction','common','Request explicitly asks top-to-bottom; global movement is intended.',
 ['Open Layout menu','Open Automatic layout','Choose Top to bottom','Preview automatic layout','Keep layout'],
 ['Open Arrange','Choose Top to bottom','Preview','Keep'],
 ['Open Arrange','Choose Top to bottom','Preview','Keep'],[2,2,2],[0,0,0]),
('J04','Remove a crossing','common','Positions stay fixed; first fewer-crossings preset accepted only if it actually improves the crossing without hard defects.',
 ['Open Layout menu','Open Routing options','Choose Fewer crossings'],
 ['Open Connections','Choose Fewer crossings','Preview','Keep'],
 ['Open Connections','Choose Fewer crossings','Preview','Keep'],[1,2,2],[0,0,0]),
('J05','Space crowded fan-out','common','Routes crowd an endpoint; first prescribed wider-spacing attempt only, not claimed successful.',
 ['Open Layout menu','Open Routing options','Set Port spacing to 24','Set Parallel edge gap to 24','Set Spread fan-out to 120'],
 ['Open Connections','Choose More room','Preview','Keep'],
 ['Open Connections','Choose More room','Preview','Keep'],[3,2,2],[3,1,1]),
('J06','Preserve a hand-tuned region','common','Exact region protection requested; region selected explicitly, adjacent movable siblings then selected.',
 ['Select protected region','Pin selection','Select affected siblings','Tidy positions'],
 ['Select protected region','Pin selection','Select affected siblings','Improve'],
 ['Select protected region','Pin selection','Select affected siblings','Improve'],[2,2,2],[0,0,0]),
('J07','Fit a slide','common','Request exact source fit=slide behavior, not approximately1.6aspect.',
 ['Open source editor','Add fit=slide to root layout','Save source'],
 ['Open Arrange','Choose Format: Slide','Preview','Keep'],
 ['Open Arrange','Choose Format: Slide','Preview','Keep'],[1,2,2],[1,0,0]),
('J08','Choose a hierarchy root','niche','Hierarchy with a specific authored root; do not change edges or choose root by score.',
 ['Open Layout menu','Open Automatic layout','Open Advanced layout settings','Choose Subtree tree','Open Approach controls','Choose Root','Preview automatic layout','Keep layout'],
 ['Open Arrange','Open Structure','Choose Hierarchy','Choose Root','Preview','Keep'],
 ['Open Arrange','Open Advanced','Choose Method: Tree','Choose Root','Preview','Keep'],[3,3,3],[2,1,1]),
('J09','Arrange an undirected network','niche','Undirected graph already authored; first relationship candidate only.',
 ['Open Layout menu','Open Automatic layout','Open Advanced layout settings','Choose Stress descent','Preview automatic layout','Keep layout'],
 ['Open Arrange','Choose Relationships','Preview','Keep'],
 ['Open Arrange','Preview arrangement','Keep'],[2,2,1],[1,0,0]),
('J10','Obtain a sequence arrangement','niche','Participants and messages already authored; sequence semantics must be requested explicitly.',
 ['Open source editor','Set layout root sequence','Save source'],
 ['Open Arrange','Open Structure','Choose Sequence','Preview','Keep'],
 ['Open source editor','Set layout root sequence','Save source'],[1,2,1],[1,0,1])]
policies=['current','goals','automatic_compare']
rows=[]
for job_id,title,tier,start,*parts in jobs:
    paths=parts[:3]; decisions,tuning=parts[3:]
    for i,policy in enumerate(policies):
        rows.append({'job_id':job_id,'job':title,'job_assumption':tier,'policy':policy,'starting_state_and_acceptance':start,'scripted_steps':len(paths[i]),'required_decisions':decisions[i],'manual_configuration_attempts':tuning[i],'path':' → '.join(paths[i]) or 'Open source; render uses current default; no extra layout gesture','observed_user_completion':False,'observed_completion_time_ms':None,'status':'Declared script only; outcome not implied','undo_reset':'Undo source edit or Discard preview; routing current preset commits immediately' if policy=='current' else 'Discard before Keep; one source/history Undo after Keep; Reset uses explicit current/default controls'})
(OUT/'data'/'ui-task-proxies.json').write_text(json.dumps(rows,indent=2)+'\n')
with (OUT/'data'/'ui-task-proxies.csv').open('w',newline='') as f:
    w=csv.DictWriter(f,fieldnames=list(rows[0]));w.writeheader();w.writerows(rows)
summary={p:{'jobs':sum(r['policy']==p for r in rows),'steps':sum(r['scripted_steps'] for r in rows if r['policy']==p),'decisions':sum(r['required_decisions'] for r in rows if r['policy']==p),'manual_configuration_attempts':sum(r['manual_configuration_attempts'] for r in rows if r['policy']==p)} for p in policies}
(OUT/'data'/'ui-proxy-summary.json').write_text(json.dumps(summary,indent=2)+'\n')
# SVG is intentionally static, exact text/controls, no screenshot claim.
s=['<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="1000" viewBox="0 0 1400 1000"><style>text{font-family:Inter,Arial,sans-serif;fill:#162235}.small{font-size:14px;fill:#536172}.label{font-size:15px;font-weight:600}.title{font-size:24px;font-weight:700}.body{font-size:16px}.line{stroke:#cbd5e1;stroke-width:1.4;fill:none}</style><rect width="1400" height="1000" fill="#f4f7fb"/>']
def rect(x,y,w,h,fill='#fff',stroke='#cbd5e1',r=8):s.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{r}" fill="{fill}" stroke="{stroke}"/>')
def text(x,y,t,cls='body'):s.append(f'<text x="{x}" y="{y}" class="{cls}">{html.escape(t)}</text>')
def button(x,y,w,t,primary=False):
 rect(x,y,w,38,'#e4efff' if primary else '#fff','#3568aa' if primary else '#bac6d6',6);text(x+12,y+25,t,'label')
def field(y,label,value):
 text(1044,y,label,'label');rect(1044,y+12,304,42);text(1056,y+39,value);text(1324,y+39,'▾')
text(34,43,'Draftably · proposed editing controls','title');text(34,70,'Precise UI wireframe · proposal, not a screenshot or a measured usability result','small')
rect(24,92,1352,820,'#fff');rect(24,92,1352,56,'#f8fafc')
text(46,127,'Checkout architecture','label');button(502,101,110,'Improve');button(624,101,132,'Rearrange');button(768,101,110,'Compare');text(938,126,'Undo  /  Redo','small')
s.append('<path d="M1014 148V912" class="line"/>')
text(1044,185,'Rearrange','title');text(1044,212,'Preview a new arrangement.','small')
field(249,'Scope','Whole diagram');field(332,'Reading direction','As authored');field(415,'Format','As authored')
text(1044,507,'Pins and named structure stay.','small');text(1044,532,'Existing refinements are listed','small');text(1044,553,'before a replacement is kept.','small')
button(1044,580,304,'Preview arrangement',True);button(1044,631,304,'Compare alternatives')
text(1044,703,'▸ Advanced','label');text(1063,731,'Method · spacing · protection','small');text(1063,754,'All source values remain available.','small')
text(1044,811,'Connections','label');rect(1044,824,304,42);text(1056,851,'Balanced');text(1324,851,'▾');text(1044,891,'Reroute     Compare connections','small')
text(54,191,'Canvas','small');rect(138,274,654,312,'#f9fbff','#94b2d4',12);text(159,306,'Commerce services','label')
for x,y,w,name in [(182,378,138,'Gateway'),(410,348,146,'Orders'),(410,452,146,'Billing'),(634,378,120,'Database')]:
 rect(x,y,w,60,'#fff','#567da7',7);text(x+14,y+37,name,'label')
for p in ['M320 408H365V378H410','M320 408H365V482H410','M556 378H596V408H634','M556 482H596V408H634']:
 s.append(f'<path d="{p}" stroke="#436d9e" stroke-width="2" fill="none"/>')
text(150,633,'Connection Inspector (when selected)','label');rect(138,651,654,82,'#f8fafc');text(155,680,'From  [ Auto ▾ ]       To  [ Auto ▾ ]       Use auto ports');text(155,712,'Resolved sides shown; explicit sides stay unless deliberately released.','small')
rect(138,767,654,98,'#fff8e9','#e8d4a8');text(155,795,'Preview pending · nothing saved','label');button(155,811,152,'Hold before');button(321,811,125,'Discard');button(460,811,146,'Keep layout',True)
text(35,949,'Compare: current drawing + up to 3 meaningfully different alternatives; show hard defects before soft metrics.','label')
text(35,976,'Improve and Rearrange remain separate actions. Sequence, lanes and cells remain explicit authored structures.','small');s.append('</svg>')
(OUT/'renders'/'ui-wireframe.svg').write_text(''.join(s))
print(json.dumps(summary))
