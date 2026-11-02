import json,pathlib,hashlib
root=pathlib.Path('/workspace/scratch/8279601ec156/deliverables');out=root/'data/analysis';path=out/'heldout-routing-review.json';review=json.loads(path.read_text())
text=(root/'heldout-routing-decision.md').read_text();count=0
for line in text.splitlines():
 if not line.startswith('| Current positions / ') and not line.startswith('| Joint layout + route / '):continue
 cells=[s.strip() for s in line.strip('|').split('|')];scope,policy=cells[0].split(' / ',1);context='current' if scope=='Current positions' else 'joint'
 expected=[review['independent_common_counts'][context][policy]['profile:'+p] for p in review['common_profile_order']]
 observed=[int(c.split('/')[0]) for c in cells[1:6]];assert observed==expected;(None)
 assert all(c.endswith('/12') for c in cells[1:6]);assert (cells[6]=='yes')==all(v/12>=.95 for v in expected);count+=1
summaries=json.loads((out/'routing-current-heldout-policy-summary.json').read_text())
u=[s for s in summaries if s['policy']=='frozen-three-route-union' and s['subset']=='all' and s['axis'].startswith('profile:')]
assert len(u)==5 and all((s['acceptable_jobs'],s['oracle_feasible_jobs'],s['total_jobs'])==(18,18,24) for s in u)
pairs=json.loads((out/'joint-heldout-pair-summary.json').read_text());c22=[s for s in pairs if s['subset']=='all' and s['policy'].endswith('|routing:clearance-22')];pg=[s for s in pairs if s['subset']=='all' and s['policy'].endswith('|routing:portGap-28')]
assert sum(s['new_invalid'] for s in c22)==7 and sum(s['valid_baselines'] for s in c22)==56
assert [(s['policy'],s['new_invalid']) for s in pg if s['new_invalid']]==[('engine:force:RIGHT|routing:portGap-28',1)]
review['decision_markdown_check']={'table_rows_checked':count,'all_profile_denominators_and_gate_labels_match':True,'route_union_all_base_counts_each_profile':[18,18,24],'joint_clearance22_new_invalid':7,'joint_clearance22_valid_matched_baselines':56,'joint_portgap28_new_invalid':1,'joint_portgap28_loss_layout':'engine:force:RIGHT','discrepancies':[]}
review['verification_script_reproducibility']={'execution_form':'Transient inline Python heredoc in a tool cell','saved_script_available':False,'copied_to_evaluation_reviews':False,'note':'No reconciliation script was written to /tmp or another source file. Per parent instruction, the transient cell was not recreated. Primary analyzer and frozen inputs remain available; this review records exact input hashes and independent counts.'}
review['read_files'].append('heldout-routing-decision.md');review['read_files']=sorted(set(review['read_files']));review['reviewed_file_sha256']['heldout-routing-decision.md']=hashlib.sha256((root/'heldout-routing-decision.md').read_bytes()).hexdigest();path.write_text(json.dumps(review,indent=2,allow_nan=False)+'\n')
print(json.dumps({'decision_markdown_table_rows_checked':count,'additional_arithmetic':'matched','verification_source':'transient cell only; no saved script to copy','review_updated':str(path)}))
