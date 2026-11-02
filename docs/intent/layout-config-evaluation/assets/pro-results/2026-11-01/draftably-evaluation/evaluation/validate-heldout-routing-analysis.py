#!/usr/bin/env python3
"""Analytical counterexamples for the new analyzer; opens no heldout outcomes."""
import importlib.util,json,pathlib
ROOT=pathlib.Path(__file__).resolve().parents[1]
def module(name,file):
    spec=importlib.util.spec_from_file_location(name,ROOT/'evaluation'/file);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);return m
H=module('heldout_route_validation','analyze-heldout-routing.py')
P=module('heldout_route_validation_scores','analyze-portfolio.py')
checks=[]
def check(name,predicate):
    if not predicate:raise AssertionError(name)
    checks.append(name)
cases={cid:{'id':cid,'family':fam,'common':common,'job':{'targetFormat':'free'}} for cid,fam,common in [('a','family-one',True),('b','family-two',True),('c','family-two',False)]}
def row(cid,method,score,status='ok',hard=True,budget=None):
    return {'id':cid+'-'+method,'caseId':cid,'family':cases[cid]['family'],'method':method,'status':status,
        '_serial_budget_eligible':budget,'metrics':{'hardValid':hard,'requiredIntentFailures':0,'area':100,'routeLength':100,'aspect':1.6,
        'weightingScores':{'balanced':score,'traceable':score,'direct':score},
        'edit':{'translationAdjustedMean':2400,'changedSideRate':1}},'intent':{'failures':[]}}
base=[row('a','default',10,budget=True),row('b','default',0,status='timed_out',hard=False),row('c','default',0,status='timed_out',hard=False)]
candidate=[row('a','candidate',0,hard=False,budget=True),row('b','candidate',1,budget=None),row('c','candidate',0,hard=False)]
_,jobs=H.build_jobs(base+candidate,cases,P)
check('three bases each retain all eight correlated profile/weighting jobs',len(jobs)==24)
aj=[j for j in jobs if j['case_id']=='a'];bj=[j for j in jobs if j['case_id']=='b'];cj=[j for j in jobs if j['case_id']=='c']
check('hard-invalid zero-score drawing never becomes oracle',all(j['oracle_method']=='default' for j in aj))
check('failed default is not substituted for a completed candidate',all(j['oracle_method']=='candidate' for j in bj))
check('fully infeasible base remains explicitly infeasible',all(j['oracle_method'] is None for j in cj))
check('static stable preference ignores incidental reference displacement and churn',next(j for j in bj if j['axis']=='profile:stable')['scores']['candidate']==1)
current={r['caseId']:r for r in base}
records=H.evaluate_policy('fixed',['candidate'],jobs,current,cases,'analytical fixture')
summary=H.summarize_policy_records(records)
s=next(s for s in summary if s['subset']=='all' and s['axis']=='profile:readable')
check('absolute denominator retains the infeasible base',s['total_jobs']==3 and s['acceptable_jobs']==1)
check('feasible denominator is reported separately',s['oracle_feasible_jobs']==2 and s['relative_to_scoped_feasible_pool_fraction']==.5)
check('current-valid hard loss survives a lower candidate score',s['current_valid_hard_loss_bases']==1)
check('missing compile budget remains unknown rather than zero-time',s['serial_budget_unknown_valid_jobs']==1 and s['serial_budget_unknown_acceptable_jobs']==1)
check('unknown budget does not count as known eligible',s['serial_budget_acceptable_sensitivity_jobs']==0)
u=s['feasible_coverage_uncertainty']
check('resampling units are three bases and two families',u['base_clusters']==3 and u['family_clusters']==2)
check('both cluster schemes produce two thousand draws',u['base_bootstrap']['replicates']==2000 and u['family_bootstrap']['replicates']==2000)
fam=H.summarize_policy_records([r for r in records if r['family']=='family-one'],False)
check('a family with no niche bases produces no empty-subset row',not any(x['subset']=='niche' for x in fam))
result={'type':'Analytical counterexamples, not experiment outcomes','assertions_passed':len(checks),'assertions_failed':0,
    'checks':checks,'heldout_outcomes_opened':False,'geometry_algorithm_calls':0,'policy_choices_fitted':0,
    'analyzer_sha256':H.sha(ROOT/'evaluation/analyze-heldout-routing.py'),'frozen_scorer_sha256':H.sha(ROOT/'evaluation/analyze-portfolio.py')}
(ROOT/'data/analysis/heldout-routing-analytical-validation.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result,indent=2))
