#!/usr/bin/env python3
"""Publication artifacts from completed policy summaries; no algorithm execution or fitting."""
import argparse
import html
import json
import pathlib
import os
os.environ.setdefault("MPLCONFIGDIR", "/tmp/draftably-evaluation-matplotlib")
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np

ROOT=pathlib.Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--split',choices=['development','heldout'],default='development')
args=parser.parse_args();split=args.split
if split=='heldout':
    p=ROOT/'data/policy-freeze.json'
    if not p.exists() or not json.loads(p.read_text()).get('frozen'):raise SystemExit('Policy must be frozen before heldout access')
    frozen=json.loads(p.read_text());full=frozen.get('proposal',frozen)
else:full=json.loads((ROOT/'data/policy-proposal.json').read_text())
compact=full['compact'];data=ROOT/'data/analysis'/split
rows=json.loads((data/'policy-summaries.json').read_text())
if (data/'retuned-policy-summaries.json').exists():rows+=json.loads((data/'retuned-policy-summaries.json').read_text())
rows={r['policy']:r for r in rows if r['weighting']=='equal-family'}
out=ROOT/'renders/analysis';out.mkdir(parents=True,exist_ok=True)
plt.rcParams.update({'font.family':'DejaVu Sans','font.size':10,'axes.titlesize':12,'axes.labelsize':10,'svg.fonttype':'none','pdf.fonttype':42})
colors={'oracle':'#6b7280','selector':'#126f9e','goal':'#8b4ca7','tuned':'#1c8765','current':'#b46426'}

def save(fig,name):
    for ext in ['png','svg','pdf']:fig.savefig(out/f'{name}.{ext}',dpi=180,bbox_inches='tight',facecolor='white')
    plt.close(fig)

series=[('Configuration oracle','k{}-configuration-oracle',colors['oracle'],'o'),('Pre-layout selector + guard','k{}-prelayout-selector-validity-guard',colors['selector'],'s'),('Goal selector + guard','k{}-goal-selector-validity-guard',colors['goal'],'^')]
if any(k.startswith('tuned-') for k in rows):series.append(('Tuned pre-layout selector + guard','tuned-k{}-prelayout-selector-validity-guard',colors['tuned'],'D'))
fig,axs=plt.subplots(1,2,figsize=(12.7,4.6),sharex=True,sharey=True)
for ax,metric,title in zip(axs,['worstProfileCommonFeasibleCoverage','worstProfileCommonAbsoluteCoverage'],['Contract gate: lowest relative profile coverage','Conservative stress test: lowest absolute profile coverage']):
    for label,pattern,color,marker in series:
        points=[(k,rows[pattern.format(k)].get(metric)) for k in range(1,6) if pattern.format(k) in rows]
        ax.plot([p[0] for p in points],[p[1] for p in points],color=color,marker=marker,lw=2,label=label)
    if 'current-authored' in rows:ax.axhline(rows['current-authored'][metric],color=colors['current'],ls=':',lw=1.8,label='Current authored source')
    ax.axhline(.95,color='#b42318',ls='--',lw=1.2,label='95% gate')
    ax.set(title=title,xlabel='Retained generic engines',ylim=(0,1.025),xticks=range(1,6))
    ax.yaxis.set_major_formatter(matplotlib.ticker.PercentFormatter(1));ax.grid(axis='y',alpha=.2);ax.spines[['top','right']].set_visible(False)
axs[0].set_ylabel('Acceptable common-base coverage')
fig.suptitle(f'{split.title()}: generic engine policies under frozen quality bands',fontweight='bold',y=1.04)
handles,labels=axs[0].get_legend_handles_labels();fig.legend(handles,labels,loc='lower center',bbox_to_anchor=(.5,-.14),ncol=3,frameon=False)
fig.text(.01,-.23,'These curves restrict generic choices to engines; ordinary recipe choices are analyzed separately.\nRelative denominator: feasible common bases. Absolute denominator: all common bases. Development estimates fit on development. Heldout curves apply development-selected subsets and trees without refitting.',fontsize=9,color='#475467')
save(fig,split+'-portfolio-coverage')

profiles=['readable','compact','traceable','stable','specialist']
chosen=[('Current source','current-authored'),('Documented default','documented-default'),('Fixed global + guard','best-fixed-global-validity-guard')]
chosen += [(f'{k} engines: selector + guard',f'k{k}-prelayout-selector-validity-guard') for k in range(1,6)]
mode=compact['preferredSelector']['mode'];k=compact['preferredSelector']['size'];key=('tuned-' if mode=='tuned' else '')+f'k{k}-goal-selector-validity-guard'
chosen.append((f'Preferred {mode} goal policy ({k})',key));chosen=[p for p in chosen if p[1] in rows]
mat=np.array([[rows[key]['commonAbsoluteProfileCoverage'][p] for p in profiles] for _,key in chosen])
fig,ax=plt.subplots(figsize=(9.5,max(4,0.47*len(chosen)+1.6)))
im=ax.imshow(mat,vmin=0,vmax=1,cmap='Blues',aspect='auto')
ax.set_xticks(range(5),[p.title() for p in profiles]);ax.set_yticks(range(len(chosen)),[label for label,_ in chosen]);ax.tick_params(length=0)
for y,(_,key) in enumerate(chosen):
    for x,p in enumerate(profiles):
        n=rows[key]['commonProfileCounts'][p];txt=f"{n['acceptableBases']}/{n['allCommonBases']}\n{mat[y,x]:.0%}"
        ax.text(x,y,txt,ha='center',va='center',fontsize=9,color='white' if mat[y,x]>.6 else '#152a3c')
ax.set_title(f'{split.title()}: exact common-base acceptance by preference',pad=16,fontweight='bold')
for spine in ax.spines.values():spine.set_visible(False)
fig.colorbar(im,ax=ax,shrink=.75,label='Absolute acceptable coverage')
fig.text(.02,-.02,'Contract: each profile must reach95% relative to the feasible pool; this table shows absolute counts. Static stable/specialist scores supplement, and do not replace, edit and structural intent evidence.',fontsize=9,color='#475467')
save(fig,split+'-profile-coverage')

# Source-aware implementation availability has a different candidate set than a
# restricted root-engine menu. Keep that distinction visible in a separate figure.
if split=='development' and (data/'engine-recipe-subsets-best.json').exists():
    best=json.loads((data/'engine-recipe-subsets-best.json').read_text())
    qualified=json.loads((data/'engine-recipe-subsets-qualified.json').read_text())
    fig,axs=plt.subplots(1,2,figsize=(12.7,4.5),sharex=True,sharey=True)
    specs=[('Defaults + native recipes','defaults','recipes-and-authored-safe','#6b7280','o'),('Defaults and presets + recipes','combined','recipes-and-authored-safe','#126f9e','s'),('Current-source UI fallback','combined','current-ui-fallback','#1c8765','D')]
    for ax,metric,title in zip(axs,['worstProfileCommonFeasibleCoverage','worstProfileCommonAbsoluteCoverage'],['Original contract: relative feasible-pool coverage','Conservative sensitivity: absolute all-common coverage']):
        for label,mode,scenario,color,marker in specs:
            series=[]
            for k in range(11):
                key=f'{mode}|{scenario}|equal-family|k={k}'
                r=qualified.get(key,best[key]);series.append(r[metric])
            ax.plot(range(11),series,lw=2,marker=marker,color=color,label=label)
        ax.axhline(.95,color='#b42318',ls='--',lw=1.2,label='95% threshold')
        ax.set(title=title,xlabel='Retained engine IDs',ylim=(0,1.025),xticks=range(11));ax.yaxis.set_major_formatter(matplotlib.ticker.PercentFormatter(1));ax.grid(axis='y',alpha=.2);ax.spines[['top','right']].set_visible(False)
    axs[0].set_ylabel('Lowest coverage among five common-job profiles')
    fig.suptitle('Development: recipes and source dependencies change the smallest portfolio',fontweight='bold',y=1.04)
    h,l=axs[0].get_legend_handles_labels();fig.legend(h,l,loc='lower center',bbox_to_anchor=(.5,-.13),ncol=2,frameon=False)
    fig.text(.01,-.24,'Six dependency-safe engines pass the relative development gate; five visible choices pass only with unrestricted current-source fallback.\nFallback can still call hidden engines. Curves use the best contract-qualified set when available, otherwise the best aggregate set. Oracle availability is not automatic selection.',fontsize=9,color='#475467')
    save(fig,'development-engine-recipe-coverage')

# Diagram the exact preferred development tree. It remains the same on heldout.
def tree_svg(tree,title):
    placed=[];links=[];leafx=[]
    def walk(node,depth=0):
        if node['type']=='leaf':
            x=110+len(leafx)*220;leafx.append(x)
        else:
            lx=walk(node['left'],depth+1);rx=walk(node['right'],depth+1);x=(lx+rx)/2
            links.append((x,depth,lx,depth+1,'≤'));links.append((x,depth,rx,depth+1,'>'))
        placed.append((node,x,depth));return x
    walk(tree);width=max(660,len(leafx)*220);height=150+170*(max(d for _,_,d in placed)+1)
    parts=[f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}">','<rect width="100%" height="100%" fill="#fff"/>',f'<text x="24" y="32" font-family="sans-serif" font-size="21" font-weight="700" fill="#17324d">{html.escape(title)}</text>','<text x="24" y="57" font-family="sans-serif" font-size="12" fill="#475467">Exact fitted proposal. Root sequence/lanes preserve current source outside this tree. Guarded policies retain current output on hard failure.</text>']
    for x,d,xx,dd,label in links:
        y=90+d*170;yy=90+dd*170
        parts.append(f'<path d="M{x},{y+94} L{xx},{yy}" fill="none" stroke="#a6b5c2" stroke-width="2"/>')
        parts.append(f'<text x="{(x+xx)/2+5}" y="{(y+94+yy)/2}" font-family="sans-serif" font-size="14" fill="#475467">{html.escape(label)}</text>')
    for node,x,d in placed:
        y=90+d*170;leaf=node['type']=='leaf';fill='#e7f3fb' if leaf else '#f2f4f7'
        parts.append(f'<rect x="{x-100}" y="{y}" width="200" height="94" rx="9" fill="{fill}" stroke="#94adc0"/>')
        if leaf:
            fields=node['method'].split(':');label=fields[1] if len(fields)>1 else fields[0];subtitle=' · '.join(fields[2:])
        else:label=node['feature'];subtitle=f"threshold {node['threshold']:.4g}"
        parts.append(f'<text x="{x}" y="{y+29}" text-anchor="middle" font-family="sans-serif" font-size="16" font-weight="700" fill="#17324d">{html.escape(label)}</text>')
        parts.append(f'<text x="{x}" y="{y+53}" text-anchor="middle" font-family="sans-serif" font-size="13" fill="#17324d">{html.escape(subtitle)}</text>')
        parts.append(f'<text x="{x}" y="{y+76}" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#475467">{node["trainingBases"]} development bases</text>')
    parts.append(f'<text x="24" y="{height-22}" font-family="sans-serif" font-size="12" fill="#475467">Depth ≤3; at least4 development bases per leaf. Source features only. Tree quality is measured separately from the configuration oracle.</text></svg>')
    return '\n'.join(parts)
if split=='development':(out/'preferred-prelayout-tree.svg').write_text(tree_svg(compact['preferredSelector']['tree'],f'Preferred development selector — {mode}, {k} engines'))
print(json.dumps({'split':split,'files':[str(p.relative_to(ROOT)) for p in sorted(out.glob(split+'-*'))],'tree':str((out/'preferred-prelayout-tree.svg').relative_to(ROOT))}))
