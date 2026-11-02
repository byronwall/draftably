#!/usr/bin/env python3
"""Read-only DEVELOPMENT analysis of joint routing, direction, and warm engines.

No source algorithm is executed. First terminal rows are canonical. Contexts are
kept separate: compiled layouts + routed alternatives; raw cold network engines;
and warm actions on a shared native current drawing. No heldout outcome is read.
"""
from __future__ import annotations
import collections, copy, datetime, importlib.util, itertools, json, math, pathlib, statistics, subprocess

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / 'data/analysis'


def module(name, filename):
    spec = importlib.util.spec_from_file_location(name, ROOT / 'evaluation' / filename)
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    return m


C = module('context_controls', 'analyze-controls.py')
P = module('context_portfolio', 'analyze-portfolio.py')
CASES = {c['id']: c for c in json.loads((ROOT/'corpus/manifest.json').read_text())['cases'] if c['split'] == 'development'}
PROFILES = P.PROFILES


def clean(v):
    if isinstance(v, float) and not math.isfinite(v): return None
    if isinstance(v, dict): return {k: clean(x) for k, x in v.items()}
    if isinstance(v, (list, tuple)): return [clean(x) for x in v]
    return v


def save(name, value): C.write_json(name + '.json', clean(value))
def csv(name, rows): C.write_csv(name + '.csv', clean(rows))
def mean(v): return C.mean(v)
def valid(r): return bool(r and P.is_valid(r))
def quantile(values, q):
    a = sorted(x for x in values if x is not None and math.isfinite(x))
    if not a: return None
    k = (len(a)-1)*q
    return a[math.floor(k)]*(1-k+math.floor(k)) + a[math.ceil(k)]*(k-math.floor(k))


def load(stem):
    rows, tasks, info = C.load_completed(stem)
    if info['state'] != 'complete': raise ValueError(f'Incomplete stage: {stem}')
    if any(t.get('split') != 'development' for t in tasks.values()): raise ValueError('Non-development task')
    return [{**tasks[r['id']], **r, '_task': tasks[r['id']]} for r in rows], info


def timing_summary(rows):
    vals = [r.get('timing',{}).get('totalMs',r.get('timing',{}).get('workerMs')) for r in rows]
    return {'recorded_operation_median_ms': quantile(vals,.5), 'recorded_operation_p95_ms':quantile(vals,.95),
            'routing_cache_hits':sum(r.get('routingCacheHit') is True for r in rows),
            'routing_cache_status_available':sum('routingCacheHit' in r for r in rows),
            'timing_caution':'Observed components with cache/order effects; use cache-bypassed timing stage for algorithm speed claims.'}


def profile_table(pool, profiles=PROFILES):
    """Same frozen scores/bands as analyze-portfolio.py, min area over valid pool."""
    bycase = collections.defaultdict(dict)
    for r in pool:
        if r['method'] in bycase[r['caseId']]: raise ValueError('Duplicate context method')
        bycase[r['caseId']][r['method']] = r
    jobs = []
    for cid, methods in sorted(bycase.items()):
        minarea = min((r['metrics']['area'] for r in methods.values() if valid(r)),default=1)
        for profile in profiles:
            scores = {m:P.profile_score(r,profile,minarea,P.target_aspect(CASES[cid])) for m,r in methods.items()}
            good = [m for m,r in methods.items() if valid(r)]
            oracle = min(good,key=lambda m:(scores[m],methods[m]['id'])) if good else None
            os = scores[oracle] if oracle else math.inf
            accept = {m for m in methods if oracle and P.acceptable(methods[m],scores[m],methods[oracle],os)}
            jobs.append({'case_id':cid,'family':CASES[cid]['family'],'profile':profile,
                         'methods':methods,'scores':scores,'oracle_method':oracle,'oracle_score':os,'acceptable':accept})
    return bycase, jobs


def evaluate(methods, bycase, jobs, always=()):
    selected = tuple(sorted(set(methods)|set(always)))
    covered = [j for j in jobs if j['acceptable'].intersection(selected)]
    valid_cases = sum(any(valid(rs.get(m)) for m in selected) for rs in bycase.values())
    regrets = []
    for j in jobs:
        scores = [j['scores'].get(m,math.inf) for m in selected]
        if j['oracle_method'] and math.isfinite(min(scores,default=math.inf)):
            regrets.append((j['family'],min(scores)-j['oracle_score']))
    fam = collections.defaultdict(list)
    for f,v in regrets: fam[f].append(v)
    ef = mean([mean(v) for v in fam.values()])
    return {'methods':list(methods),'always_available':list(always),'hard_valid_case_union':valid_cases,
            'cases':len(bycase),'acceptable_profile_jobs':len(covered),'profile_jobs':len(jobs),
            'feasible_profile_jobs':sum(j['oracle_method'] is not None for j in jobs),
            'equal_family_mean_regret_on_covered_valid_jobs':ef,
            'score_regret_available_jobs':len(regrets),
            'per_profile':{p:{'acceptable':sum(j['profile']==p for j in covered),
                              'feasible':sum(j['profile']==p and j['oracle_method'] is not None for j in jobs)} for p in dict.fromkeys(j['profile'] for j in jobs)}}


def objective(r):
    return (-r['hard_valid_case_union'],-r['acceptable_profile_jobs'],
            r['equal_family_mean_regret_on_covered_valid_jobs'] if r['equal_family_mean_regret_on_covered_valid_jobs'] is not None else math.inf,
            tuple(r['methods']))


def search(methods, bycase, jobs, size, always=()):
    return min((evaluate(s,bycase,jobs,always) for s in itertools.combinations(methods,size)),key=objective)


def witness(row, baseline=None):
    out={'case_id':row['caseId'],'family':row['family'],'trial_id':row['id'],'method':row.get('method'),
         'status':row['status'],'hard_valid':valid(row),'geometry':row.get('geometry'),
         'hard':row.get('hard',[]),'intent_failures':row.get('intent',{}).get('failures',[])}
    if baseline: out.update(baseline_id=baseline['id'],baseline_valid=valid(baseline),baseline_geometry=baseline.get('geometry'))
    return out


def paired_summary(pairs):
    both = [p for p in pairs if p['hard_valid'] and p['baseline_hard_valid']]
    return {'paired_jobs':len(pairs),'comparable_geometry':sum(p['geometry_changed_over_1px'] is not None for p in pairs),
            'exact_geometry_changed':sum(p['exact_geometry_changed'] is True for p in pairs),
            'geometry_changed_over_1px':sum(p['geometry_changed_over_1px'] is True for p in pairs),
            'hard_valid_candidates':sum(p['hard_valid'] for p in pairs),'hard_valid_baselines':sum(p['baseline_hard_valid'] for p in pairs),
            'valid_gained':sum(p['valid_gained'] for p in pairs),'valid_lost':sum(p['valid_lost'] for p in pairs),
            'both_valid_pairs':len(both),
            'mean_balanced_delta_both_valid':mean([p['delta_score_balanced'] for p in both]),
            'mean_traceable_delta_both_valid':mean([p['delta_score_traceable'] for p in both]),
            'mean_route_length_delta_both_valid':mean([p['delta_routeLength'] for p in both]),
            'mean_area_delta_both_valid':mean([p['delta_area'] for p in both]),
            'gain_witnesses':[p['trial_id'] for p in pairs if p['valid_gained']],
            'loss_witnesses':[p['trial_id'] for p in pairs if p['valid_lost']],
            'best_soft_witness':min(both,key=lambda p:p['delta_score_balanced']) if both else None,
            'worst_soft_witness':max(both,key=lambda p:p['delta_score_balanced']) if both else None}


def joint_analysis(rows, source_rows):
    index={(r['caseId'],P.method_key(r['_task'])):r for r in source_rows}
    pairs=[]; pool=[]; references={}; signature_checks=[]
    for r in rows:
        tag=r['_task']['tag']; layout=tag['layoutMethod']; route=tag['routingPolicy']
        base=index.get((r['caseId'],layout))
        if base is None: raise ValueError(f'Missing matched default-routing reference: {r["caseId"]} {layout}')
        basemethod=layout+'|routing:default'
        references[(r['caseId'],basemethod)]={**base,'method':basemethod,'layout_method':layout,'routing_policy':'default'}
        r={**r,'method':layout+'|routing:'+route,'layout_method':layout,'routing_policy':route}
        pool.append(r)
        p=C.paired(r,base,'joint-routing',route,'source-layout-then-routing')
        p['layout_method']=layout;p['routing_policy']=route
        if r['status']=='ok' and base['status']=='ok':
            ag=C.geometry(r['geometry']); bg=C.geometry(base['geometry'])
            source_equal=ag.get('source') == bg.get('source')
            p['identical_compiled_source']=source_equal
            signature_checks.append({'trial_id':r['id'],'baseline_id':base['id'],'source_equal':source_equal,'max_node_delta':p['max_node_box_coordinate_delta']})
            if not source_equal or p['max_node_box_coordinate_delta'] != 0:
                raise ValueError(f'Joint route comparison changed placement/source: {r["id"]}')
        pairs.append(p)
    pool.extend(references.values())
    bycase,jobs=profile_table(pool)
    summaries=[]
    for layout,route in sorted({(p['layout_method'],p['routing_policy']) for p in pairs}):
        ps=[p for p in pairs if (p['layout_method'],p['routing_policy'])==(layout,route)]
        summaries.append({'layout_method':layout,'routing_policy':route,**paired_summary(ps)})
    methods=sorted({r['method'] for r in pool})
    default_methods=[m for m in methods if m.endswith('routing:default')]
    joint_methods=[m for m in methods if m not in default_methods]
    full=evaluate(methods,bycase,jobs)
    defaults=evaluate(default_methods,bycase,jobs)
    singles=[evaluate([m],bycase,jobs) for m in methods]
    # Route alternatives can matter after the best of all three layouts is available.
    joint_only=[]
    for j in jobs:
        if j['acceptable'] and not j['acceptable'].intersection(default_methods):
            best=j['methods'][j['oracle_method']]
            valid_defaults=[m for m in default_methods if valid(j['methods'].get(m))]
            bestdefault=min(valid_defaults,key=lambda m:j['scores'][m]) if valid_defaults else None
            joint_only.append({'case_id':j['case_id'],'family':j['family'],'profile':j['profile'],
                'joint_oracle':witness(best),'default_oracle':witness(j['methods'][bestdefault]) if bestdefault else None,
                'joint_score':j['oracle_score'],'default_score':j['scores'][bestdefault] if bestdefault else None,
                'joint_acceptable_methods':sorted(j['acceptable'])})
    bylayout=[]
    for layout in sorted({r['layout_method'] for r in pool}):
        these=[m for m in methods if m.startswith(layout+'|')]
        bylayout.append({'layout_method':layout,'default':evaluate([layout+'|routing:default'],bycase,jobs),
                        'default_plus_3_route_alternatives':evaluate(these,bycase,jobs)})
    result={'estimand':'Unchanged source compilation at three fixed layout configurations, followed by production routing with three selected scalar presets. Router overrides occur after compilation and cannot change compiler channel spacing.',
        'cases':len(bycase),'joint_trials':len(rows),'matched_default_routing_trials':len(references),
        'source_and_node_checks':signature_checks,'per_layout_policy':summaries,'default_three_layout_oracle':defaults,
        'all_three_layouts_four_routes_oracle':full,'global_single_configurations':sorted(singles,key=objective),
        'best_global_three_configurations':search(methods,bycase,jobs,3),'per_layout':bylayout,
        'joint_only_acceptable_jobs':joint_only,'oracle_caution':'Oracle coverage is a retrospective upper bound, not an implemented selector; no partial-grid outcome is imputed.'}
    global_choice=search(joint_methods,bycase,jobs,1)
    portfolio_choice=search(joint_methods,bycase,jobs,3)
    method_details={}
    for r in pool:
        if r['method'] in joint_methods:
            method_details[r['method']]={'joint_id':r['method'],'layout_method':r['layout_method'],
                'routing_policy':r['routing_policy'],'layout':r['_task']['layout'],'routing':r['_task']['routing']}
    current={r['caseId']:r for r in source_rows if P.method_key(r['_task'])=='current'}
    chosen=global_choice['methods'][0]
    direct_pairs=[C.paired(rs[chosen],current[cid],'joint-global-choice',chosen,'source-layout-then-routing') for cid,rs in bycase.items()]
    proposal={'status':'DEVELOPMENT PROPOSAL ONLY; freeze before reading heldout outcomes',
        'selection_pool':'Exactly the nine preselected layout×routing combinations; default-routing references benchmark them but cannot be substituted into this selected set.',
        'selection_rule':'Exhaustive equal-budget subsets; maximize hard-valid case union, then acceptable case×profile coverage, then minimize equal-family mean regret on valid covered jobs, then lexical IDs. Frozen scores and practical bands use the full 12-combination comparison universe (3 default-routing references + 9 joint alternatives).',
        'development_cases':sorted(bycase),'profiles':list(PROFILES),
        'fixed_global_choice':method_details[chosen],'fixed_global_stats':global_choice,
        'fixed_global_against_current_raw':paired_summary(direct_pairs),
        'three_combination_portfolio':[method_details[m] for m in portfolio_choice['methods']],
        'three_combination_portfolio_stats':portfolio_choice,
        'nine_combination_pool':[method_details[m] for m in joint_methods],
        'nine_combination_oracle_stats':evaluate(joint_methods,bycase,jobs),
        'deployment_distinction':'The fixed global choice can be deployed without an oracle. The three- and nine-combination results are per-job choice upper bounds for Compare, not automatic selection. No new input-feature router selector is fitted here.',
        'guard':'Report raw direct hard-valid losses against current; any hard-validity fallback must be separately labeled and its cost included. No soft-quality fallback or heldout retuning is authorized by this proposal.',
        'compiler_coupling_limit':'Routing options are applied after actual source compilation. This evaluates source-produced positions plus production routing, not changing compiler spacing with router settings.',
        'source_data_sha256':C.digest(ROOT/'data/joint-development.jsonl'),
        'routing_proposal_sha256':C.digest(ROOT/'data/analysis/routing-policy-proposal.json')}
    if (ROOT/'data/policy-freeze.json').exists():
        if json.loads((OUT/'joint-policy-proposal.json').read_text()) != clean(proposal):
            raise ValueError('Refusing to change the joint policy after freeze')
    else:
        save('joint-policy-proposal',proposal)
    result['fixed_global_joint_choice']=global_choice
    result['fixed_three_joint_portfolio']=portfolio_choice
    result['nine_joint_oracle']=evaluate(joint_methods,bycase,jobs)
    save('control-joint-summary',result);csv('control-joint-pairs',pairs);save('control-joint-pairs',pairs)
    csv('control-joint-policy-summary',[{k:v for k,v in x.items() if not isinstance(v,(dict,list))} for x in summaries])
    return result,pool


def network_analysis(rows):
    pairs=[]; pool=[]
    for r in rows:
        opt=r['_task']['options'];r['method']=opt['algorithm']+':respectDirection='+str(opt['respectDirection']).lower();pool.append(r)
    ix={(r['caseId'],r['_task']['options']['algorithm'],r['_task']['options']['respectDirection']):r for r in rows}
    for cid,alg in sorted({(r['caseId'],r['_task']['options']['algorithm']) for r in rows}):
        candidate=ix[cid,alg,False];base=ix[cid,alg,True]
        p=C.paired(candidate,base,'respectDirection',False,'raw-cold-rebuild-not-source')
        p['engine']=alg;p['candidate_reference_partial']=candidate.get('referencePartial');p['baseline_reference_partial']=base.get('referencePartial')
        pairs.append(p)
    summaries=[]
    for alg in sorted({p['engine'] for p in pairs}):
        ps=[p for p in pairs if p['engine']==alg]
        summaries.append({'engine':alg,**paired_summary(ps),
                          'status_counts_true':dict(collections.Counter(ix[p['case_id'],alg,True]['status'] for p in ps)),
                          'status_counts_false':dict(collections.Counter(ix[p['case_id'],alg,False]['status'] for p in ps))})
    # Stable-edit inference is inapplicable to these explicitly cold rebuilds.
    bycase,jobs=profile_table(pool,profiles=['readable','compact','traceable','specialist'])
    methods=sorted({r['method'] for r in pool}); true=[m for m in methods if m.endswith('=true')]
    full=evaluate(methods,bycase,jobs);default=evaluate(true,bycase,jobs)
    unique=[]
    for j in jobs:
        if j['acceptable'] and not j['acceptable'].intersection(true):
            unique.append({'case_id':j['case_id'],'profile':j['profile'],'oracle_trial':j['methods'][j['oracle_method']]['id'],
                          'acceptable_methods':sorted(j['acceptable'])})
    result={'estimand':'Four production engines, raw cold rebuild (warmStart=false, settle=true, maxIterations=640), two respectDirection values, same twelve cases in three families. Not compiler/source behavior and not a warm editing estimand.',
            'cases':len(bycase),'trials':len(rows),'statuses':dict(collections.Counter(r['status'] for r in rows)),
            'per_engine':summaries,'respect_direction_true_pool':default,'true_and_false_pool':full,
            'false_required_for_acceptable_jobs':unique,'global_single_configurations':sorted([evaluate([m],bycase,jobs) for m in methods],key=objective),
            'cold_displacement_caution':'Raw edit metrics in the archive compare a new cold rebuild to its input; they are not credited as stable local editing.',
            **timing_summary(rows)}
    save('control-network-summary',result);save('control-network-pairs',pairs);csv('control-network-pairs',pairs)
    csv('control-network-engine-summary',[{k:v for k,v in x.items() if not isinstance(v,(dict,list))} for x in summaries])
    return result,pool


def constraint_context(reference):
    art=C.geometry(reference['geometry']);doc=art['doc']; nodes=doc['layout']['nodes']
    return {'pinned_ids':[i for i,n in nodes.items() if n.get('pinned')],
            'manual_ids':[i for i,n in nodes.items() if n.get('manual')],
            'collapsed_groups':doc.get('collapsed',[]),'groups':len(doc['graph']['groups']),
            'authored_side_edges':[i for i,e in doc['layout']['edges'].items() if e.get('fromSide') or e.get('toSide')],
            'scope':'all','new_perturbation':False,'shared_history_routes':len(art.get('routes',[]))}


def warm_analysis(rows, source_rows):
    rows=[r for r in rows if r['_task'].get('tag')=='warm-repair']
    ix={r['id']:r for r in source_rows}; refs={}; pool=[];pairs=[];contexts=[]
    for r in rows:
        task=r['_task'];refid=pathlib.Path(task['reference']).name.removesuffix('.json.gz');ref=ix[refid]
        if ref['status']!='ok':raise ValueError('Warm repair needs completed current reference')
        if task.get('patchDoc'):raise ValueError('Unexpected perturbation in native warm screen')
        if task.get('history') is not True:raise ValueError('Warm repair lacks shared prior route history')
        r['method']=task['options']['algorithm'];pool.append(r)
        retention=copy.deepcopy(ref);retention['method']='retain-current'
        retention['metrics']['edit']={'translationAdjustedMean':0,'translationAdjustedMax':0,'meanDisplacement':0,'maxDisplacement':0,'changedSideRate':0,'changedRouteRate':0,'requestedGlobalReflow':False}
        retention['identityDerivation']='No-action identity reference; not an extra run or latency measurement.'
        refs[r['caseId']]=retention
        p=C.paired(r,ref,'warm-engine',r['method'],'native-current-warm-pass')
        p['engine']=r['method'];pairs.append(p)
    for cid,ref in sorted(refs.items()): contexts.append({'case_id':cid,'reference_id':ref['id'],**constraint_context(ref)})
    pool.extend(refs.values());bycase,jobs=profile_table(pool)
    methods=sorted({r['method'] for r in rows});always=['retain-current']
    full=evaluate(methods,bycase,jobs,always)
    singles=[]
    for method in methods:
        rs=[r for r in rows if r['method']==method]; ps=[p for p in pairs if p['engine']==method]
        good=[r for r in rs if valid(r)]
        m={'engine':method,**paired_summary(ps),'statuses':dict(collections.Counter(r['status'] for r in rs)),
           'pool_with_retention':evaluate([method],bycase,jobs,always),'standalone':evaluate([method],bycase,jobs),
           'hard_failure_cases':[witness(r,refs[r['caseId']]) for r in rs if not valid(r)],
           'mean_adjusted_movement_all_completed':mean([r.get('metrics',{}).get('edit',{}).get('translationAdjustedMean') for r in rs]),
           'mean_changed_side_rate_all_completed':mean([r.get('metrics',{}).get('edit',{}).get('changedSideRate') for r in rs]),
           'mean_balanced_valid_only':mean([C.score(r) for r in good]),
           'pin_scope_failures':sum(r.get('metrics',{}).get('pinScopeViolations',0) for r in rs),
           'authored_side_failures':sum(r.get('metrics',{}).get('authoredSideViolations',0) for r in rs),
           'required_intent_failures':sum(r.get('metrics',{}).get('requiredIntentFailures',0) for r in rs),**timing_summary(rs)}
        singles.append(m)
    curve=[{'size':0,**evaluate([],bycase,jobs,always)}]
    for k in range(1,len(methods)+1):curve.append({'size':k,**search(methods,bycase,jobs,k,always)})
    base3=next(x for x in curve if x['size']==3)
    ablations=[]
    for method in methods:
        remaining=[m for m in methods if m!=method]
        loss=evaluate(remaining,bycase,jobs,always)
        unique=[]
        for j in jobs:
            if j['acceptable'] and j['acceptable']=={method}:
                bestother=min((m for m in j['methods'] if m!=method and valid(j['methods'][m])),key=lambda m:j['scores'][m],default=None)
                unique.append({'case_id':j['case_id'],'family':j['family'],'profile':j['profile'],
                    'unique_trial':j['methods'][method]['id'],'unique_score':j['scores'][method],
                    'best_remaining_trial':j['methods'][bestother]['id'] if bestother else None,
                    'best_remaining_score':j['scores'][bestother] if bestother else None,
                    'unique_geometry':j['methods'][method].get('geometry'),
                    'remaining_geometry':j['methods'][bestother].get('geometry') if bestother else None,
                    'best_remaining_score_delta':j['scores'][bestother]-j['scores'][method] if bestother else None,
                    'best_remaining_area_ratio':j['methods'][bestother]['metrics']['area']/j['methods'][method]['metrics']['area'] if bestother else None,
                    'best_remaining_route_length_ratio':j['methods'][bestother]['metrics']['routeLength']/max(1e-12,j['methods'][method]['metrics']['routeLength']) if bestother else None,
                    'practical_rule':'Score <= oracle +1 AND area <= oracle ×1.10 AND route length <= oracle ×1.10. A tied soft score can still fail area or path-length bands.'})
        fixed=[m for m in base3['methods'] if m!=method]
        retuned=search(remaining,bycase,jobs,3,always)
        ablations.append({'removed_engine':method,'full_pool_without':loss,
            'full_pool_acceptable_loss':full['acceptable_profile_jobs']-loss['acceptable_profile_jobs'],
            'full_pool_hard_valid_case_loss':full['hard_valid_case_union']-loss['hard_valid_case_union'],
            'fixed_selected_three_without':evaluate(fixed,bycase,jobs,always),
            'retuned_same_three_action_budget':retuned,
            'retuned_acceptable_loss':base3['acceptable_profile_jobs']-retuned['acceptable_profile_jobs'],
            'unique_practical_witnesses':unique})
    result={'estimand':'Eleven shipped warm pass algorithms on twelve native current drawings, with shared prior routes and inherited pins. No new position perturbation, manual patch, scope change, or collapsed-state patch is applied in this 132-run stratum.',
        'trials':len(rows),'cases':len(bycase),'families':len({r['family'] for r in rows}),'statuses':dict(collections.Counter(r['status'] for r in rows)),
        'input_contexts':contexts,'per_engine':singles,'full_pool_with_retention':full,
        'best_action_portfolio_curve':curve,'leave_one_engine_out':ablations,
        'retention_caution':'retain-current is the measured source drawing kept unchanged. Movement/churn zero follow identity; source compile time is not treated as the latency of doing nothing.',
        'portfolio_caution':'Per-job choice is an oracle. The curve is a finite tested-set bound, not an implemented action selector or evidence to delete internal engines.',
        'constraints_caution':'Manual preservation is not newly requested in these default passes; use the protected warm-settings and edit strata for that contract.'}
    save('control-warm-engines',result);save('control-warm-engine-pairs',pairs);csv('control-warm-engine-pairs',pairs)
    csv('control-warm-engine-summary',[{k:v for k,v in x.items() if not isinstance(v,(dict,list))} for x in singles])
    csv('control-warm-engine-ablation',[{k:v for k,v in x.items() if not isinstance(v,(dict,list))} for x in ablations])
    return result,pool


def failure_partition(rows):
    out=[]
    for r in rows:
        if r['status']=='ok':continue
        error=r.get('error','')
        kind='input-unavailable' if 'ENOENT' in error else 'unsupported-cross-parent-scope' if 'Select objects in one container' in error else 'execution-failure'
        out.append({'trial_id':r['id'],'case_id':r['caseId'],'control':r.get('control'),'level':r.get('level'),
                    'status':r['status'],'classification':kind,'error':error.splitlines()[0],
                    'interpretation':'Original trial remains unsuccessful; not evidence of a completed geometry regression.'})
    result={'original_failures':len(out),'counts':dict(collections.Counter(r['classification'] for r in out)),
            'rows':out,'supplemental_rule':'Valid-sibling and checkpoint cases are separate later trials; they do not replace original failures or silently repair coverage.'}
    save('control-warm-failure-partition',result);csv('control-warm-failure-partition',out)
    return result


def targeted_scope_analysis(rows):
    scope=[r for r in rows if r.get('tag')=='valid-sibling-scope-target']
    bases={r['caseId']:r for r in scope if r.get('level')=='all'}
    pairs=[]
    for r in scope:
        base=bases[r['caseId']]
        if r['level']=='all':continue
        a,b=r['_task'],base['_task']
        for field in ['reference','patchDoc','history','allowPartialReference']:
            if a.get(field)!=b.get(field):raise ValueError('Scope probe changed input context')
        pairs.append(C.paired(r,base,'scope',r['level'],'targeted-valid-sibling-scope'))
    summaries=[]
    for level in ['all','selection','neighbourhood','container']:
        rs=[r for r in scope if r['level']==level]
        summaries.append({'scope':level,'jobs':len(rs),'statuses':dict(collections.Counter(r['status'] for r in rs)),
            'hard_valid':sum(valid(r) for r in rs),
            'hard_defect_count_completed':sum(r.get('metrics',{}).get('hardDefects',0) for r in rs),
            'pin_scope_violation_count_completed':sum(r.get('metrics',{}).get('pinScopeViolations',0) for r in rs),
            'required_intent_failure_count_completed':sum(r.get('metrics',{}).get('requiredIntentFailures',0) for r in rs),
            'routing_hard_defect_count_completed':sum(r.get('metrics',{}).get('routingHardDefects',0) for r in rs),
            'hard_failure_witnesses':[witness(r) for r in rs if not valid(r)],
            'paired_with_all':paired_summary([p for p in pairs if p['level']==level]) if level!='all' else None})
    checkpoints=[r for r in rows if r.get('tag')=='checkpoint-input-supplement']
    result={'estimand':'Supplemental supported-sibling scope experiment, separate from the original invalid cross-parent selections. Every scope shares the same patched input, reference, and prior-route availability per case; scope requirements themselves differ.',
        'trials':len(rows),'scope_trials':len(scope),'checkpoint_growth_trials':len(checkpoints),
        'statuses':dict(collections.Counter(r['status'] for r in rows)),'per_scope':summaries,
        'checkpoint_growth_outcomes':[{'trial_id':r['id'],'level':r['level'],'status':r['status'],'error':r.get('error')} for r in checkpoints],
        'availability':'Architecture-04 uses the existing layout checkpoint because current routing timed out. It supplies no fabricated prior routes. All six supplemental architecture-04 attempts also time out at 15 seconds.',
        'interpretation':'Scope is an authored movement constraint, not a knob whose smallest defect index wins. A scoped result can be less globally tidy while correctly preserving outside objects. Original 14 unsupported-scope and six missing-input outcomes remain unchanged.'}
    save('control-warm-targeted',result);save('control-warm-targeted-pairs',pairs);csv('control-warm-targeted-pairs',pairs)
    csv('control-warm-targeted-summary',[{k:v for k,v in x.items() if not isinstance(v,(dict,list))} for x in summaries])
    return result


def fmt(v): return 'NA' if v is None else f'{v:.3f}' if isinstance(v,float) else str(v)


def report(joint,network,warm,failures,targeted):
    lines=['# Context-dependent control and warm-engine findings','',
        '**Measured development results from unchanged shipped algorithms.** These three strata answer different questions and remain separate. First terminal rows are canonical. No heldout output is read; no algorithm is rerun by this analysis.','',
        '## Routing alternatives after layout','',joint['estimand'],'',
        f"The 108 joint runs pair three layouts and three selected route presets on 12 bases. There are {joint['matched_default_routing_trials']} matched default-routing source runs. All comparable sources and node boxes were checked identical; any mismatch stops analysis. Thus these are routing gains conditional on a layout, not evidence that a router option changes compiler placement.",'',
        '| Layout | Route alternative | Hard-valid / 12 | New valid | Newly invalid | Changed geometry >1 px | Balanced score delta, both valid |',
        '| --- | --- | ---: | ---: | ---: | ---: | ---: |']
    for s in joint['per_layout_policy']:
        lines.append(f"| {s['layout_method']} | {s['routing_policy']} | {s['hard_valid_candidates']} | {s['valid_gained']} | {s['valid_lost']} | {s['geometry_changed_over_1px']} | {fmt(s['mean_balanced_delta_both_valid'])} |")
    d,f=joint['default_three_layout_oracle'],joint['all_three_layouts_four_routes_oracle']
    lines += ['',f"Across the same three layouts, default routing covers {d['hard_valid_case_union']}/{d['cases']} bases and {d['acceptable_profile_jobs']}/{d['feasible_profile_jobs']} feasible profile jobs within the frozen bands. Adding the three routing alternatives covers {f['hard_valid_case_union']}/{f['cases']} and {f['acceptable_profile_jobs']}/{f['feasible_profile_jobs']}. This is retrospective choice, not an automatic-policy success rate. The five profiles reuse the frozen score formulas and ±1 defect-index / +10% area / +10% route-length limits.",'',
        'The joint-only witness list names jobs that still need a routing alternative after the strongest default-routing layout among these three is available. Weak-layout improvements alone are not counted as such witnesses. High clearance can also introduce hard route failures; its individual results must accompany its occasional oracle contribution.','',
        '## Directional versus network objectives','',network['estimand'],'',
        '| Engine | Respect direction true: successful / valid | False: successful / valid | New valid with false | Newly invalid with false | Changed >1 px | Balanced delta, both valid |',
        '| --- | ---: | ---: | ---: | ---: | ---: | ---: |']
    for s in network['per_engine']:
        lines.append(f"| {s['engine']} | {s['status_counts_true'].get('ok',0)} / {s['hard_valid_baselines']} | {s['status_counts_false'].get('ok',0)} / {s['hard_valid_candidates']} | {s['valid_gained']} | {s['valid_lost']} | {s['geometry_changed_over_1px']} | {fmt(s['mean_balanced_delta_both_valid'])} |")
    a,b=network['respect_direction_true_pool'],network['true_and_false_pool']
    lines += ['',f"The original direction-respecting pool covers {a['hard_valid_case_union']}/12 cases and {a['acceptable_profile_jobs']}/{a['feasible_profile_jobs']} feasible profile jobs. Allowing both objective settings covers {b['hard_valid_case_union']}/12 and {b['acceptable_profile_jobs']}/{b['feasible_profile_jobs']}. This stratum has four non-edit profiles; stable local editing is inapplicable to cold rebuilds. Eight timeouts remain failures; a later successful alternative is not substituted for them.",'',
        'The source writer does not serialize `respectDirection`. These raw API results therefore support an advanced capability/prototype, not a claim that an existing source-file control or automatic source selector has this behavior. Authored topology and direction semantics remain distinct from whether the placement objective enforces a reading axis.','',
        '## Eleven warm engines on the same native drawing','',warm['estimand'],'',
        '| Warm engine | Hard-valid / 12 | New valid vs retain | Newly invalid | Mean adjusted movement px | Changed-side rate | Unique acceptable profile jobs lost on removal |',
        '| --- | ---: | ---: | ---: | ---: | ---: | ---: |']
    abs={a['removed_engine']:a for a in warm['leave_one_engine_out']}
    for s in warm['per_engine']:
        lines.append(f"| {s['engine']} | {s['hard_valid_candidates']} | {s['valid_gained']} | {s['valid_lost']} | {fmt(s['mean_adjusted_movement_all_completed'])} | {fmt(s['mean_changed_side_rate_all_completed'])} | {abs[s['engine']]['full_pool_acceptable_loss']} |")
    lines += ['',
        'Movement and churn above describe completed outputs, including hard-invalid geometry. Soft profile comparisons require validity. Retaining the current drawing is always available in the portfolio analysis, with zero movement by identity. It is not a fresh engine trial and no source-compile latency is assigned to doing nothing.','',
        '| Warm action budget, plus retain | Selected actions | Hard-valid base union | Acceptable / feasible profile jobs |',
        '| ---: | --- | ---: | ---: |']
    for x in warm['best_action_portfolio_curve'][:6]:
        lines.append(f"| {x['size']} | {', '.join(x['methods']) or 'retain only'} | {x['hard_valid_case_union']} / {x['cases']} | {x['acceptable_profile_jobs']} / {x['feasible_profile_jobs']} |")
    lines += ['',
        'Each row is an exhaustive equal-budget subset search over these eleven measured actions with retained current available. It is an oracle upper bound over 12 cases, not a learned selector. The separate ablation table removes each engine from the full pool, then reoptimizes a three-action budget using only remaining engines. Practical unique witnesses include the best remaining geometry, scores, and trial IDs, so a cold-weak engine is not discarded merely from a cold ranking.','',
        'This native warm screen is unperturbed. The 80/40 px perturbation plus explicit manual marks belongs to the separate warm-control experiment, and the edited topology/protected views belong to E. An inherited pin or author side remains a gate, but a manual flag is not newly made a hard preservation requirement unless `respectManual` is requested. This distinction prevents crediting a permissive pass as a protected edit success.','',
        '## Unsupported scope and unavailable input','',
        f"The original warm-control stage has {failures['original_failures']} unsuccessful trials: {failures['counts'].get('unsupported-cross-parent-scope',0)} explicitly rejected cross-parent selections/neighbourhoods and {failures['counts'].get('input-unavailable',0)} missing fully routed `architecture-04` references. These remain unsuccessful. They are not completed geometry regressions, and missing-input cases are not evidence that the engine rejected a supported job. Valid-sibling and layout-checkpoint supplements are a separately reported stratum, not replacements.",'',
        f"The 50 supplemental trials finish with {targeted['statuses'].get('ok',0)} successes and {targeted['statuses'].get('timed_out',0)} timeouts, with no unsupported-scope exception. Scope constrains what may move; it is not quality-ranked as though whole-diagram movement were the same job.",'',
        '| Supported scope | Executed / 12 | Hard-valid / 12 | Pin/scope violations in completed outputs | Routing hard defects in completed outputs |',
        '| --- | ---: | ---: | ---: | ---: |']
    for s in targeted['per_scope']:
        lines.append(f"| {s['scope']} | {s['statuses'].get('ok',0)} | {s['hard_valid']} | {s['pin_scope_violation_count_completed']} | {s['routing_hard_defect_count_completed']} |")
    lines += ['',targeted['availability'],'',
        '## Timing and replay limits','',
        'The raw records preserve operation components, failures, route-cache status, actual settings, solver iterations, before/after boxes and paths. Cache/order effects prevent intrinsic speed conclusions from these one-off context screens; use the cache-bypassed repeated-timing stage. Any proposed UI dispatch or source serialization remains a product change, not measured behavior of this immutable baseline.','',
        'Replay the analysis with `python evaluation/analyze-contexts.py`. It opens only the explicitly named development datasets and performs metric calculations and archive checks, with no new layout or route calls.','']
    (ROOT/'context-findings.md').write_text('\n'.join(lines))


def main():
    OUT.mkdir(parents=True,exist_ok=True)
    names=['joint-development','network-direction','settings-warm','screen-development','tuning-development','selected-presets-development','warm-targeted']
    stages={};infos=[]
    for name in names:
        stages[name],info=load(name);infos.append(info)
    source=stages['screen-development']+stages['tuning-development']+stages['selected-presets-development']
    # Validate before producing any new result or proposal. Include references used
    # only for direct-current comparisons and raw network/checkpoint diagnostics.
    source_index={(r['caseId'],P.method_key(r['_task'])):r for r in source}
    source_by_id={r['id']:r for r in source}
    primary=stages['joint-development']+stages['network-direction']+[r for r in stages['settings-warm'] if r['_task'].get('tag')=='warm-repair']+stages['warm-targeted']
    used={r['id']:r for r in primary if r['status']=='ok'}
    for r in primary:
        task=r['_task']
        if task.get('reference'):
            refid=pathlib.Path(task['reference']).name.removesuffix('.json.gz')
            ref=source_by_id.get(refid)
            if ref and ref['status']=='ok':used[refid]=ref
        if task.get('stage')=='D-joint':
            for method in [task['tag']['layoutMethod'],'current']:
                ref=source_index[r['caseId'],method]
                if ref['status']=='ok':used[ref['id']]=ref
    check=subprocess.run(['node',str(ROOT/'evaluation/verify-control-archives.mjs')],input=json.dumps(list(used.values())),text=True,capture_output=True,check=True)
    verification=json.loads(check.stdout)
    if verification['mismatches']:raise ValueError('Archive differs from canonical successful row; no new analysis outputs written')
    save('control-context-archive-verification',verification)
    joint,jpool=joint_analysis(stages['joint-development'],source)
    network,npool=network_analysis(stages['network-direction'])
    warm,wpool=warm_analysis(stages['settings-warm'],source)
    failures=failure_partition(stages['settings-warm'])
    targeted=targeted_scope_analysis(stages['warm-targeted'])
    report(joint,network,warm,failures,targeted)
    save('control-context-manifest',{'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'inputs':infos,
        'analyzer_sha256':C.digest(pathlib.Path(__file__)),'profile_analyzer_sha256':C.digest(ROOT/'evaluation/analyze-portfolio.py'),
        'control_analyzer_sha256':C.digest(ROOT/'evaluation/analyze-controls.py'),
        'heldout_access':False,'geometry_or_routing_calls':0,'verified_canonical_geometries':verification['verified'],
        'warm_pass_trial_count':warm['trials'],'joint_trial_count':joint['joint_trials'],'network_trial_count':network['trials']})
    print(json.dumps({'joint':joint['all_three_layouts_four_routes_oracle'],'network':network['true_and_false_pool'],
                      'warm':warm['best_action_portfolio_curve'][:4],'archive_checks':verification['verified']},indent=2))


if __name__=='__main__': main()
