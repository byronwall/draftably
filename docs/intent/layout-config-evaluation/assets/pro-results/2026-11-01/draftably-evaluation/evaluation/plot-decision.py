"""Publication figure for the frozen heldout decision; no fitting or geometry."""
import csv
import json
import pathlib
import math
import os
os.environ.setdefault('MPLCONFIGDIR','/tmp/draftably-evaluation-matplotlib')
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.colors import LinearSegmentedColormap
import numpy as np
from original_report_inputs import require_original_report_inputs

root=pathlib.Path(__file__).resolve().parents[1]
require_original_report_inputs(root)
out=root/'renders/analysis';out.mkdir(parents=True,exist_ok=True)
data=root/'data/analysis/heldout'
read=lambda name:json.loads((data/name).read_text())
policies={r['policy']:r for r in read('policy-summaries.json') if r['weighting']=='equal-family'}
six=next(r for r in read('engine-recipe-frozen-subsets.json')['results']
         if r['mode']=='combined' and r['scenario']=='recipes-and-authored-safe'
         and r['selectedUnderWeighting']=='equal-family' and r['evaluationWeighting']=='equal-family')
eleven=read('minimum-configuration-frozen-policy.json')['heldoutSummary']
profiles=['readable','compact','traceable','stable','specialist']
sources=[('Full measured pool\nReference oracle',None),
         ('Six engines + native recipes\nAvailability oracle',six),
         ('11 configurations + native recipes\nAvailability oracle',eleven),
         ('Frozen graph-feature selector\nWith hard-validity fallback',policies['k5-prelayout-selector-validity-guard']),
         ('Best fixed global: force RIGHT\nWith hard-validity fallback',policies['best-fixed-global-validity-guard']),
         ('Current authored source\nExisting first-render behavior',policies['current-authored'])]
baseline=policies['current-authored']['commonProfileCounts']
denoms=[baseline[p]['oracleFeasibleBases'] for p in profiles]
all_denoms=[baseline[p]['allCommonBases'] for p in profiles]
assert denoms==[12]*5 and all_denoms==[14]*5
matrix=[];rows=[]
for title,s in sources:
    counts=[12]*5 if s is None else [s['commonProfileCounts'][p].get('acceptableBases',s['commonProfileCounts'][p].get('acceptable')) for p in profiles]
    matrix.append([x/12 for x in counts])
    for p,n in zip(profiles,counts):rows.append({'policy':title.replace('\n',' — '),'profile':p,
        'acceptableCommonBases':n,'feasibleCommonBases':12,'allCommonBases':14,'relativeCoverage':n/12,
        'absoluteCoverage':n/14,'relative95Pass':n/12>=.95,'oracle':s is None or s in [six,eleven]})

plt.rcParams.update({'font.family':'DejaVu Sans','font.size':12,'axes.titleweight':'bold'})
fig,ax=plt.subplots(figsize=(12.3,6.3),layout='constrained')
cmap=LinearSegmentedColormap.from_list('coverage',['#edf2f8','#adc9e2','#498db9','#27785f'])
ax.imshow(matrix,vmin=0,vmax=1,cmap=cmap,aspect='auto')
ax.set_xticks(range(5),['Readable','Compact','Traceable','Stable*','Specialist'])
ax.xaxis.tick_top();ax.tick_params(axis='both',which='both',length=0,pad=12)
ax.set_yticks(range(len(sources)),[x[0] for x in sources],fontsize=11)
for i,line in enumerate(matrix):
    for j,value in enumerate(line):
        count=round(value*12)
        ax.text(j,i,f'{count} / 12',ha='center',va='center',fontsize=16,fontweight='bold',color='white' if value>.63 else '#14304b')
        if count==12:ax.add_patch(plt.Rectangle((j-.49,i-.49),.98,.98,fill=False,color='#143e30',linewidth=2))
ax.set_xticks(np.arange(-.5,5,1),minor=True);ax.set_yticks(np.arange(-.5,len(sources),1),minor=True)
ax.grid(which='minor',color='white',linewidth=3)
for spine in ax.spines.values():spine.set_visible(False)
fig.suptitle('Heldout acceptable common jobs',fontsize=21,x=.015,ha='left')
fig.supxlabel('12 feasible common bases; 14 total. The 95% gate requires 12 / 12 in every profile.\n'
              'Oracle rows choose after seeing results. *Stable is the static proxy; edit trials are reported separately.',
              fontsize=10.5,ha='left',x=.015)
for extension in ['png','svg']:
    fig.savefig(out/f'heldout-decision-coverage.{extension}',dpi=180,bbox_inches='tight',facecolor='white')
plt.close(fig)
(data/'decision-coverage-figure.json').write_text(json.dumps({'fittedOnHeldout':False,'rows':rows},indent=2)+'\n')
with (data/'decision-coverage-figure.csv').open('w',newline='') as f:
    w=csv.DictWriter(f,fieldnames=list(rows[0]));w.writeheader();w.writerows(rows)
print(json.dumps({'figure':'renders/analysis/heldout-decision-coverage.png','rows':len(rows),'requiredCommonCount':math.ceil(12*.95)}))
