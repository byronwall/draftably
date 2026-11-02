"""Select 26 full-pipeline development pairs with a frozen, replayable rule.
Judges see only the rendered public manifest; this file and the key stay hidden until review ends.
"""
import json, pathlib, random, collections
root=pathlib.Path(__file__).resolve().parents[1]
cases=json.loads((root/'corpus/manifest.json').read_text())['cases']
bycase={c['id']:c for c in cases}
rows={}
for name in ['screen-development','settings-routing']:
    for line in (root/'data'/f'{name}.jsonl').read_text().splitlines():
        row=json.loads(line);rows.setdefault(row['id'],row)
engines=['compound-flow','boundary-align','compound-spring','tidy','stress','force','flow','layered','tree','grid']
pool=collections.defaultdict(list)
for row in rows.values():
    if row.get('stage')=='C' and row.get('status')=='ok':pool[row['caseId']].append(row)
# Stage labels are preserved as authored; C source rows can use C-screen.
if not pool:
    for row in rows.values():
        if row['id'].startswith('C-development-') and row.get('status')=='ok':pool[row['caseId']].append(row)
def engine(row):return row.get('settings',{}).get('engine')
def score(row):return row['metrics']['weightingScores']['balanced']
def valid(row):return row['metrics']['hardValid']
pairs=[]; seen=set(); exclusions=[]
def add(a,b,reason,task=None):
    if a['id']==b['id']:return False
    key=tuple(sorted([a['id'],b['id']]))
    if key in seen:return False
    seen.add(key);cid=a['caseId'];c=bycase.get(cid)
    pairs.append(dict(id=f'P{11+len(pairs):03}',a=a['id'],b=b['id'],split='development',
                      family=c['family'] if c else a.get('family','routing'),
                      task=task or c['job']['task'],reason=reason))
    return True

# Twelve independent family strata: seeded base order and seeded pair choice, not quality-ranked.
rng=random.Random(20261101)
families=list(dict.fromkeys(c['family'] for c in cases))
for family in families:
    eligible=[c for c in cases if c['family']==family and c['split']=='development'];rng.shuffle(eligible)
    chosen=False
    for c in eligible:
        candidates=[r for r in pool[c['id']] if engine(r) in engines or r['id'].endswith('-current')]
        rng.shuffle(candidates)
        for i,a in enumerate(candidates):
            options=[b for b in candidates[i+1:] if b['geometryHash']!=a['geometryHash']]
            if options:
                chosen=add(a,options[0],f'Seeded stratified family sample; seed20261101; selected base {c["id"]}; unequal completed geometry, validity unrestricted.')
                break
        if chosen:break
        exclusions.append({'family':family,'caseId':c['id'],'reason':'Fewer than two distinct completed renderable geometries; execution failures remain in numeric coverage.'})
    if not chosen:raise RuntimeError('No renderable pair for '+family)

# One contested display/removal witness for every rebuild engine. Largest soft-score advantage
# over another engine at fixed defaults, including small/no-unique-gain witnesses honestly.
for eng in engines:
    witnesses=[]
    for cid,candidates in pool.items():
        ours=[r for r in candidates if engine(r)==eng and valid(r)]
        others=[r for r in candidates if engine(r) in engines and engine(r)!=eng and valid(r)]
        if not ours or not others:continue
        a=min(ours,key=lambda r:(score(r),r['id']))
        alternatives=[r for r in others if r['geometryHash']!=a['geometryHash']]
        if not alternatives:continue
        b=min(alternatives,key=lambda r:(score(r),r['id']))
        witnesses.append((score(b)-score(a),a,b))
    witnesses.sort(key=lambda x:(-x[0],x[1]['id']))
    for margin,a,b in witnesses:
        if add(a,b,f'Contested engine witness for {eng}; largest available balanced-score margin versus best geometrically distinct other engine; margin={margin:.6f}. This selection does not establish unique practical value.'):
            break
    else:raise RuntimeError('No distinct witness '+eng)

# Explicit port benefit and adverse override, with fully observed automatic configurations.
for fid,explicit in [('route-12','D-side-route-12-top-top'),('route-03','D-port-route-03-authored')]:
    auto=[r for r in rows.values() if r.get('caseId')==fid and r.get('status')=='ok' and r['id'].startswith('D-routing-')]
    best=min(auto,key=lambda r:(not valid(r),score(r),r['id']))
    add(best,rows[explicit],'Explicit port override versus best tested automatic numeric setting; includes beneficial and adverse witnesses.',
        'Trace the labelled connection through the group/obstacle boundary and identify its endpoints.')

# Largest remaining cases where score preference conflicts with directness/compactness.
tradeoffs=[]
for cid,candidates in pool.items():
    validrows=[r for r in candidates if valid(r)]
    if len(validrows)<2:continue
    a=min(validrows,key=lambda r:(score(r),r['id']))
    b=min(validrows,key=lambda r:(r['metrics']['routeLength'],r['id']))
    if a['id']!=b['id']:
        ratio=a['metrics']['routeLength']/max(1,b['metrics']['routeLength'])
        tradeoffs.append((ratio,a,b))
for ratio,a,b in sorted(tradeoffs,key=lambda x:(-x[0],x[1]['id'])):
    if len(pairs)>=26:break
    add(a,b,f'Metric/directness disagreement: lowest balanced score versus shortest routes; route-length ratio={ratio:.4f}.')
if len(pairs)!=26:raise RuntimeError(f'Expected26pairs, got{len(pairs)}')
(root/'data/visual-pairs-development.json').write_text(json.dumps(pairs,indent=2)+'\n')
(root/'data/visual-selection-development.json').write_text(json.dumps({'seed':20261101,'pairs':len(pairs),'stratifiedPairs':12,'engineWitnessPairs':10,'portWitnessPairs':2,'metricTradeoffPairs':2,'unrenderableRandomDraws':exclusions,'heldoutRead':False},indent=2)+'\n')
print(json.dumps({'pairs':len(pairs),'unrenderableRandomDraws':len(exclusions),'ids':[p['id'] for p in pairs]}))
