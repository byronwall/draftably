#!/usr/bin/env python3
"""Frozen, development-only policy fitting and once-only heldout evaluation.

This script analyzes production engine/router results; it implements no layout.
Run from any directory. The tuning phase never opens heldout sources or outcomes.
Outputs are proposals until the root experiment controller seals policy-freeze.json.
"""
from __future__ import annotations
import argparse, collections, csv, hashlib, itertools, json, math, pathlib, re, shlex, statistics, sys
from datetime import datetime, timezone
import numpy as np

ROOT = pathlib.Path(__file__).resolve().parents[1]
ENGINES = ['compound-flow','boundary-align','compound-spring','tidy','stress','force','flow','layered','tree','grid']
PROFILES = ['readable','compact','traceable','stable','specialist']
WEIGHTINGS = ['equal-family','common80-niche20','common50-niche50','worst-family']
ASPECTS = {'wide':2.0,'slide':1.78,'square':1.0,'page':0.77,'tall':0.6,'free':1.6}
BANDS = {'score':1.0,'area':0.10,'routeLength':0.10}
FEATURES = ['nodeCount','edgeCount','groupCount','density','undirectedFraction','componentCount','maxDegree','maxDepth','hasDirectedCycle','targetAspect']
VERSION = 'portfolio-analysis-1.1.0'
NORMALIZED_TRIAL_BUDGET_MS = 15000  # Uniform runtime addendum; original90s timeouts remain failures.


def read_json(path):
    return json.loads(pathlib.Path(path).read_text())


def sha(path):
    return hashlib.sha256(pathlib.Path(path).read_bytes()).hexdigest()


def dump(path, obj):
    path=pathlib.Path(path); path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(json.dumps(obj,indent=2,ensure_ascii=False,allow_nan=False)+'\n')


def write_csv(path, rows):
    path=pathlib.Path(path);path.parent.mkdir(parents=True,exist_ok=True)
    if not rows:
        path.write_text(''); return
    keys=list(dict.fromkeys(k for r in rows for k in r))
    with path.open('w',newline='') as f:
        w=csv.DictWriter(f,fieldnames=keys);w.writeheader()
        for r in rows:
            w.writerow({k:(json.dumps(v,separators=(',',':')) if isinstance(v,(list,dict)) else v) for k,v in r.items()})


def is_valid(row):
    m=row.get('metrics',{})
    return row.get('status')=='ok' and m.get('hardValid') is True and m.get('requiredIntentFailures',0)==0 and not row.get('intent',{}).get('failures')


def method_key(task):
    tag=task.get('tag','')
    lay=task.get('layout') or task.get('settings') or {}
    if tag=='current': return 'current'
    if tag=='documented-default': return 'documented-default'
    if tag=='recipe-baseline':
        return 'recipe:'+str(lay.get('recipe') or 'implicit')+':'+str(lay.get('direction') or 'auto')
    if tag.startswith('preset-') or tag=='selected-preset':
        p=task.get('presetIndex',int(tag.split('-')[-1]) if tag.startswith('preset-') else None)
        return 'tuned:'+lay.get('engine','unknown')+':'+str(lay.get('direction','RIGHT'))+':p'+str(p)
    if lay.get('engine'):
        return 'engine:'+lay['engine']+':'+str(lay.get('direction','auto'))
    return str(tag or task.get('id'))


def load_trials(stem, require_complete=True, split='development'):
    tp=ROOT/'evaluation/tasks'/f'{stem}.json'
    rp=ROOT/'data'/f'{stem}.jsonl'
    if not tp.exists(): return [], {'stem':stem,'exists':False,'expected':0,'observed':0,'missing':[]}
    tasks=read_json(tp); taskmap={t['id']:t for t in tasks}
    if any(t.get('split')!=split for t in tasks):
        raise ValueError(f'{stem}: wrong split in task definitions; refusing access')
    rows={}; duplicates=[]; nonterminal=[]; mismatches=[]
    if rp.exists():
        for lineno,line in enumerate(rp.read_text().splitlines(),1):
            if not line.strip():continue
            r=json.loads(line)
            if r.get('split') not in [None,split]:raise ValueError(f'{stem}:{lineno}: wrong split')
            if r['id'] not in taskmap:raise ValueError(f'{stem}: unregistered trial {r["id"]}')
            if r.get('status') not in ['ok','failed','timed_out']:
                nonterminal.append({'id':r['id'],'line':lineno,'status':r.get('status')});continue
            if r['id'] in rows:
                first=rows[r['id']]
                duplicates.append({'id':r['id'],'line':lineno,'canonicalStatus':first.get('status'),'laterStatus':r.get('status'),'canonicalGeometryHash':first.get('geometryHash'),'laterGeometryHash':r.get('geometryHash'),'laterWorkerMs':r.get('timing',{}).get('workerMs')})
                if first.get('status')=='ok' and r.get('status')=='ok' and first.get('geometryHash')!=r.get('geometryHash'):
                    mismatches.append({'id':r['id'],'first':first.get('geometryHash'),'later':r.get('geometryHash')})
                continue
            merged={**taskmap[r['id']],**r}
            merged['_task']=taskmap[r['id']]
            merged['method']=method_key(taskmap[r['id']]); merged['valid']=is_valid(merged)
            rows[r['id']]=merged
    missing=[t['id'] for t in tasks if t['id'] not in rows]
    if missing and require_complete:
        raise ValueError(f'{stem}: {len(rows)}/{len(tasks)} complete; do not rank an incomplete screen. Use --allow-partial only for debugging.')
    info={'stem':stem,'exists':rp.exists(),'expected':len(tasks),'observed':len(rows),'missing':missing,'canonicalRule':'first terminal row per trial ID; later attempts never improve coverage or policy fitting','duplicateAttempts':duplicates,'nonterminalRecords':nonterminal,'geometryHashMismatches':mismatches,'taskSha256':sha(tp),'resultsSha256':sha(rp) if rp.exists() else None,'statuses':dict(collections.Counter(r.get('status') for r in rows.values()))}
    return list(rows.values()),info


def target_aspect(case):
    target=case.get('job',{}).get('targetFormat','free')
    return ASPECTS.get(target,1.6)


def profile_score(row, profile, min_area, target):
    if not row or not is_valid(row):return math.inf
    m=row['metrics']; weights=m.get('weightingScores',{})
    bal=float(weights.get('balanced',m.get('diPer10',math.inf)))
    direct=float(weights.get('direct',bal));trace=float(weights.get('traceable',bal))
    aspect=max(1e-12,float(m.get('aspect',1))); ae=abs(math.log(aspect/max(1e-12,target)))
    if profile=='readable':return direct+2*ae
    if profile=='compact':return bal+8*math.log(max(1,float(m.get('area',1)))/max(1,min_area))+2*ae
    if profile=='traceable':return trace
    if profile=='stable':
        edit=m.get('edit') or {}
        if edit.get('requestedGlobalReflow'):return bal
        return bal+float(edit.get('translationAdjustedMean',0))/24+5*float(edit.get('changedSideRate',0))
    return bal


def acceptable(row, score, oracle, oracle_score, band=1.0):
    if not row or not is_valid(row) or not oracle or not math.isfinite(score):return False
    a=row['metrics'];b=oracle['metrics']
    return score<=oracle_score+BANDS['score']*band+1e-8 and float(a.get('area',0))<=float(b.get('area',0))*(1+BANDS['area']*band)+1e-6 and float(a.get('routeLength',0))<=float(b.get('routeLength',0))*(1+BANDS['routeLength']*band)+1e-6


def raw_pre_layout_features(case):
    """Read only immutable source topology/format; no geometry, family or IDs as labels."""
    source=(ROOT/case['path']).read_text()
    objects={}; edges=[]
    for line in source.splitlines():
        try: tokens=shlex.split(line,comments=True)
        except ValueError:continue
        if not tokens:continue
        if tokens[0] in ['node','group'] and len(tokens)>1:
            attrs={x.split('=',1)[0]:x.split('=',1)[1] for x in tokens[2:] if '=' in x}
            objects[tokens[1]]={'kind':tokens[0],'parent':attrs.get('in')}
        elif tokens[0]=='edge' and len(tokens)>4:
            # Production DSL uses -> plus directed=false / constraint=false attributes.
            arrow=next((i for i,t in enumerate(tokens) if t in ['->','--','<->','<-']),None)
            if arrow is not None and arrow>0 and arrow+1<len(tokens):
                attrs={x.split('=',1)[0]:x.split('=',1)[1] for x in tokens[arrow+2:] if '=' in x}
                edges.append((tokens[arrow-1],tokens[arrow+1],attrs.get('directed','true')!='false',attrs.get('constraint','true')!='false'))
    ids=set(objects); adj={x:set() for x in ids}; degree=collections.Counter();directed={x:[] for x in ids}
    for a,b,is_directed,is_constraining in edges:
        if a not in ids or b not in ids:continue
        adj[a].add(b);adj[b].add(a);degree[a]+=1;degree[b]+=1
        if is_directed and is_constraining:directed[a].append(b)
    # Components count edge connectivity over declared node/group endpoint objects;
    # group membership does not fabricate a graph edge.
    components=0;seen=set()
    for x in sorted(ids):
        if x in seen:continue
        components+=1;stack=[x];seen.add(x)
        while stack:
            q=stack.pop()
            for n in adj[q]:
                if n not in seen:seen.add(n);stack.append(n)
    colors={};cyclic=False
    def dfs(x):
        nonlocal cyclic
        colors[x]=1
        for y in directed[x]:
            if colors.get(y)==1:cyclic=True
            elif not colors.get(y):dfs(y)
        colors[x]=2
    for x in sorted(ids):
        if not colors.get(x):dfs(x)
    maxdepth=0
    for x in ids:
        depth=0; p=objects[x]['parent'];visited={x}
        while p in objects and p not in visited:
            depth+=1;visited.add(p);p=objects[p]['parent']
        maxdepth=max(maxdepth,depth)
    nodes=sum(v['kind']=='node' for v in objects.values()); groups=len(ids)-nodes;n=len(ids);e=len(edges)
    return {'nodeCount':nodes,'edgeCount':e,'groupCount':groups,'density':e/max(1,n*(n-1)),'undirectedFraction':sum(not d for _,_,d,_ in edges)/max(1,e),'componentCount':components,'maxDegree':max(degree.values(),default=0),'maxDepth':maxdepth,'hasDirectedCycle':int(cyclic),'targetAspect':target_aspect(case)}


class Screen:
    def __init__(self,cases,rows,include_tuned=False):
        self.cases=cases;self.bycase={c['id']:c for c in cases};self.rows=rows
        self.byid={r['id']:r for r in rows};self.method_rows=collections.defaultdict(dict)
        for r in rows:
            if r['caseId'] in self.bycase:self.method_rows[r['caseId']][r['method']]=r
        self.methods=sorted({r['method'] for r in rows})
        self.jobs=[]; self.index={};self.no_oracle=[]
        for c in cases:
            candidates=list(self.method_rows[c['id']].values())
            valid=[r for r in candidates if r['valid']]
            area=min((float(r['metrics']['area']) for r in valid),default=1)
            for profile in PROFILES:
                scores={r['method']:profile_score(r,profile,area,target_aspect(c)) for r in candidates}
                valid.sort(key=lambda r:(scores[r['method']],r['metrics'].get('area',0),r['metrics'].get('routeLength',0),r['id']))
                oracle=valid[0] if valid else None;os=scores[oracle['method']] if oracle else math.inf
                job={'case':c,'profile':profile,'rows':self.method_rows[c['id']],'scores':scores,'minArea':area,'oracle':oracle,'oracleScore':os,'acceptable':{r['method']:acceptable(r,scores[r['method']],oracle,os) for r in candidates}}
                self.index[(c['id'],profile)]=len(self.jobs);self.jobs.append(job)
                if not oracle:self.no_oracle.append({'caseId':c['id'],'profile':profile})
        self.feasible=np.array([j['oracle'] is not None for j in self.jobs],dtype=bool)
        self.common=np.array([j['case']['common'] for j in self.jobs],dtype=bool)
        self.families=sorted({c['family'] for c in cases})
        self.family_masks={f:np.array([j['case']['family']==f for j in self.jobs],dtype=bool) for f in self.families}

    def weights(self,name='equal-family'):
        counts=collections.Counter(c['family'] for c in self.cases)
        commonfamilies={c['family'] for c in self.cases if c['common']};nichefamilies=set(counts)-commonfamilies
        result=[]
        for j in self.jobs:
            c=j['case'];f=c['family']
            if name in ['equal-family','worst-family']:fw=1/len(counts)
            else:
                commonweight=.8 if name=='common80-niche20' else .5
                fw=(commonweight/len(commonfamilies) if c['common'] else (1-commonweight)/len(nichefamilies))
            result.append(fw/counts[f]/len(PROFILES))
        return np.array(result)

    def lookup(self,caseid,method):return self.method_rows.get(caseid,{}).get(method)

    def choose(self,job,methods,coverage_oracle=True,band=1):
        rows=[job['rows'][m] for m in methods if m in job['rows'] and job['rows'][m]['valid']]
        if not rows:return None
        return min(rows,key=lambda r:((0 if acceptable(r,job['scores'][r['method']],job['oracle'],job['oracleScore'],band) else 1) if coverage_oracle else 0,job['scores'][r['method']],r['metrics'].get('area',0),r['metrics'].get('routeLength',0),r['id']))

    def evaluate(self,chosen,weighting='equal-family',band=1):
        w=self.weights(weighting);valid=np.array([bool(r and r['valid']) for r in chosen]);acc=[];reg=[];current_reg=[]
        for j,r in zip(self.jobs,chosen):
            s=j['scores'].get(r['method'],math.inf) if r else math.inf
            acc.append(acceptable(r,s,j['oracle'],j['oracleScore'],band))
            reg.append(max(0,s-j['oracleScore']) if math.isfinite(s) and math.isfinite(j['oracleScore']) else None)
            curr=j['rows'].get('current');current_reg.append(bool(curr and curr['valid'] and not (r and r['valid'])))
        acc=np.array(acc); current_reg=np.array(current_reg)
        specialist=np.array([bool(j['case'].get('protectedRecipes')) for j in self.jobs])
        def rate(a,mask):
            den=float(w[mask].sum());return float(w[a & mask].sum()/den) if den else None
        finite=np.array([x is not None for x in reg]);values=np.array([x or 0 for x in reg])
        families={f:rate(acc,self.family_masks[f]&self.feasible) for f in self.families}
        output={'weightedHardValidCoverage':float(w[valid].sum()/w.sum()),'acceptableCoverage':rate(acc,self.feasible),'commonAcceptableCoverage':rate(acc,self.feasible&self.common),'nicheAcceptableCoverage':rate(acc,self.feasible&~self.common),'worstFamilyCoverage':min((x for x in families.values() if x is not None),default=None),'familyCoverage':families,'currentValidHardRegressions':int(current_reg.sum()),'currentValidHardRegressionCases':len({j['case']['id'] for j,b in zip(self.jobs,current_reg) if b}),'oracleUnavailableJobs':int((~self.feasible).sum()),'acceptableJobs':int(acc.sum()),'totalJobs':len(acc),'hardValidJobs':int(valid.sum()),'meanFiniteRegret':float(np.average(values[finite],weights=w[finite])) if finite.any() else None,'maxFiniteRegret':float(values[finite].max()) if finite.any() else None,'p95FiniteRegret':float(np.quantile(values[finite],.95)) if finite.any() else None}
        output['specialistCurrentValidLossCases']=len({j['case']['id'] for j,b,sp in zip(self.jobs,current_reg,specialist) if b and sp})
        output['specialistProtectedCases']=len({j['case']['id'] for j,sp in zip(self.jobs,specialist) if sp})
        output['specialistCurrentValidCases']=len({j['case']['id'] for j,sp in zip(self.jobs,specialist) if sp and j['rows'].get('current',{}).get('valid',False)})
        output['profileCoverage']={p:rate(acc,self.feasible&np.array([j['profile']==p for j in self.jobs])) for p in PROFILES}
        alljobs=np.ones(len(self.jobs),dtype=bool)
        output['absoluteAcceptableCoverage']=rate(acc,alljobs)
        output['absoluteCommonAcceptableCoverage']=rate(acc,self.common)
        output['absoluteNicheAcceptableCoverage']=rate(acc,~self.common)
        output['absoluteFamilyCoverage']={f:rate(acc,self.family_masks[f]) for f in self.families}
        output['commonAbsoluteProfileCoverage']={p:rate(acc,self.common&np.array([j['profile']==p for j in self.jobs])) for p in PROFILES}
        output['commonFeasibleProfileCoverage']={p:rate(acc,self.common&self.feasible&np.array([j['profile']==p for j in self.jobs])) for p in PROFILES}
        output['worstProfileCommonFeasibleCoverage']=min((v for v in output['commonFeasibleProfileCoverage'].values() if v is not None),default=None)
        output['worstProfileCommonAbsoluteCoverage']=min((v for v in output['commonAbsoluteProfileCoverage'].values() if v is not None),default=None)
        output['commonProfileCounts']={p:{'acceptableBases':sum(bool(a) for j,a in zip(self.jobs,acc) if j['profile']==p and j['case']['common']),'allCommonBases':sum(j['profile']==p and j['case']['common'] for j in self.jobs),'oracleFeasibleBases':sum(j['profile']==p and j['case']['common'] and j['oracle'] is not None for j in self.jobs),'currentValidBases':sum(j['profile']==p and j['case']['common'] and j['rows'].get('current',{}).get('valid',False) for j in self.jobs),'currentValidHardRegressionCases':sum(bool(reg) for j,reg in zip(self.jobs,current_reg) if j['profile']==p and j['case']['common'])} for p in PROFILES}
        output['currentValidHardRegressionCommonCases']=len({j['case']['id'] for j,b in zip(self.jobs,current_reg) if b and j['case']['common']})
        return output

    def selection_rows(self,chosen,policy):
        out=[]
        for j,r in zip(self.jobs,chosen):
            c=j['case'];s=j['scores'].get(r['method'],math.inf) if r else math.inf;o=j['oracle']
            out.append({'policy':policy,'caseId':c['id'],'family':c['family'],'common':c['common'],'profile':j['profile'],'chosenTrial':r['id'] if r else None,'chosenMethod':r['method'] if r else None,'hardValid':bool(r and r['valid']),'oracleAvailable':o is not None,'currentValid':bool(j['rows'].get('current',{}).get('valid',False)),'acceptable':acceptable(r,s,o,j['oracleScore']),'score':s if math.isfinite(s) else None,'oracleScore':j['oracleScore'] if math.isfinite(j['oracleScore']) else None,'regret':max(0,s-j['oracleScore']) if math.isfinite(s) and math.isfinite(j['oracleScore']) else None,'oracleTrial':o['id'] if o else None,'oracleMethod':o['method'] if o else None,'area':r['metrics']['area'] if r and 'metrics' in r else None,'routeLength':r['metrics']['routeLength'] if r and 'metrics' in r else None})
        return out


def engine_methods(engine,mode='default',selected=None):
    if mode=='tuned':
        p=(selected or {})[engine]['presetIndex']
        return [f'tuned:{engine}:RIGHT:p{p}']
    return [f'engine:{engine}:RIGHT',f'engine:{engine}:DOWN']


def subset_sweep(screen,mode='default',selected=None):
    """All1023 nonempty engine subsets; mandated1..5 are unchanged;6..10 diagnostic."""
    nj=len(screen.jobs); n=len(ENGINES)
    acc=np.zeros((n,nj),dtype=bool);valid=np.zeros((n,nj),dtype=bool);score=np.full((n,nj),math.inf)
    for ei,e in enumerate(ENGINES):
        for ji,j in enumerate(screen.jobs):
            ms=engine_methods(e,mode,selected)
            acc[ei,ji]=any(j['acceptable'].get(m,False) for m in ms)
            valid[ei,ji]=any(m in j['rows'] and j['rows'][m]['valid'] for m in ms)
            score[ei,ji]=min((j['scores'].get(m,math.inf) for m in ms),default=math.inf)
    current=np.array([j['rows'].get('current',{}).get('valid',False) for j in screen.jobs])
    curracc=np.array([j['acceptable'].get('current',False) for j in screen.jobs])
    specialty=np.array([not j['case']['engines'] for j in screen.jobs])
    # Specialist semantic recipes are mandatory preserved fallback, never generic engine candidates.
    basevalid=current&specialty;baseacc=curracc&specialty
    results=[];best={}
    for fallback in [False,True]:
        fallbackvalid=current if fallback else basevalid;fallbackacc=curracc if fallback else baseacc
        for k in range(1,11):
            for inds in itertools.combinations(range(n),k):
                unionacc=acc[list(inds)].any(axis=0)|fallbackacc;unionvalid=valid[list(inds)].any(axis=0)|fallbackvalid
                bestscore=score[list(inds)].min(axis=0)
                if fallback:
                    cs=np.array([j['scores'].get('current',math.inf) for j in screen.jobs]);bestscore=np.minimum(bestscore,cs)
                else:
                    for ji,j in enumerate(screen.jobs):
                        if specialty[ji]:bestscore[ji]=j['scores'].get('current',math.inf)
                regret=np.array([max(0,s-j['oracleScore']) if math.isfinite(s) and j['oracle'] else 0 for s,j in zip(bestscore,screen.jobs)])
                finite=np.isfinite(bestscore)&screen.feasible
                names=[ENGINES[i] for i in inds]
                for weighting in WEIGHTINGS:
                    w=screen.weights(weighting)
                    def rate(a,mask):
                        den=w[mask].sum();return float(w[a&mask].sum()/den) if den else None
                    fam={f:rate(unionacc,screen.family_masks[f]&screen.feasible) for f in screen.families}
                    result={'mode':mode,'weighting':weighting,'size':k,'portfolio':names,'currentFallback':fallback,'specialistFallback':True,'hardValidCoverage':float(w[unionvalid].sum()/w.sum()),'acceptableCoverage':rate(unionacc,screen.feasible),'commonAcceptableCoverage':rate(unionacc,screen.feasible&screen.common),'nicheAcceptableCoverage':rate(unionacc,screen.feasible&~screen.common),'worstFamilyCoverage':min((v for v in fam.values() if v is not None),default=None),'familyCoverage':fam,'currentValidHardRegressionJobs':int((current&~unionvalid).sum()),'meanFiniteScoreRegret':float(np.average(regret[finite],weights=w[finite])) if finite.any() else None,'totalJobs':nj}
                    result['absoluteAcceptableCoverage']=float(w[unionacc].sum()/w.sum())
                    result['absoluteCommonAcceptableCoverage']=rate(unionacc,screen.common)
                    result['commonAbsoluteProfileCoverage']={p:rate(unionacc,screen.common&np.array([j['profile']==p for j in screen.jobs])) for p in PROFILES}
                    result['commonFeasibleProfileCoverage']={p:rate(unionacc,screen.common&screen.feasible&np.array([j['profile']==p for j in screen.jobs])) for p in PROFILES}
                    result['worstProfileCommonFeasibleCoverage']=min((v for v in result['commonFeasibleProfileCoverage'].values() if v is not None),default=None)
                    result['contractCommonPerProfile95Pass']=(result['worstProfileCommonFeasibleCoverage'] or 0)>=.95
                    result['worstProfileCommonAbsoluteCoverage']=min((v for v in result['commonAbsoluteProfileCoverage'].values() if v is not None),default=None)
                    result['absoluteCommonPerProfile95Pass']=(result['worstProfileCommonAbsoluteCoverage'] or 0)>=.95
                    results.append(result)
                    cov=result['worstFamilyCoverage'] if weighting=='worst-family' else result['acceptableCoverage']
                    objective=(result['hardValidCoverage'],cov if cov is not None else -1,result['commonAcceptableCoverage'] or 0,-(result['meanFiniteScoreRegret'] or 0),tuple(-x for x in inds))
                    key=f'{mode}|{weighting}|fallback={fallback}|k={k}'
                    if key not in best or objective>best[key]['_objective']:best[key]={**result,'_objective':objective}
                    if result['contractCommonPerProfile95Pass'] and result['currentValidHardRegressionJobs']==0:
                        qkey=key+'|gate-qualified'
                        if qkey not in best or objective>best[qkey]['_objective']:best[qkey]={**result,'_objective':objective}
    for r in best.values():r.pop('_objective',None)
    return results,best


def policies_for_subset(screen,portfolio,mode='default',selected=None,current_fallback=False,band=1):
    choices=[]
    for j in screen.jobs:
        methods=[m for e in portfolio for m in engine_methods(e,mode,selected)]
        if not j['case']['engines'] or current_fallback:methods+=['current']
        choices.append(screen.choose(j,methods,band=band))
    return choices


def tune_phase(args,cases):
    rows,info=load_trials('tuning-development',not args.allow_partial)
    if not rows:raise ValueError('No tuning results')
    ids=sorted({r['caseId'] for r in rows}); subset=[c for c in cases if c['id'] in ids]
    screen=Screen(subset,rows); selections={};comparison=[]
    for e in ENGINES:
        trials=[]
        for p in range(4):
            method=f'tuned:{e}:RIGHT:p{p}'; chosen=[j['rows'].get(method) for j in screen.jobs]
            summary=screen.evaluate(chosen);summary.update(engine=e,presetIndex=p,method=method)
            comparison.append(summary)
            objective=(summary['weightedHardValidCoverage'],summary['acceptableCoverage'] or 0,-(summary['meanFiniteRegret'] or 0),-p)
            exemplar=next((r for r in rows if r['method']==method),None)
            trials.append((objective,p,exemplar,summary))
        _,p,exemplar,summary=max(trials,key=lambda t:t[0])
        attrs=dict(exemplar['_task'].get('layout',{}).get('attrs',{})) if exemplar else {}
        # tree root fourth preset means last source node, not the exemplar's literal ID.
        rootRule='last-node' if e=='tree' and p==3 else None
        selections[e]={'presetIndex':p,'direction':'RIGHT','attrs':attrs,'rootRule':rootRule,'selectionSummary':summary}
    tasks=[];reuse=[]
    for c in cases:
        for e in c.get('engines',[]):
            sel=selections[e];p=sel['presetIndex']
            if p==0:
                reuse.append({'caseId':c['id'],'engine':e,'presetIndex':p,'trial':f'C-development-{c["id"]}-{e}-RIGHT'});continue
            # Tuning-set winners are already measured; do not spend a distinct duplicate.
            prior=next((r for r in rows if r['caseId']==c['id'] and r['method']==f'tuned:{e}:RIGHT:p{p}'),None)
            if prior:
                reuse.append({'caseId':c['id'],'engine':e,'presetIndex':p,'trial':prior['id']});continue
            attrs=dict(sel['attrs'])
            if sel['rootRule']=='last-node':attrs['root']=c['nodeIDs'][-1]
            tasks.append({'id':f'G-selected-development-{c["id"]}-{e}-p{p}','stage':'G-selected-development','caseId':c['id'],'family':c['family'],'split':'development','kind':'source','sourcePath':c['path'],'layout':{'engine':e,'direction':'RIGHT','keepFit':True,'attrs':attrs},'tag':'selected-preset','presetIndex':p,'timeoutMs':NORMALIZED_TRIAL_BUDGET_MS})
    out=ROOT/'data/analysis/development';out.mkdir(parents=True,exist_ok=True)
    result={'analysisVersion':VERSION,'at':datetime.now(timezone.utc).isoformat(),'phase':'development tuning only','heldoutAccessed':False,'selectionObjective':['hard-valid coverage','five-profile acceptable coverage against 40-candidate tuning-set oracle','mean finite score regret','lowest preset index'],'equalBudget':{'engines':10,'presetsEach':4,'baseCasesEach':12,'distinctTasks':480},'limitations':['Global presets selected on fixed12development cases. Coverage estimates on the same12 are training estimates. General portfolio removal claims require selected presets crossed over full development and then frozen heldout evaluation.','The tuning oracle is restricted to 40preset candidates on12bases; it is not the main default-screen oracle.','Source constraints and fit retained. RIGHT is the preset direction; direction tuning is not silently added.'],'inputs':[info],'selected':selections,'comparison':comparison,'reuse':reuse,'additionalDevelopmentTasks':len(tasks)}
    dump(out/'tuning-selection.json',result);write_csv(out/'tuning-comparison.csv',comparison)
    dump(ROOT/'evaluation/tasks/selected-presets-development.json',tasks)
    print(json.dumps({'phase':'tune','rows':len(rows),'selected':{e:s['presetIndex'] for e,s in selections.items()},'additionalDevelopmentTasks':len(tasks),'output':str(out/'tuning-selection.json')}))
    return result


def selected_tuned_rows(cases,default_rows,tuning_result,args,split='development'):
    selected=tuning_result['selected']
    if split=='development':
        tuning,ti=load_trials('tuning-development',not args.allow_partial)
    else:
        tuning=[];ti={'stem':'tuning-development','notReadDuringHeldout':True}
    extra,ei=load_trials('selected-presets-'+split,not args.allow_partial,split=split)
    allrows=default_rows+tuning+extra;byid={r['id']:r for r in allrows};new=[];missing=[]
    for c in cases:
        for e in c['engines']:
            p=selected[e]['presetIndex'];method=f'tuned:{e}:RIGHT:p{p}'
            # A selected default is exactly the canonical C trial, not a more fortunate
            # duplicate from the tuning stage. This prevents execution-repeat cherry-picking.
            r=byid.get(f'C-{split}-{c["id"]}-{e}-RIGHT') if p==0 else next((r for r in allrows if r['caseId']==c['id'] and r['method']==method),None)
            if r is None:missing.append(f'{c["id"]}/{method}');continue
            nr={**r,'method':method,'reusedFrom':r['id']};new.append(nr)
    if missing and not args.allow_partial:raise ValueError(f'{len(missing)} selected-preset {split} outcomes missing; run emitted tasks first')
    return new,[ti,ei],missing


def fit_tree(screen,portfolio,features,profile=None,mode='default',selected=None):
    # Specialist-only cases are dispatched to their preserved authored recipe outside the tree.
    cases=[c for c in screen.cases if c['engines']];ids=[c['id'] for c in cases]
    labels=[m for e in portfolio for m in engine_methods(e,mode,selected)]
    # No current-oracle label: preserve-current is an explicit validity guard, measured separately.
    costs=np.zeros((len(cases),len(labels),3));wcase=np.zeros(len(cases))
    weights=screen.weights('equal-family')
    for ci,c in enumerate(cases):
        for p in ([profile] if profile else PROFILES):
            ji=screen.index[(c['id'],p)];j=screen.jobs[ji];wj=weights[ji];wcase[ci]+=wj
            for li,label in enumerate(labels):
                r=j['rows'].get(label);valid=bool(r and r['valid'])
                costs[ci,li,0]+=wj*(not valid)
                costs[ci,li,1]+=wj*(j['oracle'] is not None and not j['acceptable'].get(label,False))
                s=j['scores'].get(label,math.inf)
                costs[ci,li,2]+=wj*(min(1000,max(0,s-j['oracleScore'])) if valid and j['oracle'] else 0)
    def leaf(indices):
        sums=costs[indices].sum(axis=0);best=min(range(len(labels)),key=lambda li:(tuple(np.round(sums[li],12)),labels[li]))
        return {'type':'leaf','method':labels[best],'trainingBases':len(indices),'trainingLoss':sums[best].tolist()},sums[best]
    def recurse(indices,depth):
        node,basecost=leaf(indices)
        if depth>=3 or len(indices)<8:return node,basecost
        best=None
        for feat in FEATURES:
            vals=sorted({features[ids[i]][feat] for i in indices})
            for threshold in [(a+b)/2 for a,b in zip(vals,vals[1:])]:
                left=[i for i in indices if features[ids[i]][feat]<=threshold];right=[i for i in indices if features[ids[i]][feat]>threshold]
                if min(len(left),len(right))<4:continue
                ln,lc=leaf(left);rn,rc=leaf(right);total=lc+rc
                key=(tuple(np.round(total,12)),FEATURES.index(feat),threshold)
                if tuple(np.round(total,12))<tuple(np.round(basecost,12)) and (best is None or key<best[0]):best=(key,feat,threshold,left,right)
        if best is None:return node,basecost
        _,feat,threshold,left,right=best
        ln,lc=recurse(left,depth+1);rn,rc=recurse(right,depth+1)
        return {'type':'split','feature':feat,'threshold':threshold,'trainingBases':len(indices),'left':ln,'right':rn},lc+rc
    if not cases or not labels:return {'type':'leaf','method':'current','trainingBases':len(cases),'trainingLoss':[0,0,0]}
    tree,_=recurse(list(range(len(cases))),0)
    return tree


def predict_tree(tree,features):
    while tree['type']=='split':tree=tree['left'] if features[tree['feature']]<=tree['threshold'] else tree['right']
    return tree['method']


def validity_guard_choices(screen,chosen):
    out=[];fallback=0
    for j,r in zip(screen.jobs,chosen):
        current=j['rows'].get('current')
        if (not r or not r['valid']) and current and current['valid']:out.append(current);fallback+=1
        else:out.append(r)
    return out,fallback


def tree_choices(screen,tree,features,guard=False,goal_trees=None):
    result=[];fallback_count=0
    for j in screen.jobs:
        c=j['case'];current=j['rows'].get('current')
        if not c['engines']:r=current
        else:
            t=goal_trees[j['profile']] if goal_trees else tree
            method=predict_tree(t,features[c['id']]);r=j['rows'].get(method)
            # No applicability decision from geometry. Missing source engine label falls back.
            if r is None:r=current;fallback_count+=1
            elif guard and not r['valid'] and current and current['valid']:r=current;fallback_count+=1
        result.append(r)
    return result,fallback_count


def leave_one_out(screen,mode='default',selected=None):
    full=policies_for_subset(screen,ENGINES,mode,selected,current_fallback=False)
    fullsummary=screen.evaluate(full);rows=[];witness=[]
    for e in ENGINES:
        chosen=policies_for_subset(screen,[x for x in ENGINES if x!=e],mode,selected,current_fallback=False)
        summary=screen.evaluate(chosen)
        losses=[];numeric=[]
        for j,a,b in zip(screen.jobs,full,chosen):
            av=bool(a and j['acceptable'].get(a['method'],False));bv=bool(b and j['acceptable'].get(b['method'],False))
            if av and not bv:
                losses.append({'caseId':j['case']['id'],'family':j['case']['family'],'common':j['case']['common'],'profile':j['profile'],'withTrial':a['id'],'withoutTrial':b['id'] if b else None,'hardLoss':not bool(b and b['valid'])})
            if a and a['valid'] and (not b or j['scores'].get(b['method'],math.inf)>j['scores'][a['method']]+1e-8):numeric.append(j['case']['id'])
        rows.append({'mode':mode,'removedEngine':e,'coverageLoss':(fullsummary['acceptableCoverage'] or 0)-(summary['acceptableCoverage'] or 0),'commonCoverageLoss':(fullsummary['commonAcceptableCoverage'] or 0)-(summary['commonAcceptableCoverage'] or 0),'practicalLossJobs':len(losses),'practicalLossCases':len({l['caseId'] for l in losses}),'numericWinCases':len(set(numeric)),'remainingSummary':summary})
        witness.extend({'removedEngine':e,'mode':mode,**x} for x in losses)
    return {'full':fullsummary,'removals':rows,'witnesses':witness}


def method_summaries(screen):
    rows=[]
    for method in screen.methods:
        chosen=[j['rows'].get(method) for j in screen.jobs]
        # Fixed global engine alternatives preserve structural recipes by applicability.
        if method.startswith(('engine:','tuned:','documented-default')):
            chosen=[j['rows'].get('current') if not j['case']['engines'] else r for j,r in zip(screen.jobs,chosen)]
        for weighting in WEIGHTINGS:
            s=screen.evaluate(chosen,weighting);rows.append({'method':method,'weighting':weighting,**s})
    return rows


def runtime_and_checkpoint_summary(rows):
    unique={r['id']:r for r in rows};groups=collections.defaultdict(list);checkpoints=[]
    for r in unique.values():
        task=r.get('_task',{});engine=task.get('layout',{}).get('engine') or r['method']
        groups[engine].append(r)
        if r.get('layoutCheckpoint'):
            checkpoints.append({'trial':r['id'],'caseId':r['caseId'],'method':r['method'],'status':r['status'],'checkpoint':r['layoutCheckpoint'],'compileMs':r.get('timing',{}).get('compileMs'),'engineCalls':r.get('engineCalls'),'timeoutPhase':r.get('timeoutPhase'),'layoutReports':r.get('reports',[]),'completeRouteAvailable':False if r['status']=='timed_out' else bool(r.get('geometry')),'includedInFullQuality':r['status']=='ok'})
    def quantiles(xs):
        vals=[float(x) for x in xs if x is not None and math.isfinite(float(x))]
        return {'n':len(vals),'median':float(np.median(vals)) if vals else None,'p90':float(np.quantile(vals,.9)) if vals else None,'p95':float(np.quantile(vals,.95)) if vals else None,'maximum':max(vals) if vals else None}
    result=[]
    for engine,rs in sorted(groups.items()):
        successes=[r for r in rs if r['status']=='ok'];timeouts=[r for r in rs if r['status']=='timed_out']
        result.append({'methodOrEngine':engine,'trials':len(rs),'statuses':dict(collections.Counter(r['status'] for r in rs)),'hardValid':sum(r['valid'] for r in rs),'completedTotalMs':quantiles([r.get('timing',{}).get('totalMs') for r in successes]),'completedCompileMs':quantiles([r.get('timing',{}).get('compileMs') for r in successes]),'completedRoutingMs':quantiles([r.get('timing',{}).get('routingMs') for r in successes]),'completedLabelMs':quantiles([r.get('timing',{}).get('labelMs') for r in successes]),'timeoutRate':len(timeouts)/len(rs),'timeoutBudgetMs':NORMALIZED_TRIAL_BUDGET_MS,'timedOutAfterLayout':sum(bool(r.get('layoutCheckpoint')) for r in timeouts),'timeoutCompileMsWhenCheckpointExists':quantiles([r.get('timing',{}).get('compileMs') for r in timeouts if r.get('layoutCheckpoint')]),'rawTimeoutWorkerMs':quantiles([r.get('timing',{}).get('workerMs') for r in timeouts])})
    return {'definition':'Full-quality validity includes all canonical trials, including failures/timeouts. Completed timing quantiles condition on execution completion and must be read with timeout rates. Original90s timeout attempts are failures under uniform15s budget; raw spent time remains recorded. Layout checkpoints are partial engine evidence only and never receive fabricated routes or full-quality scores. Cache may reduce wall timing for identical geometry; see task/runtime logs.','groups':result,'layoutCheckpoints':checkpoints,'totalUniqueTrials':len(unique)}


def raw_profile_table(screen):
    rows=[]
    for j in screen.jobs:
        for method,r in j['rows'].items():
            m=r.get('metrics',{});score=j['scores'][method]
            rows.append({'caseId':j['case']['id'],'family':j['case']['family'],'split':j['case']['split'],'common':j['case']['common'],'profile':j['profile'],'method':method,'trial':r['id'],'status':r.get('status'),'hardValid':r['valid'],'hardDefects':m.get('hardDefects'),'requiredIntentFailures':m.get('requiredIntentFailures'),'score':score if math.isfinite(score) else None,'oracleScore':j['oracleScore'] if math.isfinite(j['oracleScore']) else None,'acceptable':j['acceptable'][method],'targetAspect':target_aspect(j['case']),'rawAspectErrorAgainst1_6':m.get('aspectError'),'aspectErrorAgainstJob':abs(math.log(max(1e-12,m['aspect'])/target_aspect(j['case']))) if m.get('aspect') else None,'area':m.get('area'),'routeLength':m.get('routeLength'),'balancedDIper10':m.get('weightingScores',{}).get('balanced'),'directDIper10':m.get('weightingScores',{}).get('direct'),'traceableDIper10':m.get('weightingScores',{}).get('traceable'),'runtimeMs':r.get('timing',{}).get('totalMs')})
    return rows


def fixed_policy_sensitivity(screen,policies,options,mode='default',selected=None):
    out=[];portfolios={o['size']:o['portfolio'] for o in options}
    for name,cs in policies.items():
        match=re.search(r'(?:tuned-)?k(\d+)-configuration-oracle',name)
        for b in [.5,1,2]:
            if match:
                # Rechoose within the already frozen engine set under this band.
                # No subset, global preset, threshold, or selector refitting occurs.
                choices=policies_for_subset(screen,portfolios[int(match.group(1))],mode,selected,current_fallback=name.endswith('current-fallback'),band=b)
                semantics='configuration oracle reselected within fixed portfolio'
            else:choices=cs;semantics='frozen deployed selection'
            out.append({'policy':name,'bandMultiplier':b,'selectionSemantics':semantics,'portfolioAndTreeRefitted':False,**screen.evaluate(choices,band=b)})
    return out


def proposal_from_results(screen,best,features,mode='default',selected=None):
    # Pick smallest supported k on development. If none meets the full contract,
    # retain a descriptive best-k proposal and make failure explicit.
    options=[]
    for k in range(1,6):
        key=f'{mode}|equal-family|fallback=False|k={k}'
        r=best.get(key+'|gate-qualified',best[key]);portfolio=r['portfolio']
        tree=fit_tree(screen,portfolio,features,mode=mode,selected=selected)
        goals={p:fit_tree(screen,portfolio,features,p,mode,selected) for p in PROFILES}
        raw,_=tree_choices(screen,tree,features);guard,count=tree_choices(screen,tree,features,guard=True)
        goalraw,_=tree_choices(screen,tree,features,goal_trees=goals);goalguard,gcount=tree_choices(screen,tree,features,guard=True,goal_trees=goals)
        ps={'size':k,'portfolio':portfolio,'mode':mode,'oracle':r,'selectorTree':tree,'goalTrees':goals,'selector':screen.evaluate(raw),'selectorWithValidityGuard':screen.evaluate(guard),'goalSelector':screen.evaluate(goalraw),'goalSelectorWithValidityGuard':screen.evaluate(goalguard),'validityGuardFallbackJobs':count,'goalValidityGuardFallbackJobs':gcount}
        ps['developmentThresholdMet']=bool((ps['selectorWithValidityGuard']['worstProfileCommonFeasibleCoverage'] or 0)>=.95 and ps['selectorWithValidityGuard']['currentValidHardRegressions']==0)
        ps['developmentContractThresholdMet']=ps['developmentThresholdMet']
        ps['developmentAbsoluteStressTestMet']=bool((ps['selectorWithValidityGuard']['worstProfileCommonAbsoluteCoverage'] or 0)>=.95 and ps['selectorWithValidityGuard']['currentValidHardRegressions']==0)
        options.append(ps)
    qualifies=[o for o in options if o['developmentThresholdMet']]
    choice=qualifies[0] if qualifies else max(options,key=lambda o:(o['selectorWithValidityGuard']['worstProfileCommonFeasibleCoverage'] or 0,o['selectorWithValidityGuard']['absoluteCommonAcceptableCoverage'] or 0,o['selectorWithValidityGuard']['absoluteAcceptableCoverage'] or 0,-o['size']))
    return {'options':options,'choice':choice,'thresholdMet':bool(qualifies),'decisionStatus':'development proposal; heldout and visual review required','acceptanceGate':'contract: at least95% relative feasible-pool common coverage separately under each profile, zero new current-valid hard failures, preserved specialist task or explicit escape. Separately report conservative absolute95% stress test including all common bases' ,'validityGuardStatus':'proposed wrapper behavior measured by selecting current-source result only after a hard failure; not a shipped automatic feature','smallestPortfolioInterpretation':'Oracle engine-set upper bounds are exhaustive over1023nonempty subsets; mandated1..5 are637subsets,6..10 are diagnostics. Selectors are fitted only for the oracle-best subset at each size1..5: the smallest successful selector is among these five proposals, not an exhaustive optimum over all subset/tree combinations. Preserving current-source fallback can retain engines outside the visible portfolio.'}


def method_configuration(method,case,selected=None,source_path=None):
    """Convert a frozen method label to worker layout options; no outcomes consulted."""
    if method=='current':return None
    if method=='documented-default':return {'engine':'compound-flow' if case.get('groupCount',0) else 'layered','direction':'auto','keepFit':True,'attrs':{}}
    parts=method.split(':')
    if parts[0]=='recipe':return {'remove':True,'recipe':None if parts[1]=='implicit' else parts[1],'direction':None if parts[2]=='auto' else parts[2],'keepFit':True}
    if parts[0] not in ['engine','tuned']:raise ValueError('Unknown method '+method)
    attrs={};engine=parts[1]
    if parts[0]=='tuned':
        sel=(selected or {})[engine];attrs=dict(sel['attrs'])
        if sel.get('rootRule')=='last-node':
            ids=[]
            for line in (ROOT/(source_path or case['path'])).read_text().splitlines():
                tokens=shlex.split(line,comments=True)
                if tokens and tokens[0]=='node':ids.append(tokens[1])
            if ids:attrs['root']=ids[-1]
    return {'engine':engine,'direction':parts[2],'keepFit':True,'attrs':attrs}


def predict_cold_policy(compact,case,policy_name='selector',edit=None,goal=None):
    """Replayable pre-layout prediction, including an explicit user direction override."""
    source_path=(edit or {}).get('path',case['path'])
    cc={**case,'path':source_path};features=raw_pre_layout_features(cc)
    if policy_name=='current' or not case['engines']:method='current'
    elif policy_name=='single':method=compact['bestSingle']['method']
    elif policy_name in ['selector','goal']:
        pred=compact['preferredSelector']
        tree=pred['goalTrees'][goal] if policy_name=='goal' else pred['tree']
        method=predict_tree(tree,features)
    else:raise ValueError('Unknown cold policy '+policy_name)
    config=method_configuration(method,case,compact.get('presetMap'),source_path)
    direction_override=None
    if config and edit and edit.get('operation')=='change-direction':
        direction_override=edit['direction'].upper();config['direction']=direction_override
    return {'caseId':case['id'],'family':case['family'],'split':case['split'],'editId':edit['id'] if edit else 'base','sourcePath':source_path,'policy':policy_name,'goal':goal,'method':method,'layout':config,'features':features,'requestedDirectionOverride':direction_override,'preservedSpecialistSource':not bool(case['engines']),'proposedValidityGuard':policy_name in ['single','selector','goal'],'predictionUsesOutcomes':False}


def write_cold_predictions(cases,compact,split):
    rows=[]
    for c in cases:
        for edit in [None]+c.get('edits',[]):
            for p in ['current','single','selector']:rows.append(predict_cold_policy(compact,c,p,edit))
    dest=ROOT/'data/analysis'/split
    dump(dest/'cold-policy-predictions.json',rows);write_csv(dest/'cold-policy-predictions.csv',rows)
    return rows


def write_edit_handoff(cases,compact,screen,split):
    predictions=[]
    for c in cases:
        if not c.get('edits'):continue
        for short,name in [('single','best-single'),('selector','feature-selector')]:
            pre=predict_cold_policy(compact,c,short)
            candidate=screen.lookup(c['id'],pre['method']);current=screen.lookup(c['id'],'current')
            guarded=short in ['single','selector'] and (not candidate or not candidate['valid']) and current and current['valid']
            effective=current if guarded else candidate
            if effective:
                trial=effective['id']
                if effective['status']=='ok':
                    reference=effective.get('geometry',f'data/geometry/{trial}.json.gz');availability='complete geometry and routes'
                else:
                    reference=effective.get('layoutCheckpoint',f'data/layout-checkpoints/{trial}.json.gz')
                    availability='layout-checkpoint-only' if (ROOT/reference).exists() else 'unavailable'
            else:
                trial=None;reference=None;availability='unavailable'
            for edit in [None]+c['edits']:
                row=predict_cold_policy(compact,c,short,edit)
                predictions.append({**row,'policy':name,'reference':reference,'preeditRawMethod':pre['method'],'preeditEffectiveMethod':effective['method'] if effective else None,'preeditTrial':trial,'preeditGuardUsed':bool(guarded),'preeditCanonicalStatus':effective.get('status') if effective else None,'preeditHardValid':bool(effective and effective['valid']),'referenceAvailability':availability,'referenceSamePolicyBeforeEdit':True,'referenceHistoryAvailable':bool(effective and effective['status']=='ok'),'requestOverrideAppliedBeforeLayout':True})
    dest=ROOT/'data/edit-policy-predictions.json'
    old=read_json(dest).get('predictions',[]) if dest.exists() and isinstance(read_json(dest),dict) else []
    old=[p for p in old if p.get('split')!=split]
    dump(dest.with_name('edit-policy-predictions-'+split+'.json'),{'schema':'edit-policy-predictions-1','split':split,'heldoutPolicyFitted':False,'canonicalRule':'first terminal trial row; no later attempt references','referenceRule':'same guarded policy pre-edit output; canonical timeouts use layout checkpoint only','predictions':predictions})
    dump(dest,{'schema':'edit-policy-predictions-1','heldoutPolicyFitted':False,'canonicalRule':'first terminal trial row; no later attempt references','referenceRule':'same-policy pre-edit output; both proposed policy guards may retain current source on pre-edit hard failure; canonical timeouts use layout checkpoint only','predictions':old+predictions})
    return predictions


def edit_predictions_phase(args,cases):
    split=args.split
    if split=='heldout':policy,_=frozen_policy();compact=policy['compact']
    else:policy=read_json(ROOT/'data/policy-proposal.json');compact=policy['compact']
    rows,_=load_trials('screen-'+split,not args.allow_partial,split=split)
    extra,_=load_trials('documented-default-'+split,not args.allow_partial,split=split);rows+=extra
    if policy.get('tunedProposal'):
        tr,_,_=selected_tuned_rows(cases,rows,{'selected':policy['tunedProposal']['selection']},args,split=split);rows+=tr
    screen=Screen(cases,rows)
    preds=write_edit_handoff(cases,compact,screen,split)
    print(json.dumps({'phase':'edit-predictions','split':split,'predictions':len(preds),'fittedAnyPolicy':False,'file':'data/edit-policy-predictions.json'}))


def build_compact_policy(full,screen):
    proposals=[('default',full['defaultProposal']['choice'])]
    if full.get('tunedProposal'):proposals.append(('tuned',full['tunedProposal']['results']['choice']))
    def objective(pair):
        mode,p=pair;s=p['selectorWithValidityGuard']
        return (-(s['currentValidHardRegressions']),s['worstProfileCommonFeasibleCoverage'] or 0,s['absoluteCommonAcceptableCoverage'] or 0,s['absoluteAcceptableCoverage'] or 0,-p['size'],mode=='default')
    mode,p=max(proposals,key=objective)
    presets=full['tunedProposal']['selection'] if full.get('tunedProposal') else {}
    ranked=[x for x in method_summaries(screen) if x['weighting']=='equal-family' and x['method'].startswith(('engine:','tuned:'))]
    ranked.sort(key=lambda r:(-r['weightedHardValidCoverage'],-(r['acceptableCoverage'] or 0),r['meanFiniteRegret'] or 0,r['method']))
    joint=[];used=set()
    exemplar=next(c for c in screen.cases if c['engines'])
    for row in ranked:
        engine=row['method'].split(':')[1]
        if engine in used:continue
        used.add(engine);config=method_configuration(row['method'],exemplar,presets)
        joint.append({'method':row['method'],'engine':engine,'layout':config,'rootRule':presets.get(engine,{}).get('rootRule') if row['method'].startswith('tuned:') else None,'developmentSummary':row})
        if len(joint)==3:break
    single=full['bestFixedGlobal'];single_config=method_configuration(single['method'],exemplar)
    compact={'schema':'draftably-policy-compact-1','frozen':False,'analysisVersion':VERSION,'analysisCodeSha256':sha(__file__),'splitSha256':full['splitSha256'],'sourceProposal':'data/policy-proposal.json','bestSingle':{'method':single['method'],'layout':single_config,'developmentSummaryUnguarded':single,'validityGuard':'proposed: retain current source on candidate hard failure when current is valid; raw and guarded results reported separately'},'defaultPortfoliosBySize':{str(o['size']):o['portfolio'] for o in full['defaultProposal']['options']},'tunedPortfoliosBySize':{str(o['size']):o['portfolio'] for o in full['tunedProposal']['results']['options']} if full.get('tunedProposal') else {},'preferredSelector':{'mode':mode,'size':p['size'],'portfolio':p['portfolio'],'tree':p['selectorTree'],'goalTrees':p['goalTrees'],'developmentSummary':p['selectorWithValidityGuard'],'developmentThresholdMet':p['developmentThresholdMet'],'validityGuard':'proposed: retain current authored source only when candidate hard-invalid and current valid; guard never chooses by post-layout soft quality'},'presetMap':presets,'jointLayoutChoices':joint,'jointChoiceRule':'best three distinct-engine global configurations, ranked by hard-valid coverage, acceptable coverage, finite regret; default and selected presets share reference oracle','sourceIntentRule':'Nested structural recipes, authored pins and required hints are preserved. Explicit change-direction edits override the predicted/default direction with the requested direction before compilation.','acceptanceGate':'contract: at least95% relative feasible-pool common coverage separately per profile, no new current-valid hard failure, specialist losses need explicit escape. Conservative absolute95% is separate sensitivity','proposedValidityGuards':{'best-single':True,'feature-selector':True,'current-source':False},'proposalOnly':True}
    return compact


def develop_phase(args,cases):
    rows,info=load_trials('screen-development',not args.allow_partial)
    infos=[info]
    for stem in ['documented-default-development']:
        extra,ei=load_trials(stem,not args.allow_partial)
        rows+=extra
        if ei['exists']:infos.append(ei)
    tune_path=ROOT/'data/analysis/development/tuning-selection.json'
    tuning=read_json(tune_path) if tune_path.exists() else None
    tunedrows=[];tunedinfos=[];tunedmissing=[]
    if args.include_tuned:
        if not tuning:raise ValueError('Run --phase tune first')
        tunedrows,tunedinfos,tunedmissing=selected_tuned_rows(cases,rows,tuning,args)
    screen=Screen(cases,rows+tunedrows);features={c['id']:raw_pre_layout_features(c) for c in cases}
    sweeps,best=subset_sweep(screen);proposal=proposal_from_results(screen,best,features)
    out=ROOT/'data/analysis/development';out.mkdir(parents=True,exist_ok=True)
    dump(out/'inputs.json',infos);dump(out/'features.json',{'definition':'source tokens only; containment is not a graph edge; cycles use directed constraining edges; no geometry/family/ID labels','featureOrder':FEATURES,'cases':features})
    write_csv(out/'profile-scores.csv',raw_profile_table(screen));dump(out/'method-summaries.json',method_summaries(screen));write_csv(out/'method-summaries.csv',method_summaries(screen))
    dump(out/'portfolio-oracle-best.json',best);write_csv(out/'portfolio-oracle-all.csv',sweeps)
    removal=leave_one_out(screen);dump(out/'leave-one-engine-out-fixed.json',removal);write_csv(out/'leave-one-engine-out-fixed-witnesses.csv',removal['witnesses'])
    dump(out/'selector-proposals.json',proposal)
    policies={};selections=[]
    for name,method in [('current-authored','current'),('implicit-recipe','recipe:implicit:auto'),('documented-default','documented-default')]:
        if method in screen.methods:
            chosen=[j['rows'].get(method) if j['case']['engines'] or method=='current' else j['rows'].get('current') for j in screen.jobs]
            policies[name]=chosen
    fixed=[r for r in method_summaries(screen) if r['weighting']=='equal-family' and r['method'].startswith('engine:')]
    fixed.sort(key=lambda r:(-r['weightedHardValidCoverage'],-(r['acceptableCoverage'] or 0),r['meanFiniteRegret'] or 0,r['method']))
    bestfixed=fixed[0] if fixed else None
    if bestfixed:
        policies['best-fixed-global']=[j['rows'].get(bestfixed['method']) if j['case']['engines'] else j['rows'].get('current') for j in screen.jobs]
        policies['best-fixed-global-validity-guard'],_=validity_guard_choices(screen,policies['best-fixed-global'])
    for option in proposal['options']:
        k=option['size'];port=option['portfolio'];tree=option['selectorTree'];goals=option['goalTrees']
        policies[f'k{k}-configuration-oracle']=policies_for_subset(screen,port)
        policies[f'k{k}-configuration-oracle-current-fallback']=policies_for_subset(screen,port,current_fallback=True)
        policies[f'k{k}-prelayout-selector'],_=tree_choices(screen,tree,features)
        policies[f'k{k}-prelayout-selector-validity-guard'],_=tree_choices(screen,tree,features,True)
        policies[f'k{k}-goal-selector-validity-guard'],_=tree_choices(screen,tree,features,True,goals)
    summaries=[];sensitivity=[]
    for name,chosen in policies.items():
        selections+=screen.selection_rows(chosen,name)
        for w in WEIGHTINGS:summaries.append({'policy':name,'weighting':w,**screen.evaluate(chosen,w)})
    sensitivity=fixed_policy_sensitivity(screen,policies,proposal['options'])
    dump(out/'policy-summaries.json',summaries);write_csv(out/'policy-summaries.csv',summaries);write_csv(out/'policy-case-selections.csv',selections);dump(out/'band-sensitivity-no-retuning.json',sensitivity)
    rawfail=[{'trial':r['id'],'caseId':r['caseId'],'method':r['method'],'status':r.get('status'),'hard':r.get('hard'),'intent':r.get('intent',{}).get('failures'),'error':r.get('error')} for r in rows if not r['valid']]
    dump(out/'hard-failures.json',rawfail)
    hardsummary={'trials':len(rows),'statuses':dict(collections.Counter(r.get('status') for r in rows)),'hardValid':sum(r['valid'] for r in rows),'hardInvalid':len(rawfail),'casesWithoutAnyHardValidCandidate':sorted({j['case']['id'] for j in screen.jobs if not j['oracle']})}
    dump(out/'hard-valid-summary.json',hardsummary)
    dump(out/'runtime-and-layout-checkpoints.json',runtime_and_checkpoint_summary(rows+tunedrows))
    proposed={'analysisVersion':VERSION,'analysisCodeSha256':sha(__file__),'createdAt':datetime.now(timezone.utc).isoformat(),'frozen':False,'heldoutAccessed':False,'baseline':read_json(ROOT/'data/protocol-freeze.json')['baseline'],'splitSha256':sha(ROOT/'corpus/manifest.json'),'scoring':{'profiles':PROFILES,'bands':BANDS,'aspectClarification':'Declared job target format, free1.6; raw worker1.6 error retained separately. Approved addendum before rankings.','primaryWeighting':'equal-family','profileWeight':'equal fifths per base for descriptive aggregation; contract gate separately per profile relative to feasible common pool; absolute all-common coverage separately visible','minAreaPool':'all hard-valid current, 20engine-direction defaults, 5recipe baselines, documented-default and selected global presets if measured on the same base','oracleReference':'union of measured default and selected-preset configurations, shared by policy comparisons' if tunedrows else 'default-only preview; no selected preset results included'},'inputs':infos+tunedinfos,'features':FEATURES,'featureDefinition':'node/group declared source tokens; edge graph includes group endpoints; components do not add containment edges; cycles use directed constraining edges','canonicalResults':'first terminal row per task ID; later retries are diagnostics only','treeLimits':{'maxDepth':3,'minimumDevelopmentBasesPerLeaf':4},'defaultProposal':proposal,'bestFixedGlobal':bestfixed,'tunedProposal':None,'limitations':['Development coverage is training performance, not validation.','No geometry or post-layout quality feature is used by the fitted tree.','The per-base oracle can choose among directions and configurations after seeing outcomes; selectors cannot.','Static stable profile does not substitute for edit-stage displacement results.','Generic replacements never run on root sequence/lanes cases; current specialist source is preserved outside the portfolio.','Hard gate and practical bands remain frozen; no visual human preference inferred from metric scores.','Policy freeze must wait for visual-band review and routing/edit analyses.']}
    if tunedrows:
        # One shared oracle for fair default-vs-retuned policy comparisons. The policy
        # candidate methods are still restricted to selected global presets only.
        # Unselected tuning presets do not enter the shared oracle.
        tscreen=screen
        tsweep,tbest=subset_sweep(tscreen,'tuned',tuning['selected'])
        tproposal=proposal_from_results(tscreen,tbest,features,'tuned',tuning['selected'])
        dump(out/'retuned-portfolio-oracle-best.json',tbest);write_csv(out/'retuned-portfolio-oracle-all.csv',tsweep)
        trem=leave_one_out(tscreen,'tuned',tuning['selected']);dump(out/'leave-one-engine-out-retuned.json',trem);write_csv(out/'leave-one-engine-out-retuned-witnesses.csv',trem['witnesses'])
        write_csv(out/'retuned-profile-scores.csv',raw_profile_table(tscreen));dump(out/'retuned-selector-proposals.json',tproposal)
        tpolicies={'current-authored':[j['rows'].get('current') for j in tscreen.jobs]}
        for option in tproposal['options']:
            k=option['size'];port=option['portfolio'];tree=option['selectorTree'];goals=option['goalTrees']
            tpolicies[f'tuned-k{k}-configuration-oracle']=policies_for_subset(tscreen,port,'tuned',tuning['selected'])
            tpolicies[f'tuned-k{k}-configuration-oracle-current-fallback']=policies_for_subset(tscreen,port,'tuned',tuning['selected'],current_fallback=True)
            tpolicies[f'tuned-k{k}-prelayout-selector'],_=tree_choices(tscreen,tree,features)
            tpolicies[f'tuned-k{k}-prelayout-selector-validity-guard'],_=tree_choices(tscreen,tree,features,True)
            tpolicies[f'tuned-k{k}-goal-selector-validity-guard'],_=tree_choices(tscreen,tree,features,True,goals)
        tsummaries=[];tselections=[]
        for name,chosen in tpolicies.items():
            tselections+=tscreen.selection_rows(chosen,name)
            for w in WEIGHTINGS:tsummaries.append({'policy':name,'weighting':w,**tscreen.evaluate(chosen,w)})
        dump(out/'retuned-policy-summaries.json',tsummaries);write_csv(out/'retuned-policy-summaries.csv',tsummaries)
        write_csv(out/'retuned-policy-case-selections.csv',tselections)
        dump(out/'retuned-band-sensitivity-no-retuning.json',fixed_policy_sensitivity(tscreen,tpolicies,tproposal['options'],'tuned',tuning['selected']))
        proposed['tunedProposal']={'selection':tuning['selected'],'inputs':tunedinfos,'missing':tunedmissing,'results':tproposal,'oraclePool':'shared union of default engine directions, selected global RIGHT presets, current/recipe/documented baselines; no unselected presets','matchedBudget':'4presets x12developmentbases perengine; selected presets crossed across46applicabledevelopmentbases'}
    dependency_path=out/'engine-recipe-dependency-diagnostic.json'
    if dependency_path.exists():
        diagnostic=read_json(dependency_path)
        known={x['stem']:x.get('resultsSha256') for x in infos+tunedinfos}
        if all(x.get('resultsSha256')==known.get(x['stem']) for x in diagnostic.get('inputs',[]) if x.get('exists')):proposed['engineRecipeDiagnostic']=diagnostic
    compact=build_compact_policy(proposed,screen)
    if proposed.get('engineRecipeDiagnostic'):
        ds=proposed['engineRecipeDiagnostic']
        compact['engineRecipeMinima']=[{k:m[k] for k in ['mode','scenario','minimumContractSize','portfolio']} for m in ds['minima'] if m['weighting']=='equal-family']
        compact['minimumConfigurationPolicy']=ds.get('minimumConfigurationPolicy')
    proposed['compact']=compact
    dump(ROOT/'data/policy-compact.json',compact)
    write_cold_predictions(cases,compact,'development')
    write_edit_handoff(cases,compact,screen,'development')
    dump(ROOT/'data/policy-proposal.json',proposed)
    print(json.dumps({'phase':'develop','rows':len(rows),'hardValid':hardsummary['hardValid'],'bestFixedGlobal':bestfixed['method'] if bestfixed else None,'proposedSize':proposal['choice']['size'],'proposedPortfolio':proposal['choice']['portfolio'],'developmentThresholdMet':proposal['thresholdMet'],'policyFrozen':False,'heldoutAccessed':False,'outputs':str(out)}))
    return proposed


def bootstrap_paired(selection_rows,policy,baseline='current-authored',draws=2000,seed=220611):
    """Paired two-stage family/base cluster bootstrap with exact feasible denominator."""
    by=collections.defaultdict(dict)
    for r in selection_rows:
        if r['policy'] in [policy,baseline]:by[(r['family'],r['caseId'],r['profile'])][r['policy']]=r
    families=sorted({k[0] for k in by});bases={f:sorted({k[1] for k in by if k[0]==f}) for f in families}
    values={}
    for f in families:
        for b in bases[f]:
            pairs=[v for (ff,bb,p),v in by.items() if ff==f and bb==b and policy in v and baseline in v]
            if pairs:
                for v in pairs:
                    if v[policy].get('oracleAvailable')!=v[baseline].get('oracleAvailable'):
                        raise ValueError('Paired bootstrap requires identical oracle feasibility for both policies')
                numerator=np.mean([(int(v[policy]['acceptable'])-int(v[baseline]['acceptable'])) if v[policy].get('oracleAvailable',False) else 0 for v in pairs])
                denominator=np.mean([v[policy].get('oracleAvailable',False) for v in pairs])
                values[(f,b)]=(numerator,denominator)
    if not values:return {'policy':policy,'baseline':baseline,'available':False}
    def estimate(family_samples):
        n=[];d=[]
        for f,bs in family_samples:
            n.append(np.mean([values.get((f,b),(0,0))[0] for b in bs]))
            d.append(np.mean([values.get((f,b),(0,0))[1] for b in bs]))
        denominator=np.mean(d)
        return float(np.mean(n)/denominator) if denominator else None
    point=estimate([(f,bases[f]) for f in families]);rng=np.random.default_rng(seed);res=[]
    for _ in range(draws):
        fs=rng.choice(families,size=len(families),replace=True)
        sample=[(f,rng.choice(bases[f],size=len(bases[f]),replace=True)) for f in fs]
        e=estimate(sample)
        if e is not None:res.append(e)
    return {'policy':policy,'baseline':baseline,'estimand':'difference in equal-family weighted acceptable coverage, conditional on common full-pool oracle feasibility; same denominator as policy summaries','point':point,'ci95':[float(np.quantile(res,.025)),float(np.quantile(res,.975))] if res else None,'draws':draws,'usableDraws':len(res),'seed':seed,'method':'paired two-stage family then base resampling; profile jobs remain clustered within base; unavailable-oracle bases remain in sampling frame with zero feasible denominator','caution':'Only two fresh heldout bases per family; interval is descriptive and cannot establish population prevalence.'}


def frozen_policy():
    path=ROOT/'data/policy-freeze.json'
    if not path.exists():raise ValueError('Heldout access blocked: policy-freeze.json does not exist')
    frozen=read_json(path)
    if not frozen.get('frozen'):raise ValueError('Heldout access blocked: policy freeze lacks frozen=true')
    policy=frozen.get('proposal',frozen)
    if policy.get('splitSha256')!=sha(ROOT/'corpus/manifest.json'):raise ValueError('Corpus changed after policy proposal')
    return policy,path


def emit_heldout_tasks(args,cases):
    policy,path=frozen_policy()
    tuned=policy.get('tunedProposal');tasks=[];reuse=[]
    if tuned:
        for c in cases:
            for e in c['engines']:
                sel=tuned['selection'][e];p=sel['presetIndex']
                if p==0:
                    reuse.append({'caseId':c['id'],'engine':e,'trial':f'C-heldout-{c["id"]}-{e}-RIGHT'});continue
                attrs=dict(sel['attrs'])
                if sel.get('rootRule')=='last-node':attrs['root']=c['nodeIDs'][-1]
                tasks.append({'id':f'G-selected-heldout-{c["id"]}-{e}-p{p}','stage':'G-selected-heldout','caseId':c['id'],'family':c['family'],'split':'heldout','kind':'source','sourcePath':c['path'],'layout':{'engine':e,'direction':'RIGHT','keepFit':True,'attrs':attrs},'tag':'selected-preset','presetIndex':p,'timeoutMs':NORMALIZED_TRIAL_BUDGET_MS})
    dump(ROOT/'evaluation/tasks/selected-presets-heldout.json',tasks)
    if policy.get('compact'):write_cold_predictions(cases,policy['compact'],'heldout')
    dump(ROOT/'data/analysis/heldout-task-plan.json',{'policyFreezeSha256':sha(path),'selectedPresets':tuned['selection'] if tuned else None,'tasks':len(tasks),'reuse':reuse,'heldoutOutcomesRead':False,'policyChanged':False})
    print(json.dumps({'phase':'emit-heldout','selectedPresetTasks':len(tasks),'heldoutOutcomesRead':False,'policyChanged':False}))


def heldout_phase(args,cases):
    policy,policy_path=frozen_policy()
    rows,info=load_trials('screen-heldout',not args.allow_partial,split='heldout');infos=[info]
    extra,ei=load_trials('documented-default-heldout',not args.allow_partial,split='heldout');rows+=extra
    if ei['exists']:infos.append(ei)
    tuned=policy.get('tunedProposal');trows=[]
    if tuned:
        trows,tinfo,missing=selected_tuned_rows(cases,rows,{'selected':tuned['selection']},args,split='heldout');infos+=tinfo
    screen=Screen(cases,rows+trows);features={c['id']:raw_pre_layout_features(c) for c in cases};chosen={}
    for name,method in [('current-authored','current'),('implicit-recipe','recipe:implicit:auto'),('documented-default','documented-default')]:
        if method in screen.methods:chosen[name]=[j['rows'].get(method) if j['case']['engines'] or method=='current' else j['rows'].get('current') for j in screen.jobs]
    fixed=policy.get('bestFixedGlobal',{}).get('method')
    if fixed:chosen['best-fixed-global']=[j['rows'].get(fixed) if j['case']['engines'] else j['rows'].get('current') for j in screen.jobs]
    if fixed:chosen['best-fixed-global-validity-guard'],_=validity_guard_choices(screen,chosen['best-fixed-global'])
    proposal=policy['defaultProposal']
    for option in proposal['options']:
        k=option['size'];port=option['portfolio'];tree=option['selectorTree'];goals=option['goalTrees']
        chosen[f'k{k}-configuration-oracle']=policies_for_subset(screen,port)
        chosen[f'k{k}-configuration-oracle-current-fallback']=policies_for_subset(screen,port,current_fallback=True)
        chosen[f'k{k}-prelayout-selector'],_=tree_choices(screen,tree,features)
        chosen[f'k{k}-prelayout-selector-validity-guard'],_=tree_choices(screen,tree,features,True)
        chosen[f'k{k}-goal-selector-validity-guard'],_=tree_choices(screen,tree,features,True,goals)
    # Evaluate frozen selected presets and trees without choosing, fitting or changing any policy.
    tuned_screen=None;tuned_choices={}
    if tuned:
        tuned_screen=screen
        for option in tuned['results']['options']:
            k=option['size'];port=option['portfolio'];tree=option['selectorTree'];goals=option['goalTrees']
            tuned_choices[f'tuned-k{k}-configuration-oracle']=policies_for_subset(tuned_screen,port,'tuned',tuned['selection'])
            tuned_choices[f'tuned-k{k}-prelayout-selector'],_=tree_choices(tuned_screen,tree,features)
            tuned_choices[f'tuned-k{k}-prelayout-selector-validity-guard'],_=tree_choices(tuned_screen,tree,features,True)
            tuned_choices[f'tuned-k{k}-goal-selector-validity-guard'],_=tree_choices(tuned_screen,tree,features,True,goals)
    if policy.get('compact'):write_edit_handoff(cases,policy['compact'],screen,'heldout')
    out=ROOT/'data/analysis/heldout';out.mkdir(parents=True,exist_ok=True)
    result=[];selections=[];sensitivity=[]
    for name,cs in chosen.items():
        selections+=screen.selection_rows(cs,name)
        for w in WEIGHTINGS:result.append({'policy':name,'weighting':w,**screen.evaluate(cs,w)})
    sensitivity=fixed_policy_sensitivity(screen,chosen,proposal['options'])
    if tuned_screen:
        tresult=[];tselections=[];tsensitivity=[]
        for name,cs in tuned_choices.items():
            tselections+=tuned_screen.selection_rows(cs,name)
            for w in WEIGHTINGS:tresult.append({'policy':name,'weighting':w,**tuned_screen.evaluate(cs,w)})
        tsensitivity=fixed_policy_sensitivity(tuned_screen,tuned_choices,tuned['results']['options'],'tuned',tuned['selection'])
        # Current baseline uses the same union-pool oracle as all retuned policies.
        tc=[j['rows'].get('current') for j in tuned_screen.jobs]
        tselections+=tuned_screen.selection_rows(tc,'current-authored')
        dump(out/'retuned-policy-summaries.json',tresult);write_csv(out/'retuned-policy-summaries.csv',tresult)
        write_csv(out/'retuned-policy-case-selections.csv',tselections);write_csv(out/'retuned-profile-scores.csv',raw_profile_table(tuned_screen))
        dump(out/'retuned-band-sensitivity-no-retuning.json',tsensitivity)
        dump(out/'retuned-paired-cluster-bootstrap.json',[bootstrap_paired(tselections,name,draws=args.bootstrap) for name in tuned_choices])
    dump(out/'runtime-and-layout-checkpoints.json',runtime_and_checkpoint_summary(rows+trows))
    dump(out/'inputs.json',{'policyFreezeSha256':sha(policy_path),'inputs':infos,'fittedOnHeldout':False});dump(out/'policy-summaries.json',result);write_csv(out/'policy-summaries.csv',result);write_csv(out/'policy-case-selections.csv',selections);write_csv(out/'profile-scores.csv',raw_profile_table(screen));dump(out/'band-sensitivity-no-retuning.json',sensitivity)
    bootstrap=[bootstrap_paired(selections,name,draws=args.bootstrap) for name in chosen if name!='current-authored']
    dump(out/'paired-cluster-bootstrap.json',bootstrap)
    check=[]
    for s in result+(tresult if tuned_screen else []):
        if s['weighting']!='equal-family':continue
        check.append({'policy':s['policy'],'common95Pass':(s['worstProfileCommonFeasibleCoverage'] or 0)>=.95,'contractRelative95PerProfilePass':(s['worstProfileCommonFeasibleCoverage'] or 0)>=.95,'conservativeAbsolute95PerProfilePass':(s['worstProfileCommonAbsoluteCoverage'] or 0)>=.95,'contractOverallPass':(s['worstProfileCommonFeasibleCoverage'] or 0)>=.95 and s['currentValidHardRegressions']==0 and s['specialistCurrentValidLossCases']==0,'relativeFeasiblePool95PerProfilePass':all((v or 0)>=.95 for v in s['commonFeasibleProfileCoverage'].values()),'relativeFeasiblePool95PooledPass':(s['commonAcceptableCoverage'] or 0)>=.95,'noHardRegressionPass':s['currentValidHardRegressions']==0,'commonAcceptableCoverageRelativeToFeasiblePool':s['commonAcceptableCoverage'],'absoluteCommonAcceptableCoverage':s['absoluteCommonAcceptableCoverage'],'commonAbsoluteProfileCoverage':s['commonAbsoluteProfileCoverage'],'commonFeasibleProfileCoverage':s['commonFeasibleProfileCoverage'],'commonProfileCounts':s['commonProfileCounts'],'currentValidHardRegressionCases':s['currentValidHardRegressionCases'],'supportedSpecialistsPreserved':s['specialistCurrentValidLossCases']==0,'specialistCurrentValidLossCases':s['specialistCurrentValidLossCases'],'specialistProtectedCases':s['specialistProtectedCases'],'designedRootRecipeDispatchPreserved':True,'specialistPreservationExplanation':'Root sequence/lanes dispatch to current authored source; measured loss counts include nested cells against valid current-source results. Guarded policies retain current source on candidate hard failure; unguarded policies may fail. Current specialist may itself be hard-invalid.'})
    dump(out/'frozen-policy-acceptance.json',check)
    print(json.dumps({'phase':'heldout','rows':len(rows),'fittedOnHeldout':False,'output':str(out)}))


def selfcheck():
    # Analytical records, no product algorithm executions; test acceptance logic.
    base={'status':'ok','metrics':{'hardValid':True,'requiredIntentFailures':0,'area':100,'routeLength':100,'aspect':2,'weightingScores':{'balanced':2,'direct':3,'traceable':4}}}
    assert profile_score(base,'readable',100,2)==3
    assert profile_score(base,'compact',100,2)==2
    assert acceptable(base,2,base,2)
    worse=json.loads(json.dumps(base));worse['metrics']['area']=111
    assert not acceptable(worse,2,base,2)
    assert acceptable(worse,2,base,2,2)
    invalid=json.loads(json.dumps(base));invalid['metrics']['hardValid']=False
    assert not acceptable(invalid,0,base,2)
    assert math.isinf(profile_score(invalid,'readable',100,2))
    tree={'type':'split','feature':'nodeCount','threshold':5,'left':{'type':'leaf','method':'A'},'right':{'type':'leaf','method':'B'}}
    assert predict_tree(tree,{'nodeCount':5})=='A' and predict_tree(tree,{'nodeCount':6})=='B'
    # A feasible-oracle base and an unavailable-oracle base distinguish conditional
    # acceptable coverage from the required absolute all-common denominator.
    c1={'id':'a','family':'fa','common':True,'engines':['flow'],'protectedRecipes':[],'split':'development','job':{'targetFormat':'wide'}}
    c2={**c1,'id':'b','family':'fb'}
    def record(cid,method,score,valid=True):
        r=json.loads(json.dumps(base));r.update(id=cid+'-'+method,caseId=cid,method=method,valid=valid)
        r['metrics']['hardValid']=valid;r['metrics']['weightingScores']={'balanced':score,'direct':score,'traceable':score}
        return r
    rs=[record('a','current',10),record('a','engine:flow:RIGHT',0),record('b','current',0,False),record('b','engine:flow:RIGHT',0,False)]
    screen=Screen([c1,c2],rs)
    selected=[j['rows'].get('engine:flow:RIGHT') for j in screen.jobs];current=[j['rows'].get('current') for j in screen.jobs]
    summary=screen.evaluate(selected)
    assert summary['acceptableCoverage']==1 and summary['absoluteCommonAcceptableCoverage']==.5
    assert all(v==.5 for v in summary['commonAbsoluteProfileCoverage'].values())
    paired=screen.selection_rows(selected,'test')+screen.selection_rows(current,'current-authored')
    boot=bootstrap_paired(paired,'test',draws=50)
    assert boot['point']==1 and boot['usableDraws']<50
    # Root-source parser check: undirected and nonconstraining reverse edges must not
    # manufacture a reading-order cycle. This executes no production algorithm.
    import tempfile
    with tempfile.TemporaryDirectory(prefix='draftably-feature-check-') as td:
        f=pathlib.Path(td)/'feature.draft';f.write_text('node a "A"\nnode b "B"\nnode c "C"\nedge e0 a -> b directed=false\nedge e1 b -> a constraint=false\nedge e2 b -> c\n')
        feature=raw_pre_layout_features({**c1,'path':str(f)})
        assert feature['undirectedFraction']==1/3 and feature['hasDirectedCycle']==0 and feature['nodeCount']==3
    assert sum(math.comb(10,k) for k in range(1,6))==637
    # A source invalidity is not rescued by a low score or a different equivalence band.
    assert not acceptable(invalid,0,base,100,2)
    return {'checks':14,'passed':14,'productionCalls':0,'coverageDenominatorsChecked':['all-common absolute','feasible-oracle conditional','paired cluster bootstrap matches conditional estimand']}


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--phase',choices=['tune','develop','emit-heldout','edit-predictions','heldout','selfcheck'],default='develop')
    parser.add_argument('--allow-partial',action='store_true',help='Debug only; emitted proposals explicitly not frozen')
    parser.add_argument('--include-tuned',action='store_true')
    parser.add_argument('--bootstrap',type=int,default=2000)
    parser.add_argument('--split',choices=['development','heldout'],default='development',help='Only used by edit-predictions phase')
    args=parser.parse_args()
    if args.phase=='selfcheck':print(json.dumps(selfcheck()));return
    manifest=read_json(ROOT/'corpus/manifest.json');split=args.split if args.phase=='edit-predictions' else 'heldout' if args.phase in ['emit-heldout','heldout'] else 'development'
    cases=[c for c in manifest['cases'] if c['split']==split]
    if args.phase=='tune':tune_phase(args,cases)
    elif args.phase=='develop':develop_phase(args,cases)
    elif args.phase=='emit-heldout':emit_heldout_tasks(args,cases)
    elif args.phase=='edit-predictions':edit_predictions_phase(args,cases)
    else:heldout_phase(args,cases)

if __name__=='__main__':
    try:main()
    except (ValueError,KeyError) as exc:
        print(f'ERROR: {exc}',file=sys.stderr);sys.exit(2)
