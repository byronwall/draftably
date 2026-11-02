import importlib.util,pathlib,json,sys,collections,hashlib
root=pathlib.Path('deliverables').resolve();opened=[]
def audit(event,args):
 if event=='open' and args and isinstance(args[0],str):
  path=args[0]
  if path.endswith('.jsonl'):raise RuntimeError('Outcome read prohibited in pre-outcome validation: '+path)
  if '/deliverables/' in path:opened.append(path)
sys.addaudithook(audit)
def load(name,filename):
 s=importlib.util.spec_from_file_location(name,root/'evaluation'/filename);m=importlib.util.module_from_spec(s);s.loader.exec_module(m);return m
H=load('independent_preoutcome_h','analyze-heldout-routing.py');P=load('independent_preoutcome_p','analyze-portfolio.py')
freeze,cases,routes,joints,global_id,triple,layouts,tasks=H.validate_design();checks=[]
def check(label,value):
 if not value:raise AssertionError(label)
 checks.append(label)
check('all planned tasks pass frozen design validation',len(tasks)==288)
record=H.design_record(freeze,routes,joints,global_id,triple);existing=json.loads((root/'data/analysis/heldout-routing-analysis-design.json').read_text());check('saved pre-outcome interpretation matches current code',dict((k,v) for k,v in record.items() if k!='createdAt')==dict((k,v) for k,v in existing.items() if k!='createdAt'))
source={t['id']:t for stem in ['screen-heldout','documented-default-heldout','selected-presets-heldout'] for t in json.loads((root/'evaluation/tasks'/f'{stem}.json').read_text())}
for task in tasks.values():
 ref=pathlib.Path(task['reference']).name.removesuffix('.json.gz');t=source[ref]
 assert t['caseId']==task['caseId']
 expected='current' if task['stage']=='H-routing-current' or task['tag'].get('specialistFallback') else task['tag']['layoutMethod']
 assert P.method_key(t)==expected,(task['id'],expected,P.method_key(t))
check('all 288 planned references match the same case and declared effective method',True)
cs={cid:{'id':cid,'family':fam,'common':common,'job':{'targetFormat':'free'}} for cid,fam,common in [('a','one',True),('b','two',True),('c','two',False)]}
def row(cid,method,score,status='ok',hard=True,budget=None):return {'id':cid+'-'+method,'caseId':cid,'family':cs[cid]['family'],'method':method,'status':status,'_serial_budget_eligible':budget,'metrics':{'hardValid':hard,'requiredIntentFailures':0,'area':100,'routeLength':100,'aspect':1.6,'weightingScores':dict.fromkeys(['balanced','traceable','direct'],score),'edit':{'translationAdjustedMean':2400,'changedSideRate':1}},'intent':{'failures':[]}}
base=[row('a','default',10,budget=True),row('b','default',0,status='timed_out',hard=False),row('c','default',0,status='timed_out',hard=False)];cand=[row('a','candidate',0,hard=False,budget=True),row('b','candidate',1,budget=None),row('c','candidate',0,hard=False)]
_,jobs=H.build_jobs(base+cand,cs,P);check('three bases retain 24 profile-weighting jobs',len(jobs)==24)
check('invalid zero scores never win or receive acceptance',all(j['oracle_method']=='default' and 'candidate' not in j['acceptable'] for j in jobs if j['case_id']=='a'))
check('infeasible base remains represented',all(j['oracle_method'] is None for j in jobs if j['case_id']=='c'))
check('static stable strips edit penalties without changing raw rows',next(j for j in jobs if j['case_id']=='b' and j['axis']=='profile:stable')['scores']['candidate']==1 and cand[1]['metrics']['edit']['translationAdjustedMean']==2400)
r=H.evaluate_policy('fixed',['candidate'],jobs,{x['caseId']:x for x in base},cs,'synthetic');summ=H.summarize_policy_records(r);s=next(s for s in summ if s['subset']=='all' and s['axis']=='profile:readable')
check('total and feasible denominators remain separate',s['total_jobs']==3 and s['oracle_feasible_jobs']==2 and s['acceptable_jobs']==1)
check('hard losses survive soft improvement',s['current_valid_hard_loss_bases']==1)
check('unknown serial budget is not credited as eligible',s['serial_budget_unknown_acceptable_jobs']==1 and s['serial_budget_acceptable_sensitivity_jobs']==0)
u=s['feasible_coverage_uncertainty'];check('2000 base and family bootstrap draws',u['base_bootstrap']['replicates']==2000 and u['family_bootstrap']['replicates']==2000 and u['base_clusters']==3 and u['family_clusters']==2)
check('family subset does not produce empty niche rows',not any(s['subset']=='niche' for s in H.summarize_policy_records([x for x in r if x['family']=='one'],False)))
check('design-only reads never include outcome JSONL files',not any(x.endswith('.jsonl') for x in opened))
print(json.dumps({'assertions_passed':len(checks),'checks':checks,'planned_reference_checks':288,'outcome_jsonl_reads':0,'geometry_algorithm_calls':0,'analyzer_sha256':H.sha(root/'evaluation/analyze-heldout-routing.py'),'files_opened':sorted(set(opened))},indent=2))
