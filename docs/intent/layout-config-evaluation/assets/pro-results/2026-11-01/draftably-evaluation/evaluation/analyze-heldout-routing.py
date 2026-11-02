#!/usr/bin/env python3
"""Apply sealed routing/joint choices to completed heldout outputs; never fit.

Default mode validates only sealed policy and task definitions. It opens no
heldout outcome. --analyze --allow-heldout-after-freeze is required for outcomes.
The caller must also wait for the experiment controller's completion notice.
No layout, compilation, rendering, or routing algorithm is executed here.
"""
from __future__ import annotations
import argparse, collections, copy, csv, datetime, functools, gzip, hashlib, importlib.util, json, math, pathlib, statistics, subprocess
import numpy as np

ROOT=pathlib.Path(__file__).resolve().parents[1]
DATA=ROOT/'data'; OUT=DATA/'analysis'
PROFILES=['readable','compact','traceable','stable','specialist']
ROUTE_WEIGHTS=['balanced','traceable','direct']
STEMS=['screen-heldout','documented-default-heldout','selected-presets-heldout','routing-current-heldout','joint-heldout']
REPLICATES=2000; SEED=20261102; BUDGET_MS=15000


def sha(path):return hashlib.sha256(pathlib.Path(path).read_bytes()).hexdigest()
def load_json(path):return json.loads(pathlib.Path(path).read_text())
def clean(v):
    if isinstance(v,float) and not math.isfinite(v):return None
    if isinstance(v,dict):return {k:clean(x) for k,x in v.items()}
    if isinstance(v,(list,tuple,set)):return [clean(x) for x in v]
    return v
def save(name,value): (OUT/(name+'.json')).write_text(json.dumps(clean(value),indent=2)+'\n')
def write_csv(name,rows):
    fields=list(dict.fromkeys(k for r in rows for k in r))
    with (OUT/(name+'.csv')).open('w',newline='') as f:
        w=csv.DictWriter(f,fieldnames=fields);w.writeheader()
        for row in rows:w.writerow({k:json.dumps(clean(v),separators=(',',':')) if isinstance(v,(dict,list,tuple,set)) else clean(v) for k,v in row.items()})
def mean(xs):
    xs=[x for x in xs if isinstance(x,(int,float)) and math.isfinite(x)]
    return statistics.mean(xs) if xs else None
def percentile(xs,q):
    xs=[x for x in xs if isinstance(x,(int,float)) and math.isfinite(x)]
    return float(np.quantile(xs,q)) if xs else None
def valid(r):
    m=r.get('metrics',{})
    return r.get('status')=='ok' and m.get('hardValid') is True and not m.get('requiredIntentFailures',0) and not r.get('intent',{}).get('failures')
def static_row(row):
    # Route-only workers incidentally emit reference comparisons. D-joint source
    # rows had no edit block, so static stable preference remains balanced DI.
    result={**row,'metrics':{k:v for k,v in row.get('metrics',{}).items() if k!='edit'}}
    return result
def read_module(name,filename):
    spec=importlib.util.spec_from_file_location(name,ROOT/'evaluation'/filename)
    m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);return m


def validate_design():
    freeze=load_json(DATA/'policy-freeze.json')
    assert freeze['frozen'] is True
    expected=(DATA/'policy-freeze.sha256').read_text().split()[0]
    assert sha(DATA/'policy-freeze.json')==expected
    for name in ['evaluation/analyze-portfolio.py','evaluation/analyze-controls.py','evaluation/metrics.mjs','evaluation/intent.mjs','evaluation/verify-control-archives.mjs']:
        assert sha(ROOT/name)==freeze['frozenCodeHashes'][name], 'Frozen scoring/integrity code changed: '+name
    corpus=load_json(ROOT/'corpus/manifest.json')
    cases={c['id']:c for c in corpus['cases'] if c['split']=='heldout'}
    assert len(cases)==24 and sum(c['common'] for c in cases.values())==14
    routes={r['policy_id']:r for r in freeze['routingProposal']['policies']}
    assert len(routes)==3
    joints={r['joint_id']:r for r in freeze['jointProposal']['nine_combination_pool']}
    global_id=freeze['jointProposal']['fixed_global_choice']['joint_id']
    triple=[r['joint_id'] for r in freeze['jointProposal']['three_combination_portfolio']]
    assert len(joints)==9 and len(triple)==3 and global_id in joints and set(triple)<=set(joints)
    layout_ids=list(dict.fromkeys(x['layout_method'] for x in joints.values()))
    assert len(layout_ids)==3
    tasks={}
    for stem,n in [('routing-current-heldout',72),('joint-heldout',216)]:
        definitions=load_json(ROOT/'evaluation/tasks'/(stem+'.json'))
        assert len(definitions)==n and len({t['id'] for t in definitions})==n
        assert set(t['caseId'] for t in definitions)==set(cases)
        for t in definitions:
            assert t['split']=='heldout' and t['kind']=='route'
            assert t.get('history') is False and t.get('inheritSourceIntent') is True and t.get('allowPartialReference') is True
            route=t['tag']['routingPolicy'];assert route in routes
            assert t['routing']==routes[route]['routing']
            assert t.get('timeoutMs')==BUDGET_MS
            assert not t.get('patchDoc') and not t.get('routeOptions')
            if stem=='joint-heldout':
                method=t['tag']['layoutMethod'];assert method in layout_ids
                assert t['policy']==method+'|routing:'+route and t['policy'] in joints
                assert bool(t['tag']['specialistFallback'])==(not bool(cases[t['caseId']]['engines']))
                assert t['tag']['effectiveLayoutMethod']==('current-specialist' if t['tag']['specialistFallback'] else method)
            tasks[t['id']]=t
    return freeze,cases,routes,joints,global_id,triple,layout_ids,tasks


def design_record(freeze,routes,joints,global_id,triple):
    return {'schema':'heldout-routing-analysis-design-1','createdAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),
        'heldout_outcomes_opened_by_this_analyzer':False,'policyFreezeSha256':sha(DATA/'policy-freeze.json'),
        'frozenAt':freeze['frozenAt'],'geometry_algorithm_calls':0,'fit_or_selection_operations':0,
        'primary_estimand':'Observed status and geometric/source-intent validity of the predeclared route-only task, on cached completed source positions or explicitly marked layout checkpoints. Main C/G cold-source gates remain their observed full-pipeline 15-second results.',
        'serial_timing':'Derived compileMs from canonical source success or saved checkpoint + observed route workerMs. Missing compileMs stays unknown. This is not measured end-to-end latency.',
        'budget_sensitivity':'Separately report derived serial <=15000ms eligibility and missing components. Do not add a new runtime hard gate to frozen geometric scoring.',
        'reference_rule':'First terminal source outcome. A canonical failed/timed-out source may supply only its explicitly completed-layout checkpoint, never a later successful routed archive. Partial references are not valid default-routing results and supply no invented prior history.',
        'history':'Empty for every candidate. Raw side/path changes compare static alternatives; no warm-history stability claim.',
        'five_profiles':PROFILES,'routing_weightings':ROUTE_WEIGHTS,
        'static_stable_profile':'Project route-row metrics without edit block for scoring only. D-joint source rows had no edit block: stable score equals balanced DI. Preserve raw edit measurements as diagnostics.',
        'quality_bands':freeze['proposal']['scoring']['bands'],
        'current_position_oracle_pool':'Current source default-route result + three frozen route settings on exactly those positions. No unexecuted routing setting is imputed.',
        'joint_oracle_pool':'Three frozen layout default-route references + nine frozen layout×route alternatives. No other layout or route configuration is admitted to this scoped oracle.',
        'coverage_denominators':'All24, common14, niche10, plus the same scoped oracle-feasible denominator, separately for every one of five profiles and three route weightings. Preserve raw numerators/denominators.',
        'policy_roles':{'fixed_joint_global':global_id,'frozen_joint_triple':triple,'frozen_routes':list(routes),
            'joint_all_nine':'Oracle diagnostic only','three_route_union':'Oracle/Compare upper bound only; not a learned selector'},
        'specialist_fallback':'Explicit frozen current-specialist source escape on cases with no generic engine applicability; record effective method and duplicate identities.',
        'guard':'No new soft or hard fallback for fixed joint/current-route policies. Retained-current Compare unions, if reported, are distinct oracle diagnostics.',
        'uncertainty':{'replicates':REPLICATES,'seed':SEED,'units':['base diagram, retaining all correlated profiles and alternatives','family, retaining all member bases and profiles'],'interval':'2.5/97.5 percentile; conditional soft contrasts require both valid; validity includes failures; no human-population significance claim'},
        'code_timing_note':'This analysis file is authored after selection freeze but before its author opens heldout outcomes. It evaluates stored choices and does not choose new settings.'}


def write_design_once(record):
    path=OUT/'heldout-routing-analysis-design.json'
    if path.exists():
        old=load_json(path)
        a={k:v for k,v in record.items() if k!='createdAt'};b={k:v for k,v in old.items() if k!='createdAt'}
        if a!=b:raise ValueError('Refusing to rewrite the pre-outcome analysis interpretation')
        return old
    path.write_text(json.dumps(record,indent=2)+'\n');return record


def load_completed(stem):
    taskpath=ROOT/'evaluation/tasks'/(stem+'.json'); resultpath=DATA/(stem+'.jsonl')
    definitions=load_json(taskpath);taskmap={t['id']:t for t in definitions}
    assert all(t['split']=='heldout' for t in definitions)
    first={};attempts=collections.defaultdict(list)
    for lineno,line in enumerate(resultpath.read_text().splitlines(),1):
        if not line.strip():continue
        r=json.loads(line)
        assert r['split']=='heldout' and r['id'] in taskmap
        assert r['status'] in ['ok','failed','timed_out']
        attempts[r['id']].append({'line':lineno,'status':r['status'],'geometryHash':r.get('geometryHash'),'error':r.get('error')})
        first.setdefault(r['id'],{**taskmap[r['id']],**r,'_task':taskmap[r['id']]})
    missing=set(taskmap)-set(first)
    if missing:raise ValueError(f'{stem} incomplete: {len(missing)} missing. Do not analyze partial heldout stages.')
    return list(first.values()),{'stem':stem,'planned':len(definitions),'canonical_terminal_rows':len(first),
        'attempt_rows':sum(map(len,attempts.values())),'canonical_rule':'first terminal outcome; later attempts never improve validity or selection',
        'status_counts':dict(collections.Counter(r['status'] for r in first.values())),
        'later_attempts':{k:v for k,v in attempts.items() if len(v)>1},'task_sha256':sha(taskpath),'result_sha256':sha(resultpath)}


@functools.lru_cache(maxsize=1000)
def artifact(relative):return json.loads(gzip.decompress((ROOT/relative).read_bytes()))


def reference_info(task,catalog):
    path=task['reference'];ident=pathlib.Path(path).name.removesuffix('.json.gz')
    ref=catalog.get(ident)
    if not ref:raise ValueError('Unregistered source reference: '+ident)
    partial=ref['status']!='ok'
    chosen=path.replace('data/geometry/','data/layout-checkpoints/') if partial else ref['geometry']
    exists=(ROOT/chosen).exists()
    a=artifact(chosen) if exists else None
    if partial and a and a.get('phase')!='layout-complete-routing-pending':raise ValueError('Noncheckpoint used for partial reference')
    compilems=(a or {}).get('compileMs') if partial else ref.get('timing',{}).get('compileMs')
    return {'reference_id':ident,'declared_path':path,'actual_path':chosen,'canonical_status':ref['status'],
        'canonical_hard_valid':valid(ref),'partial':partial,'artifact_available':exists,
        'compile_ms':compilems,'prior_routes_available':bool(a is not None and not partial),
        'checkpoint_sha256':sha(ROOT/chosen) if partial and exists else None},ref,a


def doc_without_routing(doc):
    d=copy.deepcopy(doc);d.get('settings',{}).pop('routing',None);return d


def attach_reference_checks(rows,catalog,routes):
    checks=[]
    for r in rows:
        task=r['_task'];info,base,ref=reference_info(task,catalog)
        r['_reference_info']=info;r['_default_reference']=base
        worker=r.get('timing',{}).get('workerMs')
        if worker is None and r.get('status')=='timed_out':worker=r.get('trialBudgetMs',task.get('timeoutMs'))
        compilems=info['compile_ms']
        serial=compilems+worker if isinstance(compilems,(int,float)) and isinstance(worker,(int,float)) else None
        r['_derived_serial_ms']=serial
        r['_serial_budget_eligible']=None if serial is None else serial<=BUDGET_MS
        check={'trial_id':r['id'],'case_id':r['caseId'],'reference':info,'status':r['status'],
            'route_worker_ms':worker,'derived_serial_compile_plus_route_worker_ms':serial,
            'derived_serial_budget_eligible':r['_serial_budget_eligible'],
            'specialist_fallback':task['tag'].get('specialistFallback',False),
            'effective_layout_method':task['tag'].get('effectiveLayoutMethod',task['tag']['layoutMethod'])}
        if r['status']=='ok':
            if ref is None:raise ValueError('Successful candidate has no canonical input/checkpoint')
            assert bool(r.get('referencePartial'))==info['partial']
            output=artifact(r['geometry'])
            same=doc_without_routing(output['doc'])==doc_without_routing(ref['doc'])
            check['same_document_except_routing']=same
            assert same,'Routing candidate changed non-routing state: '+r['id']
            assert r['routingSettings']==routes[task['tag']['routingPolicy']]['routing']
            check['routing_settings_match_frozen']=True
            check['source_intent_checked']=r.get('intent',{}).get('checked',{})
            check['inherited_intent_failures']=r.get('metrics',{}).get('requiredIntentFailures')
        checks.append(check)
    return checks


def score(row,axis,minarea,target,P):
    if not valid(row):return math.inf
    if axis.startswith('route:'):return row.get('metrics',{}).get('weightingScores',{}).get(axis.split(':',1)[1],math.inf)
    return P.profile_score(static_row(row),axis.split(':',1)[1],minarea,target)


def build_jobs(rows,cases,P):
    bycase=collections.defaultdict(dict)
    for r in rows:
        if r['method'] in bycase[r['caseId']]:raise ValueError('Duplicate case/configuration')
        bycase[r['caseId']][r['method']]=r
    axes=['profile:'+x for x in PROFILES]+['route:'+x for x in ROUTE_WEIGHTS]
    jobs=[]
    for cid,rs in sorted(bycase.items()):
        minarea=min((r['metrics']['area'] for r in rs.values() if valid(r)),default=1)
        for axis in axes:
            scores={m:score(r,axis,minarea,P.target_aspect(cases[cid]),P) for m,r in rs.items()}
            eligible=[m for m,r in rs.items() if valid(r)]
            oracle=min(eligible,key=lambda m:(scores[m],rs[m]['id'])) if eligible else None
            accepted={m for m in rs if oracle and P.acceptable(rs[m],scores[m],rs[oracle],scores[oracle])}
            jobs.append({'case_id':cid,'family':cases[cid]['family'],'common':cases[cid]['common'],'axis':axis,
                'oracle_method':oracle,'oracle_trial':rs[oracle]['id'] if oracle else None,
                'oracle_score':scores[oracle] if oracle else math.inf,'scores':scores,'acceptable':accepted,
                'methods':rs,'min_valid_area':minarea,'target_aspect':P.target_aspect(cases[cid])})
    return bycase,jobs


def evaluate_policy(name,methods,jobs,current,cases,role):
    records=[]
    for j in jobs:
        available=[m for m in methods if m in j['methods']]
        successful=[m for m in available if j['methods'][m]['status']=='ok']
        eligible=[m for m in available if valid(j['methods'][m])]
        chosen=min(eligible,key=lambda m:(j['scores'][m],j['methods'][m]['id'])) if eligible else None
        acceptable=bool(j['acceptable'].intersection(available))
        valid_current=valid(current[j['case_id']])
        serial_known=[j['methods'][m].get('_serial_budget_eligible') for m in eligible]
        serial_accept=[j['methods'][m].get('_serial_budget_eligible') for m in j['acceptable'].intersection(available)]
        records.append({'policy':name,'role':role,'case_id':j['case_id'],'family':j['family'],'common':j['common'],'axis':j['axis'],
            'candidate_methods':available,'oracle_feasible':j['oracle_method'] is not None,
            'any_execution_success':bool(successful),'hard_valid':bool(eligible),'acceptable':acceptable,
            'current_source_valid':valid_current,'current_valid_hard_loss':valid_current and not bool(eligible),
            'current_invalid_valid_gain':not valid_current and bool(eligible),
            'oracle_method':j['oracle_method'],'oracle_trial':j['oracle_trial'],'oracle_score':j['oracle_score'],
            'best_valid_method_by_score':chosen,'best_valid_trial_by_score':j['methods'][chosen]['id'] if chosen else None,
            'best_valid_score':j['scores'][chosen] if chosen else None,
            'finite_score_regret':j['scores'][chosen]-j['oracle_score'] if chosen and j['oracle_method'] else None,
            'acceptable_methods':sorted(j['acceptable'].intersection(available)),
            'serial_budget_valid_sensitivity':True if True in serial_known else None if any(x is None for x in serial_known) else False,
            'serial_budget_acceptable_sensitivity':True if True in serial_accept else None if any(x is None for x in serial_accept) else False,
            'serial_budget_unknown_valid_candidates':sum(x is None for x in serial_known)})
    return records


@functools.lru_cache(maxsize=100)
def resample_weights(ids_families,unit):
    ids_families=list(ids_families);n=len(ids_families);rng=np.random.default_rng(SEED)
    if unit=='base':
        indices=rng.integers(0,n,size=(REPLICATES,n));return np.eye(n,dtype=np.int16)[indices].sum(axis=1)
    families=list(dict.fromkeys(f for _,f in ids_families));k=len(families)
    indices=rng.integers(0,k,size=(REPLICATES,k));fw=np.eye(k,dtype=np.int16)[indices].sum(axis=1)
    return np.stack([fw[:,families.index(f)] for _,f in ids_families],axis=1)


def cluster_ratio_ci(rows,numer,denom):
    bycase=collections.defaultdict(list)
    for r in rows:bycase[r['case_id']].append(r)
    ids=tuple((cid,rs[0]['family']) for cid,rs in sorted(bycase.items()))
    if not ids:return {'point':None,'base_clusters':0,'family_clusters':0}
    nums=np.array([sum(float(numer(r)) for r in bycase[c]) for c,_ in ids])
    dens=np.array([sum(float(denom(r)) for r in bycase[c]) for c,_ in ids])
    out={'point':float(nums.sum()/dens.sum()) if dens.sum() else None,'numerator':float(nums.sum()),'denominator':float(dens.sum()),
        'base_clusters':len(ids),'family_clusters':len({f for _,f in ids})}
    for unit in ['base','family']:
        w=resample_weights(ids,unit);d=w@dens;n=w@nums;values=n[d>0]/d[d>0]
        out[unit+'_bootstrap']={'low95':float(np.quantile(values,.025)) if len(values) else None,
            'high95':float(np.quantile(values,.975)) if len(values) else None,'replicates':REPLICATES,'nonempty_draws':len(values)}
    return out


def summarize_policy_records(records,with_uncertainty=True):
    output=[]
    for policy in dict.fromkeys(r['policy'] for r in records):
        pr=[r for r in records if r['policy']==policy]
        for subset,pred in [('all',lambda r:True),('common',lambda r:r['common']),('niche',lambda r:not r['common'])]:
            sr=[r for r in pr if pred(r)]
            if not sr:continue
            axes=list(dict.fromkeys(r['axis'] for r in sr))+['five_profiles_pooled','three_route_weights_pooled']
            for axis in axes:
                rs=[r for r in sr if (r['axis'].startswith('profile:') if axis=='five_profiles_pooled' else r['axis'].startswith('route:') if axis=='three_route_weights_pooled' else r['axis']==axis)]
                n=len(rs);feasible=sum(r['oracle_feasible'] for r in rs);accepted=sum(r['acceptable'] for r in rs)
                families=collections.defaultdict(list)
                for r in rs:families[r['family']].append(r)
                out={'policy':policy,'role':rs[0]['role'],'subset':subset,'axis':axis,
                    'bases':len({r['case_id'] for r in rs}),'families':len(families),'total_jobs':n,'oracle_feasible_jobs':feasible,
                    'acceptable_jobs':accepted,'absolute_acceptable_fraction':accepted/n if n else None,
                    'relative_to_scoped_feasible_pool_fraction':accepted/feasible if feasible else None,
                    'hard_valid_jobs':sum(r['hard_valid'] for r in rs),
                    'current_valid_hard_loss_jobs':sum(r['current_valid_hard_loss'] for r in rs),
                    'current_valid_hard_loss_bases':len({r['case_id'] for r in rs if r['current_valid_hard_loss']}),
                    'current_invalid_valid_gain_bases':len({r['case_id'] for r in rs if r['current_invalid_valid_gain']}),
                    'mean_finite_score_regret':mean([r['finite_score_regret'] for r in rs]),
                    'p95_finite_score_regret':percentile([r['finite_score_regret'] for r in rs],.95),
                    'worst_family_relative_coverage':min((sum(r['acceptable'] for r in fs)/sum(r['oracle_feasible'] for r in fs) for fs in families.values() if sum(r['oracle_feasible'] for r in fs)),default=None),
                    'serial_budget_valid_sensitivity_jobs':sum(r['serial_budget_valid_sensitivity'] is True for r in rs),
                    'serial_budget_acceptable_sensitivity_jobs':sum(r['serial_budget_acceptable_sensitivity'] is True for r in rs),
                    'serial_budget_unknown_valid_jobs':sum(r['serial_budget_valid_sensitivity'] is None for r in rs),
                    'serial_budget_unknown_acceptable_jobs':sum(r['serial_budget_acceptable_sensitivity'] is None for r in rs)}
                if with_uncertainty:
                    out['absolute_coverage_uncertainty']=cluster_ratio_ci(rs,lambda r:r['acceptable'],lambda r:1)
                    out['feasible_coverage_uncertainty']=cluster_ratio_ci(rs,lambda r:r['acceptable'],lambda r:r['oracle_feasible'])
                    out['current_valid_hard_loss_rate_uncertainty']=cluster_ratio_ci(rs,lambda r:r['current_valid_hard_loss'],lambda r:r['current_source_valid'])
                output.append(out)
    return output


def paired_records(rows,baselines,cases,C,comparison):
    pairs=[]
    for r in rows:
        base=baselines[r['id']]
        p=C.paired(r,base,comparison,r['method'],'heldout-static-route-composition')
        p.update(policy=r['method'],common=cases[r['caseId']]['common'],comparison=comparison,
            candidate_reference_partial=r.get('_reference_info',{}).get('partial'),
            source_compile_ms=r.get('_reference_info',{}).get('compile_ms'),
            derived_serial_compile_plus_route_worker_ms=r.get('_derived_serial_ms'),
            serial_budget_eligible_sensitivity=r.get('_serial_budget_eligible'),
            source_reference_status=r.get('_reference_info',{}).get('canonical_status'),
            candidate_worker_ms=r.get('timing',{}).get('workerMs'),
            candidate_routing_cache_hit=r.get('routingCacheHit'),baseline_routing_cache_hit=base.get('routingCacheHit'),
            baseline_hard=base.get('hard',[]),candidate_hard=r.get('hard',[]),
            baseline_intent_failures=base.get('intent',{}).get('failures',[]),candidate_intent_failures=r.get('intent',{}).get('failures',[]))
        pairs.append(p)
    return pairs


def paired_summary(pairs):
    output=[]
    for policy in dict.fromkeys(p['policy'] for p in pairs):
        for subset,pred in [('all',lambda p:True),('common',lambda p:p['common']),('niche',lambda p:not p['common'])]:
            ps=[p for p in pairs if p['policy']==policy and pred(p)];both=[p for p in ps if p['hard_valid'] and p['baseline_hard_valid']]
            summary={'policy':policy,'comparison':ps[0]['comparison'],'subset':subset,'pairs':len(ps),
                'completed_candidates':sum(p['status']=='ok' for p in ps),'valid_candidates':sum(p['hard_valid'] for p in ps),
                'completed_baselines':sum(p['baseline_status']=='ok' for p in ps),'valid_baselines':sum(p['baseline_hard_valid'] for p in ps),
                'new_valid':sum(p['valid_gained'] for p in ps),'new_invalid':sum(p['valid_lost'] for p in ps),
                'partial_references':sum(p['candidate_reference_partial'] is True for p in ps),
                'comparable_geometry':sum(p['geometry_changed_over_1px'] is not None for p in ps),
                'geometry_changed_over_1px':sum(p['geometry_changed_over_1px'] is True for p in ps),
                'valid_gain_witnesses':[p['trial_id'] for p in ps if p['valid_gained']],
                'hard_loss_witnesses':[p['trial_id'] for p in ps if p['valid_lost']],
                'mean_balanced_delta_both_valid':mean([p['delta_score_balanced'] for p in both]),
                'mean_traceable_delta_both_valid':mean([p['delta_score_traceable'] for p in both]),
                'mean_route_length_delta_both_valid':mean([p['delta_routeLength'] for p in both]),
                'worst_valid_balanced_regression':max(both,key=lambda p:p['delta_score_balanced']) if both else None,
                'best_valid_balanced_change':min(both,key=lambda p:p['delta_score_balanced']) if both else None}
            # Keep invalid/failed cases in validity contrasts; soft contrast is explicitly conditional.
            cirows=[dict(case_id=p['case_id'],family=p['family'],value=int(p['hard_valid'])-int(p['baseline_hard_valid']),available=1) for p in ps]
            summary['paired_validity_uncertainty']=cluster_ratio_ci(cirows,lambda r:r['value'],lambda r:1)
            for metric in ['delta_score_balanced','delta_score_traceable','delta_routeLength']:
                cr=[dict(case_id=p['case_id'],family=p['family'],value=p[metric] or 0,available=int(p in both and p[metric] is not None)) for p in ps]
                summary[metric+'_conditional_uncertainty']=cluster_ratio_ci(cr,lambda r:r['value']*r['available'],lambda r:r['available'])
            output.append(summary)
    return output


def summarize_context(name,rows,baseline_rows,current,cases,P,strategies):
    pool=rows+baseline_rows;bycase,jobs=build_jobs(pool,cases,P)
    policy_records=[]
    for strategy in strategies:policy_records+=evaluate_policy(strategy['name'],strategy['methods'],jobs,current,cases,strategy['role'])
    summaries=summarize_policy_records(policy_records)
    family=[]
    for f in sorted({r['family'] for r in policy_records}):
        # Family rows do not bootstrap a single family; exact counts and case IDs suffice.
        family += [dict(family=f,**s) for s in summarize_policy_records([r for r in policy_records if r['family']==f],False)]
    jobrows=[]
    for j in jobs:
        jobrows.append({k:v for k,v in j.items() if k not in ['methods','acceptable']}|{'acceptable_methods':sorted(j['acceptable'])})
    save(name+'-policy-records',policy_records);write_csv(name+'-policy-records',policy_records)
    save(name+'-policy-summary',summaries);write_csv(name+'-policy-summary',summaries)
    save(name+'-family-summary',family);write_csv(name+'-family-summary',family)
    save(name+'-oracle-jobs',jobrows)
    return summaries,policy_records


def runtime_rows(rows):
    result=[]
    for r in rows:
        info=r['_reference_info']
        result.append({'trial_id':r['id'],'case_id':r['caseId'],'family':r['family'],'method':r['method'],'status':r['status'],
            'hard_valid':valid(r),'source_reference_id':info['reference_id'],'source_reference_status':info['canonical_status'],
            'source_reference_partial':info['partial'],'source_compile_ms':info['compile_ms'],
            'route_worker_ms':r.get('timing',{}).get('workerMs'),'route_operation_ms':r.get('timing',{}).get('totalMs'),
            'routing_ms':r.get('timing',{}).get('routingMs'),'routing_cache_hit':r.get('routingCacheHit'),
            'actual_router_calls_reported':r.get('actualRouterCalls'),
            'derived_serial_compile_plus_route_worker_ms':r['_derived_serial_ms'],
            'derived_serial_budget_eligible':r['_serial_budget_eligible'],
            'caution':'Derived serial estimate is not measured cold latency. Primary task status remains the observed route-only result.'})
    return result


def fmt(v):return 'NA' if v is None else f'{v:.3f}' if isinstance(v,float) else str(v)


def report(manifest,current_summary,joint_summary,current_pairs,joint_pairs,global_pairs,runtimes,global_id,triple):
    lines=['# Frozen heldout routing and joint-context findings','',
        '**Measured routing on unchanged source positions; stored development choices only.** No heldout fitting or configuration selection was performed. The original source trials retain their full-pipeline outcomes. Routing trials on a completed layout or checkpoint answer a narrower question and do not establish new cold-render latency or default safety.','',
        '## Completion and input integrity','',
        '| Stage | Planned | Canonical terminal | Status counts |','| --- | ---: | ---: | --- |']
    for s in manifest['stages']:lines.append(f"| {s['stem']} | {s['planned']} | {s['canonical_terminal_rows']} | {s['status_counts']} |")
    lines += ['',f"The cohort has 24 bases in 12 families, including 14 declared common jobs. All successful candidate documents preserve their matched source document exactly except routing settings. {manifest['reference_checks']['partial_reference_trials']} trials use explicitly partial layout references; these are not counted as completed default-routing baselines. All canonical successful artifacts used in scoring and direct comparisons passed the geometry-signature check.",'',
        '## Current-source positions: fixed routes and frozen union','',
        'The comparison universe is current source routing plus the three frozen numeric settings. It does not contain the other development-only scalar settings or imputed continuous optima. Retain-current plus alternatives is a Compare upper bound, not a claim that an automatic policy chooses the right alternative.','',
        '| Fixed route | Valid /24 | Valid current defaults | New valid | New invalid | Partial refs | Balanced delta, both valid |',
        '| --- | ---: | ---: | ---: | ---: | ---: | ---: |']
    for s in current_pairs:
        if s['subset']=='all':lines.append(f"| {s['policy']} | {s['valid_candidates']} | {s['valid_baselines']} | {s['new_valid']} | {s['new_invalid']} | {s['partial_references']} | {fmt(s['mean_balanced_delta_both_valid'])} |")
    for title,summaries in [('Current positions',current_summary),('Frozen joint choices',joint_summary)]:
        lines += ['',f'### {title}: exact profile denominators','',
            '| Policy | Cohort | Profile | Acceptable / all | Acceptable / feasible | Current-valid hard-loss bases |',
            '| --- | --- | --- | ---: | ---: | ---: |']
        for s in summaries:
            if s['subset'] not in ['all','common'] or not s['axis'].startswith('profile:'):continue
            lines.append(f"| {s['policy']} | {s['subset']} | {s['axis'].split(':')[1]} | {s['acceptable_jobs']} / {s['total_jobs']} | {s['acceptable_jobs']} / {s['oracle_feasible_jobs']} | {s['current_valid_hard_loss_bases']} |")
    lines += ['',
        'The JSON/CSV tables also report all three frozen routing weightings, niche counts, per-family counts, upper-tail finite regret, and separate base/family bootstrap intervals. Profile pooling is descriptive only; it cannot conceal a failed individual common-job profile. Oracle-infeasible cases remain in absolute denominators.','',
        '## Joint policy interpretation','',
        f"The fixed global choice remains `{global_id}`. The three-combination set remains: "+'; '.join('`'+x+'`' for x in triple)+'. Neither is changed in response to these outcomes.', '',
        'The joint scoped oracle has three default-routing layout references and nine preselected layout×route alternatives. The all-nine result and the three-layout default result are retrospective upper bounds. The explicit specialist escape uses the existing source recipe when generic root rebuilding is inapplicable; nominal engine labels are not credited as independently solving that specialist case.','',
        '| Fixed global versus current source | Valid candidate | Valid current | New valid | New invalid |',
        '| --- | ---: | ---: | ---: | ---: |']
    for s in global_pairs:lines.append(f"| {s['subset']} | {s['valid_candidates']} / {s['pairs']} | {s['valid_baselines']} / {s['pairs']} | {s['new_valid']} | {s['new_invalid']} |")
    lines += ['',
        'Matched-layout direct comparisons, including each hard regression and worst valid soft regression, are saved separately. A successful route from a checkpoint can be a useful diagnostic rescue; it does not retroactively turn the original source timeout into a success. The main cold-source acceptance decision remains the frozen full-pipeline C/G analysis.','',
        '## Timing and budget sensitivity','',
        f"Derived serial estimates are available for {sum(r['derived_serial_compile_plus_route_worker_ms'] is not None for r in runtimes)}/{len(runtimes)} route trials. {sum(r['hard_valid'] and r['derived_serial_budget_eligible'] is False for r in runtimes)} hard-valid route outputs exceed 15,000 ms in the derived compile-plus-route-worker estimate. These remain their observed route-only outcomes in primary tables; the separate budget sensitivity reports eligibility without changing geometric labels.",'',
        'The estimate adds the canonical source compile component—or its saved checkpoint component—to the actual route worker time. Missing compile time remains unknown. Cached routes, completed layouts, task scheduling and process startup differ from a fresh cold render, so this is neither an end-to-end latency measurement nor permission to advertise a faster default. A portfolio also requires multiple computations; its oracle coverage is not the latency of one selected route.','',
        '## Stability, uncertainty, and inference limits','',
        'All candidates receive empty router history. Workers record static before/after side/path differences, but the static five-profile projection omits that incidental edit block: this reproduces development source scoring, where the stable profile is balanced DI. Genuine small-edit prior-side stability is evaluated in E and the shared-history routing stratum.','',
        'Each 2,000-draw bootstrap resamples whole bases with all their correlated profiles, or whole families with all member bases. These intervals express uncertainty in this synthetic sample. They do not count alternate settings as independent users or establish perceptual equivalence. Conditional score intervals require both outputs valid; validity intervals keep failed and timed-out cases.','',
        'Replay: `python evaluation/analyze-heldout-routing.py --analyze --allow-heldout-after-freeze`. Without both flags, the program validates only policy/task definitions and opens no heldout outcomes. The pre-outcome interpretation is preserved in `data/analysis/heldout-routing-analysis-design.json`.','']
    (ROOT/'heldout-routing-findings.md').write_text('\n'.join(lines))


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--analyze',action='store_true');parser.add_argument('--allow-heldout-after-freeze',action='store_true')
    args=parser.parse_args();OUT.mkdir(exist_ok=True,parents=True)
    freeze,cases,routes,joints,global_id,triple,layouts,tasks=validate_design()
    design=write_design_once(design_record(freeze,routes,joints,global_id,triple))
    if not args.analyze:
        print(json.dumps({'design_only':True,'heldout_outcomes_opened':False,'tasks':len(tasks),'freeze_sha256':sha(DATA/'policy-freeze.json'),'analysis_design_sha256':sha(OUT/'heldout-routing-analysis-design.json')},indent=2));return
    if not args.allow_heldout_after_freeze:raise SystemExit('Outcome analysis requires explicit --allow-heldout-after-freeze')
    P=read_module('heldout_routing_portfolio','analyze-portfolio.py');C=read_module('heldout_routing_controls','analyze-controls.py')
    stages={};infos=[]
    for stem in STEMS:stages[stem],info=load_completed(stem);infos.append(info)
    source=stages['screen-heldout']+stages['documented-default-heldout']+stages['selected-presets-heldout'];catalog={r['id']:r for r in source}
    current={r['caseId']:r for r in stages['screen-heldout'] if r['_task'].get('tag')=='current'}
    assert set(current)==set(cases)
    current_rows=stages['routing-current-heldout'];joint_rows=stages['joint-heldout'];route_rows=current_rows+joint_rows
    checks=attach_reference_checks(route_rows,catalog,routes)
    used={r['id']:r for r in route_rows if r['status']=='ok'}
    for r in route_rows:
        ref=r['_default_reference']
        if ref['status']=='ok':used[ref['id']]=ref
    for r in current.values():
        if r['status']=='ok':used[r['id']]=r
    check=subprocess.run(['node',str(ROOT/'evaluation/verify-control-archives.mjs')],input=json.dumps(list(used.values())),text=True,capture_output=True,check=True)
    verification=json.loads(check.stdout)
    if verification['mismatches']:raise ValueError('Canonical archive mismatch; no result tables written')
    # Everything below is frozen-choice evaluation, never subset search or training.
    current_default=[]
    for cid,r in current.items():
        observed=r.get('timing',{}).get('workerMs')
        current_default.append({**r,'method':'current-default','_serial_budget_eligible':observed<=BUDGET_MS if observed is not None else None})
    for r in current_rows:r['method']=r['_task']['tag']['routingPolicy']
    current_strategies=[{'name':'current-default','methods':['current-default'],'role':'measured current source baseline'}]
    current_strategies += [{'name':p,'methods':[p],'role':'fixed frozen route policy'} for p in routes]
    current_strategies += [{'name':'frozen-three-route-union','methods':list(routes),'role':'oracle Compare upper bound'},
                           {'name':'retain-current-plus-three','methods':['current-default']+list(routes),'role':'full scoped oracle; retain current plus alternatives'}]
    cs,cr=summarize_context('routing-current-heldout',current_rows,current_default,current,cases,P,current_strategies)
    joint_defaults={}
    for r in joint_rows:
        tag=r['_task']['tag'];r['method']=tag['layoutMethod']+'|routing:'+tag['routingPolicy']
        base=r['_default_reference'];method=tag['layoutMethod']+'|routing:default'
        observed=base.get('timing',{}).get('workerMs')
        joint_defaults[r['caseId'],method]={**base,'method':method,'effective_layout_method':tag['effectiveLayoutMethod'],'specialist_fallback':tag['specialistFallback'],
            '_serial_budget_eligible':observed<=BUDGET_MS if observed is not None else None}
    default_ids=[m+'|routing:default' for m in layouts]
    joint_strategies=[{'name':'frozen-joint-global','methods':[global_id],'role':'fixed frozen global policy'},
        {'name':'frozen-joint-triple','methods':triple,'role':'oracle Compare upper bound from frozen three'},
        {'name':'default-three-layouts','methods':default_ids,'role':'matched three-layout default-route oracle benchmark'},
        {'name':'all-nine-joint','methods':list(joints),'role':'nine-combination oracle diagnostic'},
        {'name':'all-twelve-scoped-pool','methods':default_ids+list(joints),'role':'full scoped oracle diagnostic'}]
    js,jr=summarize_context('joint-heldout',joint_rows,list(joint_defaults.values()),current,cases,P,joint_strategies)
    cp=paired_records(current_rows,{r['id']:r['_default_reference'] for r in current_rows},cases,C,'same-current-layout-default-routing')
    jp=paired_records(joint_rows,{r['id']:r['_default_reference'] for r in joint_rows},cases,C,'same-frozen-layout-default-routing')
    gr=[r for r in joint_rows if r['method']==global_id]
    gp=paired_records(gr,{r['id']:current[r['caseId']] for r in gr},cases,C,'fixed-joint-global-versus-current-source')
    cps=paired_summary(cp);jps=paired_summary(jp);gps=paired_summary(gp)
    for name,pairs,summaries in [('routing-current-heldout',cp,cps),('joint-heldout',jp,jps),('joint-global-heldout',gp,gps)]:
        save(name+'-pairs',pairs);write_csv(name+'-pairs',pairs);save(name+'-pair-summary',summaries);write_csv(name+'-pair-summary',summaries)
    runtimes=runtime_rows(route_rows);save('heldout-routing-runtime',runtimes);write_csv('heldout-routing-runtime',runtimes)
    save('heldout-routing-reference-checks',checks);save('heldout-routing-archive-verification',verification)
    manifest={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'policyFreezeSha256':sha(DATA/'policy-freeze.json'),
        'design_sha256':sha(OUT/'heldout-routing-analysis-design.json'),'code_sha256':sha(pathlib.Path(__file__)),
        'no_selection_or_fitting':True,'no_geometry_algorithms':True,'stages':infos,'cases':24,'common_cases':14,'families':12,
        'primary_timing_interpretation':design['primary_estimand'],'bootstrap':design['uncertainty'],
        'reference_checks':{'trials':len(checks),'successful_document_checks':sum(c.get('same_document_except_routing') is True for c in checks),
            'partial_reference_trials':sum(c['reference']['partial'] for c in checks),
            'missing_input_artifacts':sum(not c['reference']['artifact_available'] for c in checks),
            'specialist_fallback_trials':sum(c['specialist_fallback'] for c in checks)},'verification':verification}
    save('heldout-routing-analysis-manifest',manifest)
    report(manifest,cs,js,cps,jps,gps,runtimes,global_id,triple)
    print(json.dumps({'heldout_analysis_complete':True,'verified_archives':verification['verified'],'reference_checks':manifest['reference_checks'],
        'current_all_profiles':[s for s in cs if s['subset']=='all' and s['axis']=='five_profiles_pooled'],
        'joint_all_profiles':[s for s in js if s['subset']=='all' and s['axis']=='five_profiles_pooled']},indent=2))


if __name__=='__main__':main()
