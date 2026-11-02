import pathlib,json,hashlib,collections,math,statistics,gzip,copy,subprocess,datetime,numpy as np
root=pathlib.Path('/workspace/scratch/8279601ec156/deliverables');out=root/'data/analysis';errors=[];checks=collections.Counter();read_files=set()
def read(rel):
 read_files.add(rel);return json.loads((root/rel).read_text())
def sha(rel):return hashlib.sha256((root/rel).read_bytes()).hexdigest()
def eq(label,a,b,tol=1e-8):
 checks[label.split(':',1)[0]]+=1
 same=a==b
 if isinstance(a,(int,float)) and isinstance(b,(int,float)):same=(a==b or (math.isfinite(a) and math.isfinite(b) and abs(a-b)<=tol))
 if not same:errors.append({'check':label,'observed':a,'expected':b})
def load(stem):
 tasks={t['id']:t for t in read('evaluation/tasks/'+stem+'.json')};rows={};attempts=0
 rel='data/'+stem+'.jsonl';read_files.add(rel)
 for line in (root/rel).read_text().splitlines():
  if not line.strip():continue
  r=json.loads(line);attempts+=1
  assert r['split']=='heldout' and r['id'] in tasks and r['status'] in ['ok','failed','timed_out']
  rows.setdefault(r['id'],dict(tasks[r['id']],**{k:v for k,v in r.items() if k not in tasks[r['id']]}))
  # Raw fields override task metadata, as in the recorded canonical trial reader.
  if rows[r['id']].get('_canonical_seen') is not True:rows[r['id']]={**tasks[r['id']],**r,'_task':tasks[r['id']],'_canonical_seen':True}
 eq('stage-coverage:'+stem,len(rows),len(tasks))
 return list(rows.values()),{'rows':len(rows),'attempts':attempts,'statuses':dict(collections.Counter(r['status'] for r in rows.values()))}
freeze=read('data/policy-freeze.json');corpus=read('corpus/manifest.json');cases={c['id']:c for c in corpus['cases'] if c['split']=='heldout'};manifest=read('data/analysis/heldout-routing-analysis-manifest.json');decision=read('data/analysis/heldout-routing-decision.json')
stages={};stageinfo={}
for stem in ['screen-heldout','documented-default-heldout','selected-presets-heldout','routing-current-heldout','joint-heldout']:
 stages[stem],stageinfo[stem]=load(stem)
 stored=next(s for s in manifest['stages'] if s['stem']==stem)
 eq('stage-hash:'+stem,sha('data/'+stem+'.jsonl'),stored['result_sha256']);eq('task-hash:'+stem,sha('evaluation/tasks/'+stem+'.json'),stored['task_sha256'])
 eq('stage-status:'+stem,stageinfo[stem]['statuses'],stored['status_counts'])
eq('analyzer-hash:unchanged',sha('evaluation/analyze-heldout-routing.py'),'43604a9f7303711084a38b96f47072d2e268fc4606934de07bc2a7aea74b0a4f');eq('freeze-hash:manifest',sha('data/policy-freeze.json'),manifest['policyFreezeSha256'])
source={r['id']:r for stem in ['screen-heldout','documented-default-heldout','selected-presets-heldout'] for r in stages[stem]};current={r['caseId']:r for r in stages['screen-heldout'] if r['_task'].get('tag')=='current'}
valid=lambda r:r['status']=='ok' and r.get('metrics',{}).get('hardValid') is True and not r.get('metrics',{}).get('requiredIntentFailures',0) and not r.get('intent',{}).get('failures')
artifacts={}
def artifact(rel):
 if rel not in artifacts:
  read_files.add(rel);artifacts[rel]=json.loads(gzip.decompress((root/rel).read_bytes()))
 return artifacts[rel]
route_rows=stages['routing-current-heldout']+stages['joint-heldout'];savedchecks={r['trial_id']:r for r in read('data/analysis/heldout-routing-reference-checks.json')};savedruntime={r['trial_id']:r for r in read('data/analysis/heldout-routing-runtime.json')};refstats=collections.Counter();used={};references={};timing={};routing_defaults={r['policy_id']:r['routing'] for r in freeze['routingProposal']['policies']}
for r in route_rows:
 t=r['_task'];refid=pathlib.Path(t['reference']).name.removesuffix('.json.gz');base=source[refid];references[r['id']]=base;partial=base['status']!='ok';refstats['trials']+=1;refstats['partial_reference_trials']+=partial
 rel=t['reference'].replace('data/geometry/','data/layout-checkpoints/') if partial else base['geometry'];a=artifact(rel)
 if partial:eq('checkpoint-phase:'+r['id'],a.get('phase'),'layout-complete-routing-pending')
 compilems=a.get('compileMs') if partial else base.get('timing',{}).get('compileMs');worker=r.get('timing',{}).get('workerMs')
 if worker is None and r['status']=='timed_out':worker=r.get('trialBudgetMs',t.get('timeoutMs'))
 serial=compilems+worker if isinstance(compilems,(int,float)) and isinstance(worker,(int,float)) else None;timing[r['id']]=serial
 eq('serial-time:'+r['id'],savedruntime[r['id']]['derived_serial_compile_plus_route_worker_ms'],serial)
 eq('serial-validity:'+r['id'],savedruntime[r['id']]['hard_valid'],valid(r))
 eq('reference-partial:'+r['id'],savedchecks[r['id']]['reference']['partial'],partial)
 eq('reference-status:'+r['id'],savedchecks[r['id']]['reference']['canonical_status'],base['status'])
 eq('reference-default-validity:'+r['id'],savedchecks[r['id']]['reference']['canonical_hard_valid'],valid(base))
 refstats['specialist_fallback_trials']+=bool(t['tag'].get('specialistFallback'))
 if r['status']=='ok':
  b=artifact(r['geometry']);da=copy.deepcopy(a['doc']);db=copy.deepcopy(b['doc']);da.get('settings',{}).pop('routing',None);db.get('settings',{}).pop('routing',None)
  eq('document-preservation:'+r['id'],db,da);refstats['successful_document_checks']+=db==da
  eq('raw-partial-marker:'+r['id'],bool(r.get('referencePartial')),partial)
  eq('frozen-routing-settings:'+r['id'],r['routingSettings'],routing_defaults[t['tag']['routingPolicy']])
  used[r['id']]=r
  if partial:refstats['successful_partial_references']+=1
 if partial and valid(r):refstats['valid_checkpoint_reroutes']+=1
 if base['status']=='ok':used[base['id']]=base
for r in current.values():
 if r['status']=='ok':used[r['id']]=r
refstats['missing_input_artifacts']=0
for key in ['trials','successful_document_checks','partial_reference_trials','missing_input_artifacts','specialist_fallback_trials']:eq('reference-count:'+key,dict(refstats)[key],manifest['reference_checks'][key])
verify=subprocess.run(['node',str(root/'evaluation/verify-control-archives.mjs')],input=json.dumps([{'id':r['id'],'geometry':r['geometry'],'geometryHash':r['geometryHash']} for r in used.values()]),text=True,capture_output=True,check=True)
verification=json.loads(verify.stdout);eq('archive-verified:count',verification['verified'],318);eq('archive-verified:mismatches',verification['mismatches'],[])
profiles=['readable','compact','traceable','stable','specialist'];axes=['profile:'+p for p in profiles]+['route:'+p for p in ['balanced','traceable','direct']];aspects={'wide':2.0,'slide':1.78,'square':1.0,'page':.77,'tall':.6,'free':1.6}
def score(r,axis,minarea,target):
 if not valid(r):return math.inf
 m=r['metrics'];w=m['weightingScores'];bal=float(w.get('balanced',m.get('diPer10',math.inf)));direct=float(w.get('direct',bal));trace=float(w.get('traceable',bal));aspect=max(1e-12,float(m.get('aspect',1)));ae=abs(math.log(aspect/max(1e-12,target)))
 if axis.startswith('route:'):return w[axis.split(':')[1]]
 p=axis.split(':')[1]
 if p=='readable':return direct+2*ae
 if p=='compact':return bal+8*math.log(max(1,float(m.get('area',1)))/max(1,minarea))+2*ae
 if p=='traceable':return trace
 return bal
routes=list(routing_defaults);global_id=freeze['jointProposal']['fixed_global_choice']['joint_id'];triple=[r['joint_id'] for r in freeze['jointProposal']['three_combination_portfolio']];jointids=[r['joint_id'] for r in freeze['jointProposal']['nine_combination_pool']];layouts=list(dict.fromkeys(r['layout_method'] for r in freeze['jointProposal']['nine_combination_pool']))
strategies={'current':{'current-default':['current-default'],**{x:[x] for x in routes},'frozen-three-route-union':routes,'retain-current-plus-three':['current-default']+routes},'joint':{'frozen-joint-global':[global_id],'frozen-joint-triple':triple,'default-three-layouts':[x+'|routing:default' for x in layouts],'all-nine-joint':jointids,'all-twelve-scoped-pool':[x+'|routing:default' for x in layouts]+jointids}}
allgenerated={};common_vectors={};summary_counts=0;record_count=0
for context,stem in [('current','routing-current-heldout'),('joint','joint-heldout')]:
 bycase=collections.defaultdict(dict)
 if context=='current':
  for cid,r in current.items():bycase[cid]['current-default']=r
 for r in stages[stem]:
  t=r['_task'];method=t['tag']['routingPolicy'] if context=='current' else t['policy'];assert method not in bycase[r['caseId']];bycase[r['caseId']][method]=r
  if context=='joint':bycase[r['caseId']][t['tag']['layoutMethod']+'|routing:default']=references[r['id']]
 generated=[]
 for cid,pool in sorted(bycase.items()):
  minarea=min((r['metrics']['area'] for r in pool.values() if valid(r)),default=1);target=aspects.get(cases[cid].get('job',{}).get('targetFormat','free'),1.6)
  for axis in axes:
   scores={m:score(r,axis,minarea,target) for m,r in pool.items()};eligible=[m for m,r in pool.items() if valid(r)];oracle=min(eligible,key=lambda m:(scores[m],pool[m]['id'])) if eligible else None
   accepted=set()
   if oracle:
    o=pool[oracle]['metrics']
    for m,r in pool.items():
     if valid(r) and math.isfinite(scores[m]) and scores[m]<=scores[oracle]+1+1e-8 and r['metrics']['area']<=o['area']*1.1+1e-6 and r['metrics']['routeLength']<=o['routeLength']*1.1+1e-6:accepted.add(m)
   for policy,methods in strategies[context].items():
    avail=[m for m in methods if m in pool];good=[m for m in avail if valid(pool[m])];chosen=min(good,key=lambda m:(scores[m],pool[m]['id'])) if good else None
    row={'policy':policy,'case_id':cid,'family':cases[cid]['family'],'common':cases[cid]['common'],'axis':axis,'oracle_feasible':oracle is not None,'any_execution_success':any(pool[m]['status']=='ok' for m in avail),'hard_valid':bool(good),'acceptable':bool(accepted.intersection(avail)),'current_source_valid':valid(current[cid]),'current_valid_hard_loss':valid(current[cid]) and not good,'current_invalid_valid_gain':not valid(current[cid]) and bool(good),'oracle_method':oracle,'oracle_trial':pool[oracle]['id'] if oracle else None,'oracle_score':scores[oracle] if oracle else None,'best_valid_method_by_score':chosen,'best_valid_trial_by_score':pool[chosen]['id'] if chosen else None,'best_valid_score':scores[chosen] if chosen else None,'finite_score_regret':scores[chosen]-scores[oracle] if chosen and oracle else None,'acceptable_methods':sorted(accepted.intersection(avail))}
    # bool: avoid a Python empty-list result in the independent expression.
    row['current_valid_hard_loss']=bool(row['current_valid_hard_loss']);generated.append(row)
 stored={ (r['policy'],r['case_id'],r['axis']):r for r in read('data/analysis/'+stem+'-policy-records.json')}
 eq('policy-record-count:'+context,len(generated),len(stored));record_count+=len(generated)
 for r in generated:
  s=stored[r['policy'],r['case_id'],r['axis']]
  for k,v in r.items():eq('policy-record-field:'+context+':'+str((r['policy'],r['case_id'],r['axis'],k)),s[k],v)
 savedsummary=read('data/analysis/'+stem+'-policy-summary.json')
 for s in savedsummary:
  rr=[r for r in generated if r['policy']==s['policy'] and (s['subset']=='all' or (r['common'] if s['subset']=='common' else not r['common'])) and (r['axis'].startswith('profile:') if s['axis']=='five_profiles_pooled' else r['axis'].startswith('route:') if s['axis']=='three_route_weights_pooled' else r['axis']==s['axis'])]
  expect={'bases':len({r['case_id'] for r in rr}),'families':len({r['family'] for r in rr}),'total_jobs':len(rr),'oracle_feasible_jobs':sum(r['oracle_feasible'] for r in rr),'acceptable_jobs':sum(r['acceptable'] for r in rr),'hard_valid_jobs':sum(r['hard_valid'] for r in rr),'current_valid_hard_loss_jobs':sum(r['current_valid_hard_loss'] for r in rr),'current_valid_hard_loss_bases':len({r['case_id'] for r in rr if r['current_valid_hard_loss']}),'current_invalid_valid_gain_bases':len({r['case_id'] for r in rr if r['current_invalid_valid_gain']})}
  for k,v in expect.items():eq('summary-count:'+context+':'+str((s['policy'],s['subset'],s['axis'],k)),s[k],v)
  summary_counts+=1
 common_vectors[context]={policy:{axis:sum(r['acceptable'] for r in generated if r['policy']==policy and r['common'] and r['axis']==axis) for axis in axes} for policy in strategies[context]};allgenerated[context]=generated
# Reproduce all direct validity/count tables from canonical candidate/baseline metrics.
pair_summary_checks=0;direct_losses={}
for category,stem,rows in [('current','routing-current-heldout',stages['routing-current-heldout']),('joint','joint-heldout',stages['joint-heldout']),('global','joint-global-heldout',[r for r in stages['joint-heldout'] if r['_task']['policy']==global_id])]:
 for s in read('data/analysis/'+stem+'-pair-summary.json'):
  rr=[r for r in rows if (r['_task']['tag']['routingPolicy'] if category=='current' else r['_task']['policy'])==s['policy'] and (s['subset']=='all' or (cases[r['caseId']]['common'] if s['subset']=='common' else not cases[r['caseId']]['common']))]
  pp=[(r,current[r['caseId']] if category=='global' else references[r['id']]) for r in rr]
  expected={'pairs':len(pp),'completed_candidates':sum(r['status']=='ok' for r,b in pp),'valid_candidates':sum(valid(r) for r,b in pp),'completed_baselines':sum(b['status']=='ok' for r,b in pp),'valid_baselines':sum(valid(b) for r,b in pp),'new_valid':sum(valid(r) and not valid(b) for r,b in pp),'new_invalid':sum(not valid(r) and valid(b) for r,b in pp),'partial_references':sum(references[r['id']]['status']!='ok' for r,b in pp)}
  for k,v in expected.items():eq('direct-pair-count:'+category+':'+str((s['policy'],s['subset'],k)),s[k],v)
  eq('hard-loss-witnesses:'+category+str((s['policy'],s['subset'])),sorted(s['hard_loss_witnesses']),sorted(r['id'] for r,b in pp if not valid(r) and valid(b)))
  if category=='current' and s['subset']=='all':direct_losses[s['policy']]={'new_invalid':expected['new_invalid'],'new_valid':expected['new_valid'],'hard_loss_ids':[r['id'] for r,b in pp if not valid(r) and valid(b)]}
  pair_summary_checks+=1
# Check the reporting decision against independently reconstructed common vectors.
for context,key in [('current','currentPositionPolicies'),('joint','jointPolicies')]:
 for s in decision[key]:
  vec=common_vectors[context][s['policy']]
  for axis,count in vec.items():
   field='fiveProfileAcceptedCounts' if axis.startswith('profile:') else 'threeRouteWeightAcceptedCounts';eq('decision-count:'+context+':'+s['policy']+':'+axis,s[field][axis.split(':')[1]],count)
  eq('decision-gate:'+context+':'+s['policy'],s['scopedRelative95EveryProfilePass'],all(vec['profile:'+p]/12>=.95 for p in profiles))
serial={'trials':len(route_rows),'knownDerivedCosts':sum(x is not None for x in timing.values()),'hardValidRoutes':sum(valid(r) for r in route_rows),'hardValidExceeding15000ms':sum(valid(r) and timing[r['id']]>15000 for r in route_rows if timing[r['id']] is not None),'unknownCosts':sum(x is None for x in timing.values())}
eq('serial-decision:all',decision['serialSensitivity'],serial)
# Representative uncertainty arithmetic, independently rebuilding whole-base/family cluster counts.
ci_checks=0
for context,policy,axis in [('current','clearance-22','profile:traceable'),('current','frozen-three-route-union','five_profiles_pooled'),('joint','frozen-joint-triple','profile:traceable'),('joint','all-nine-joint','five_profiles_pooled')]:
 stem='routing-current-heldout' if context=='current' else 'joint-heldout';s=next(x for x in read('data/analysis/'+stem+'-policy-summary.json') if x['policy']==policy and x['subset']=='common' and x['axis']==axis);rr=[r for r in allgenerated[context] if r['policy']==policy and r['common'] and (r['axis'].startswith('profile:') if axis=='five_profiles_pooled' else r['axis']==axis)]
 bc=collections.defaultdict(list)
 for r in rr:bc[r['case_id']].append(r)
 ids=sorted(bc);families=[cases[c]['family'] for c in ids];fs=list(dict.fromkeys(families))
 for field,num,den in [('absolute_coverage_uncertainty',lambda r:r['acceptable'],lambda r:1),('feasible_coverage_uncertainty',lambda r:r['acceptable'],lambda r:r['oracle_feasible']),('current_valid_hard_loss_rate_uncertainty',lambda r:r['current_valid_hard_loss'],lambda r:r['current_source_valid'])]:
  nums=np.array([sum(num(r) for r in bc[c]) for c in ids],dtype=float);dens=np.array([sum(den(r) for r in bc[c]) for c in ids],dtype=float)
  eq('uncertainty-point:'+policy+axis+field,s[field]['point'],float(nums.sum()/dens.sum()) if dens.sum() else None)
  for unit in ['base','family']:
   rng=np.random.default_rng(20261102);k=len(ids) if unit=='base' else len(fs);draw=rng.integers(0,k,size=(2000,k));weights=np.array([np.bincount(d,minlength=k) for d in draw]);weights=weights if unit=='base' else weights[:,[fs.index(f) for f in families]]
   d=weights@dens;n=weights@nums;v=n[d>0]/d[d>0];expected={'low95':float(np.quantile(v,.025)) if len(v) else None,'high95':float(np.quantile(v,.975)) if len(v) else None,'replicates':2000,'nonempty_draws':len(v)}
   for key,value in expected.items():eq('uncertainty-field:'+policy+axis+field+unit+key,s[field][unit+'_bootstrap'][key],value);ci_checks+=1
report={'schema':'draftably-heldout-routing-independent-review-1.0','reviewed_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'status':'PASS' if not errors else 'DISCREPANCIES_FOUND','authorized':'Controller all-ready and completed routing/joint outcome review authorized by parent','frozen_rules_or_policy_changed':False,'geometry_layout_or_routing_algorithm_calls':0,'scope':'Independent arithmetic from canonical raw source/current-routing/joint JSONL. Exact document equality and geometry-signature serialization only; no new geometry generation.','analyzer_sha256':sha('evaluation/analyze-heldout-routing.py'),'policy_freeze_sha256':sha('data/policy-freeze.json'),'stage_accounting':stageinfo,'checks_by_category':dict(checks),'discrepancies':errors,'policy_records_independently_reconstructed':record_count,'policy_summary_rows_checked':summary_counts,'direct_pair_summary_rows_checked':pair_summary_checks,'representative_uncertainty_fields_checked':ci_checks,'reference_integrity':dict(refstats),'archive_signature_verification':verification,'serial_timing':serial,'common_profile_order':profiles,'common_absolute_denominator':14,'common_feasible_denominator':12,'independent_common_counts':common_vectors,'current_position_direct_losses':direct_losses,'decision_interpretation':{'route_triple_scoped_relative_pass':True,'route_triple_absolute_pass':False,'joint_global_every_profile_pass':False,'joint_triple_pooled':{'accepted':57,'feasible':60,'fraction':.95,'every_profile_pass':False},'all_nine_joint_pooled':{'accepted':59,'feasible':60,'fraction':59/60,'every_profile_pass':False},'default_decision_consistent':'Keep existing first-render source/routing defaults. Compare alternatives remain an oracle upper bound; clearance22 has observed hard-validity regressions.','source_checkpoint_accounting':'Canonical source failures remain invalid source/default-route entries. Successful reroutes from completed-layout checkpoints are narrow route-only outcomes and do not promote those source trials.','timing_limit':'All 205 geometrically valid reroutes have known derived serial costs <=15000 ms; this does not establish fresh cold-render latency or an automatic default.'},'read_files':sorted(read_files),'reviewed_file_sha256':{}}
for rel in ['evaluation/analyze-heldout-routing.py','data/policy-freeze.json','data/analysis/heldout-routing-analysis-manifest.json','data/analysis/heldout-routing-decision.json','data/analysis/routing-current-heldout-policy-summary.json','data/analysis/joint-heldout-policy-summary.json','data/analysis/heldout-routing-runtime.json','data/analysis/heldout-routing-reference-checks.json']:
 report['reviewed_file_sha256'][rel]=sha(rel)
(out/'heldout-routing-review.json').write_text(json.dumps(report,indent=2,allow_nan=False)+'\n')
print(json.dumps({k:report[k] for k in ['status','policy_records_independently_reconstructed','policy_summary_rows_checked','direct_pair_summary_rows_checked','representative_uncertainty_fields_checked','reference_integrity','serial_timing','discrepancies']},indent=2))
print('common_counts',json.dumps(common_vectors,indent=2))
