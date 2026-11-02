"""Select the 24 post-freeze heldout pairs, without changing any policy.

Twelve seeded family samples + four frozen-configuration misses + four omitted
engine witnesses + four score/directness disagreements. Only completed canonical
production outputs can be rendered; unrenderable comparisons stay in the ledger.
"""
import collections
import csv
import hashlib
import json
import math
import pathlib
import random

root = pathlib.Path(__file__).resolve().parents[1]
freeze_path = root/'data/policy-freeze.json'
freeze = json.loads(freeze_path.read_text())
assert freeze['frozen'] is True
cases = [c for c in json.loads((root/'corpus/manifest.json').read_text())['cases'] if c['split']=='heldout']
bycase = {c['id']: c for c in cases}
rows = {}
for stem in ['screen-heldout', 'documented-default-heldout', 'selected-presets-heldout']:
    tasks = json.loads((root/'evaluation/tasks'/f'{stem}.json').read_text())
    part = {}
    for line in (root/'data'/f'{stem}.jsonl').read_text().splitlines():
        row = json.loads(line)
        part.setdefault(row['id'], row)
        rows.setdefault(row['id'], row)
    assert all(t['id'] in part for t in tasks), f'Incomplete stage: {stem}'

pool = collections.defaultdict(list)
for row in rows.values():
    if row['status']=='ok': pool[row['caseId']].append(row)
minimum = freeze['proposal']['engineRecipeDiagnostic']['minimumConfigurationPolicy']
retained = minimum['fixedEngineSet']
engines = ['compound-flow','boundary-align','compound-spring','tidy','stress','force','flow','layered','tree','grid']
omitted = [e for e in engines if e not in retained]
assert len(omitted)==4
score = lambda r: r['metrics']['weightingScores']['balanced']
valid = lambda r: r['metrics']['hardValid']
engine = lambda r: r.get('settings',{}).get('engine')
pairs, exclusions, seen = [], [], set()

def add(a, b, reason, category):
    if not a or not b or a['status']!='ok' or b['status']!='ok':
        exclusions.append({'category':category,'A':a.get('id') if a else None,
                           'B':b.get('id') if b else None,'reason':'No two canonical completed outputs.'})
        return False
    if a['id']==b['id']: return False
    key = tuple(sorted([a['id'], b['id']]))
    if key in seen: return False
    seen.add(key)
    c=bycase[a['caseId']]
    pairs.append(dict(id=f'P{37+len(pairs):03}', a=a['id'], b=b['id'], split='heldout',
                      family=c['family'], task=c['job']['task'], category=category, reason=reason))
    return True

rng = random.Random(20261102)
for family in dict.fromkeys(c['family'] for c in cases):
    candidates = [c for c in cases if c['family']==family]
    rng.shuffle(candidates)
    chosen=False
    equal_pairs=[]
    for c in candidates:
        eligible=[r for r in pool[c['id']] if r['id'].startswith('C-heldout-') and
                  (engine(r) in engines or r['id'].endswith('-current'))]
        rng.shuffle(eligible)
        if len(eligible)>=2:equal_pairs.append((eligible[0],eligible[1]))
        for i, a in enumerate(eligible):
            other=next((b for b in eligible[i+1:] if b['geometryHash']!=a['geometryHash']), None)
            if other and add(a, other, 'Seeded family sample; seed 20261102; distinct completed geometry; validity unrestricted.', 'family'):
                chosen=True
                break
        if chosen: break
        exclusions.append({'category':'family','caseId':c['id'],'reason':'Fewer than two distinct completed source geometries; failures remain in coverage.'})
    if not chosen and equal_pairs:
        a,b=equal_pairs[0]
        chosen=add(a,b,'Seeded family sample; all completed sampled candidate geometries are identical. Keep this as an authored-constraint identity negative control instead of excluding the family.', 'family')
    if not chosen: raise RuntimeError('No renderable family pair: '+family)

with (root/'data/analysis/heldout/minimum-configuration-frozen-selections.csv').open() as stream:
    selections=[r for r in csv.DictReader(stream) if r['policy']=='frozen-minimum-configuration-oracle']
def regret(r):
    try: return float(r['regret'])
    except (ValueError,TypeError): return math.inf
chosen_cases=set()
for r in sorted(selections,key=lambda r:(-regret(r),r['caseId'],r['profile'])):
    if r['caseId'] in chosen_cases: continue
    if add(rows.get(r['chosenTrial']),rows.get(r['oracleTrial']),
           f'Largest remaining frozen configuration-portfolio regret; profile {r["profile"]}; regret {r["regret"]}; no heldout refitting.', 'frozen-portfolio-regression'):
        chosen_cases.add(r['caseId'])
    if len(chosen_cases)==4: break
if len(chosen_cases)<4: raise RuntimeError('Fewer than four distinct renderable frozen-portfolio misses.')

for eng in omitted:
    witnesses=[]
    for cid, candidates in pool.items():
        ours=[r for r in candidates if engine(r)==eng and valid(r)]
        others=[r for r in candidates if engine(r) in retained and valid(r)]
        if not ours or not others: continue
        a=min(ours,key=lambda r:(score(r),r['id']))
        alternatives=[r for r in others if r['geometryHash']!=a['geometryHash']]
        if not alternatives: continue
        b=min(alternatives,key=lambda r:(score(r),r['id']))
        witnesses.append((score(b)-score(a),a,b))
    for margin,a,b in sorted(witnesses,key=lambda x:(-x[0],x[1]['id'])):
        if add(a,b,f'Contested omitted engine {eng}: largest balanced-score margin against the best distinct retained-engine output; margin {margin:.6f}. This is a witness, not a new portfolio selection.', 'omitted-engine'):
            break
    else: raise RuntimeError('No distinct omitted-engine witness: '+eng)

tradeoffs=[]
for cid, candidates in pool.items():
    usable=[r for r in candidates if valid(r) and r['metrics']['routeLength']>0]
    if len(usable)<2: continue
    a=min(usable,key=lambda r:(score(r),r['id']))
    b=min(usable,key=lambda r:(r['metrics']['routeLength'],r['id']))
    if a['id']!=b['id']:
        tradeoffs.append((a['metrics']['routeLength']/b['metrics']['routeLength'],a,b))
for ratio,a,b in sorted(tradeoffs,key=lambda x:(-x[0],x[1]['id'])):
    if len(pairs)==24: break
    add(a,b,f'Lowest balanced score versus shortest routes; length ratio {ratio:.4f}; visual assessment checks detour cost independently.', 'metric-directness')
if len(pairs)!=24: raise RuntimeError(f'Expected 24 heldout pairs; found {len(pairs)}')
out=root/'data/visual-pairs-heldout.json'
encoded=json.dumps(pairs,indent=2)+'\n'
if out.exists() and out.read_text()!=encoded: raise RuntimeError('Refusing to replace an existing heldout pair selection.')
out.write_text(encoded)
(root/'data/visual-selection-heldout.json').write_text(json.dumps({
    'seed':20261102,'pairs':24,'counts':dict(collections.Counter(p['category'] for p in pairs)),
    'policyFreezeSha256':hashlib.sha256(freeze_path.read_bytes()).hexdigest(),
    'selectionCodeSha256':hashlib.sha256(pathlib.Path(__file__).read_bytes()).hexdigest(),
    'fittedOrChangedPolicy':False,'unrenderableComparisons':exclusions,
    'identityNegativeControls':[p['id'] for p in pairs if 'identity negative control' in p['reason']],
    'note':'Outcome-targeted witnesses supplement the seeded sample; this is not a random population-accuracy estimate.'
},indent=2)+'\n')
print(json.dumps({'pairs':24,'unrenderableComparisons':len(exclusions),'first':pairs[0]['id'],'last':pairs[-1]['id']}))
