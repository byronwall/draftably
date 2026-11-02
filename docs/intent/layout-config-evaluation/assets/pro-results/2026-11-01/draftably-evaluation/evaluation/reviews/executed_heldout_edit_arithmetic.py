import json,pathlib,collections,statistics,random,math
root=pathlib.Path('deliverables');p=root/'data/analysis';rs=json.loads((p/'edits-heldout-records.json').read_text());spec=json.loads((root/'evaluation/edit-analysis-spec.json').read_text())
rawstages={}
for stage in ['edits-current-heldout','edits-states-heldout','edits-warm-heldout','edits-policies-heldout']:
 rows=[json.loads(l) for l in (root/'data'/f'{stage}.jsonl').read_text().splitlines() if l.strip()];first={}
 for r in rows:first.setdefault(r['id'],r)
 rawstages[stage]=first
 print('stage',stage,'rows',len(rows),'unique',len(first),'statuses',dict(collections.Counter(r['status'] for r in first.values())))
raw={k:v for stage,rr in rawstages.items() if stage!='edits-states-heldout' for k,v in rr.items()};cur={(r['caseId'],r['editId']):r for r in rawstages['edits-current-heldout'].values()}
valid=lambda r:r['status']=='ok' and r.get('metrics',{}).get('hardValid',False) and not r.get('metrics',{}).get('requiredIntentFailures',0)
errors=[]
for r in rs:
 rawrow=raw[r['raw_trial_id']];c=cur[r['case_id'],r['edit_id']];g=r['variant']=='guarded' and not valid(rawrow) and valid(c);e=c if g else rawrow
 if r['guard_applied']!=g or r['effective_trial_id']!=e['id'] or r['hard_valid']!=valid(e):errors.append(('guard_effective',r['record_id']))
 if r['operation_or_serial_guard_ms']!=(r['raw_operation_ms']+r['fallback_operation_ms']):errors.append(('time',r['record_id']))
 if r['hard_valid']:
  expected=r['score_balanced'] if r['requested_global_reflow'] else r['score_balanced']+r['translationAdjustedMean']/24+5*r['changedSideRate']
  if abs(expected-r['stable_score'])>1e-10:errors.append(('stable',r['record_id']))
 elif r['stable_score'] is not None:errors.append(('invalid_stable',r['record_id']))
print('record_errors',errors)
metrics=('hard_valid','operation_or_serial_guard_ms','score_balanced','stable_score','meanDisplacement','translationAdjustedMean','distantMean','translationAdjustedDistantMean','orderFlipRate','changedSideRate','changedRouteRate')
def q(v,q):
 v=sorted(v);x=(len(v)-1)*q;lo=math.floor(x);hi=math.ceil(x);return v[lo]+(v[hi]-v[lo])*(x-lo)
def audit(records,stored):
 lookup={(r['stratum'],r['policy'],r['variant'],r['case_id'],r['edit_id']):r for r in records};checks=0;errors=[]
 for s in stored:
  group=(s['stratum'],s['policy'],s['variant']);pairs=[(r,lookup[s['stratum'],s['baseline_policy'],'raw',r['case_id'],r['edit_id']]) for r in records if (r['stratum'],r['policy'],r['variant'])==group]
  vals={'paired_jobs':len(pairs),'new_hard_invalid_jobs':sum(not r['hard_valid'] and b['hard_valid'] for r,b in pairs),'rescued_valid_jobs':sum(r['hard_valid'] and not b['hard_valid'] for r,b in pairs),'both_invalid_jobs':sum(not r['hard_valid'] and not b['hard_valid'] for r,b in pairs),'paired_ordinary_jobs':sum(not r['color_negative_control'] for r,b in pairs),'ordinary_new_hard_invalid_jobs':sum(not r['color_negative_control'] and not r['hard_valid'] and b['hard_valid'] for r,b in pairs),'ordinary_rescued_valid_jobs':sum(not r['color_negative_control'] and r['hard_valid'] and not b['hard_valid'] for r,b in pairs)}
  for k,v in vals.items():
   checks+=1
   if s[k]!=v:errors.append((group,k,s[k],v))
  for m in metrics:
   bybase=collections.defaultdict(list)
   for r,b in pairs:
    if m not in ('hard_valid','operation_or_serial_guard_ms'):
     if r['color_negative_control'] or not (r['hard_valid'] and b['hard_valid']):continue
     if m not in ('score_balanced','stable_score') and r['requested_global_reflow']:continue
    if r.get(m) is None or b.get(m) is None:continue
    bybase[r['case_id']].append(float(r[m])-float(b[m]))
   means=[statistics.mean(bybase[k]) for k in sorted(bybase)];rng=random.Random(spec['bootstrap']['seed']);bs=[statistics.mean(rng.choices(means,k=len(means))) for _ in range(2000)] if means else []
   vals={'paired_jobs_available':sum(map(len,bybase.values())),'base_clusters_available':len(means),'mean_paired_base_delta':statistics.mean(means) if means else None,'bootstrap_low_95':q(bs,.025) if bs else None,'bootstrap_high_95':q(bs,.975) if bs else None}
   for k,v in vals.items():
    checks+=1;a=s[m][k]
    if a!=v and (a is None or v is None or abs(a-v)>1e-10):errors.append((group,m,k,a,v))
 return checks,errors
summaryerrors=[]
for applicable in [False,True]:
 records=[r for r in rs if not applicable or r['stratum']!='warm-action' or not r['requested_global_reflow']];prefix='edits-heldout-'+('applicable-' if applicable else '')
 checks,err=audit(records,json.loads((p/(prefix+'paired.json')).read_text()));print('paired',prefix,'checks',checks,'errors',err)
 for s in json.loads((p/(prefix+'summary.json')).read_text()):
  own=[r for r in records if (r['stratum'],r['policy'],r['variant'])==(s['stratum'],s['policy'],s['variant'])];ordinary=[r for r in own if not r['color_negative_control']];colors=[r for r in own if r['color_negative_control']]
  expected={'jobs':len(own),'completed_jobs':sum(r['effective_status']=='ok' for r in own),'hard_valid_jobs':sum(r['hard_valid'] for r in own),'ordinary_jobs':len(ordinary),'ordinary_hard_valid_jobs':sum(r['hard_valid'] for r in ordinary),'color_jobs':len(colors),'color_hard_valid_jobs':sum(r['hard_valid'] for r in colors),'color_complete_geometry_exact':sum(r['completeGeometryExact'] for r in colors),'guard_fallbacks':sum(r['guard_applied'] for r in own)}
  for k,v in expected.items():
   if s[k]!=v:summaryerrors.append((prefix,s['policy'],s['variant'],k,s[k],v))
print('summary_count_errors',summaryerrors)
tasks={t['id']:t for stage in ['edits-current-heldout','edits-warm-heldout','edits-policies-heldout'] for t in json.loads((root/'evaluation/tasks'/f'{stage}.json').read_text())};referrors=[]
for r in rs:
 t=tasks[r['raw_trial_id']]
 if r['reference']['path']!=(t.get('reference') or t.get('compareReference')):referrors.append((r['record_id'],'path'))
 if 'prediction' in t and r['reference']['canonical_id']!=t['prediction']['preeditTrial']:referrors.append((r['record_id'],'same-policy'))
print('reference_errors',referrors)
print('incidental_h_reference_use',sum(r['reference']['canonical_id'].startswith('H-') for r in rs))
print('all_record_counts',{'records':len(rs),'unique_raw_trials':len({r['raw_trial_id'] for r in rs}),'success_records':sum(r['effective_status']=='ok' for r in rs),'guards':sum(r['guard_applied'] for r in rs),'preedit_guarded_records':sum(bool(r.get('prediction',{}).get('preeditGuardUsed')) for r in rs),'global_records':sum(r['requested_global_reflow'] for r in rs),'global_valid_records':sum(r['requested_global_reflow'] and r['hard_valid'] for r in rs)})
print('guard_refs_distinct_from_current',[(r['record_id'],r['reference']['canonical_id'],next(z['reference']['canonical_id'] for z in rs if z['raw_trial_id']==r['effective_trial_id'])) for r in rs if r['guard_applied']])
