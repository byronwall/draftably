#!/usr/bin/env python3
"""Join source/UI dispositions to completed development evidence, with no algorithms.

The output is a distinct artifact so it never overwrites the immutable source
inventory or the control analyzer's intermediate table. No heldout results read.
"""
import collections,csv,hashlib,json,pathlib
ROOT=pathlib.Path(__file__).resolve().parents[1]
A=ROOT/'data/analysis'
def read(path):return json.loads((ROOT/path).read_text())
rows=read('inventory-control-evidence.json')
warm=read('data/analysis/control-warm-engines.json')
network=read('data/analysis/control-network-summary.json')
joint=read('data/analysis/control-joint-summary.json')
scope=read('data/analysis/control-warm-targeted.json')
partition=read('data/analysis/control-warm-failure-partition.json')
edits=read('data/analysis/edits-development-applicable-summary.json')
bywarm={x['engine']:x for x in warm['per_engine']}
ablations={x['removed_engine']:x for x in warm['leave_one_engine_out']}
bynetwork={x['engine']:x for x in network['per_engine']}
for row in rows:
    rid=row['recommendation_id']
    row['decision_scope']='UI disposition; Hide/Automate/Merge retain the source/API implementation unless an explicit removal scope is stated.'
    row['decision_status']='Development evidence joined to source-grounded recommendation; final heldout policy decision remains separate.'
    if row['category']=='engine':
        engine=row['setting_key']; w=bywarm[engine];a=ablations[engine]
        row['measured_warm_engine_evidence']={k:v for k,v in w.items() if k not in ['best_soft_witness','worst_soft_witness']}
        row['measured_warm_engine_ablation']=a
        if engine in bynetwork:row['measured_raw_cold_network_direction_evidence']=bynetwork[engine]
        row['measured_joint_routing_evidence']=[r for r in joint['per_layout_policy'] if (':'+engine+':') in r['layout_method']]
        row['implementation_retention']='Retain; no internal engine deletion recommended from this experiment.'
        wins=[x['unique_trial'] for x in a['unique_practical_witnesses']]
        adverse=[x['trial_id'] for x in w['hard_failure_cases']]
        row['witness_case']='; '.join(dict.fromkeys(wins+adverse)) or f'All twelve native warm trials for {engine}; no unique practical win or hard-invalid witness in this stratum.'
        row['marginal_gain_loss']=(f"Native warm pass: {w['hard_valid_candidates']}/12 valid, {w['valid_lost']} new invalid vs retained current; "
            f"removing from eleven-engine+retain pool loses {a['full_pool_acceptable_loss']} acceptable profile jobs; "
            f"same three-action retuning loses {a['retuned_acceptable_loss']} profile jobs. Cold-source coverage is a separate final-portfolio analysis.")
        row['runtime_impact']='Recorded warm operation median '+str(round(w['recorded_operation_median_ms'],3))+' ms; route cache/order confounded; repeated-timing stage governs speed claims.'
        row['uncertainty']='Twelve unperturbed native drawings across eleven families; not the perturbed protected edit job. A unique warm witness justifies retention; a missing witness does not prove universal redundancy.'
        row['evidence_type']='Measured development warm passes/ablations plus exact source trace; UI placement is proposed.'
        if engine=='compound-flow':
            row['replacement']='Hide algorithm choice from the basic panel; retain warm compound-flow because containers-01 has a unique traceable result. Compare-front-page omission is not internal deletion.'
    if rid=='UI-SCOPE':
        row['measured_supported_scope_evidence']=scope
        row['measured_original_failure_partition']=partition
        row['witness_case']='D-target-scope-architecture-01-selection; D-target-scope-architecture-01-all; original D-warm-architecture-03-scope-selection (explicitly unsupported cross-parent selection).'
        row['marginal_gain_loss']='Four supported scopes ×12 bases: 44/48 executions, zero pin/scope violations among completed outputs; valid all9/12, selection10/12, neighbourhood10/12, container6/12. Different movement constraints are not interchangeable quality settings.'
    if rid in ['LAY-DIRECTION','LAY-FIT','ACT-REBUILD']:
        row['measured_direction_fit_witness']={'trial_id':'E-cold-presentation-03-direction_or_remove-current',
            'source_intent':'layout root flow direction=down gap=48 fit=wide',
            'finding':'Exact earlier node geometry retained; fitVariants tries both directions. Projected tool direction alone is not a compiled direction-compliance check.',
            'evidence':'data/analysis/edits-development-direction-diagnostics.json',
            'dispatch_proposal':'Direction/format -> source rebuild. Bounded warm repair remains a diagnostic on this job.'}
    if rid in ['ACT-TIDY','ACT-PREVIEW-TIDY','LAY-MODE','LAY-WARM-START','UI-WARM-START','ACT-REFLOW-GROUP']:
        row['measured_edit_evidence']=[r for r in edits if r['stratum']=='warm-action']
        row['editing_applicability']='Applicable E warm jobs exclude requested global reflow; all three policies are33/37 valid on ordinary local edits plus12/12 unchanged color controls (45/49 total). Their raw60-job table also includes11 diagnostic direction jobs.'
    if rid=='LAY-ORDERING':
        row['replacement']='Hide ineffective cold-source ordering choice; retain warm ordering in Advanced. Cold silence cannot justify removing the implementation.'
    if rid=='RTE-CORNER-RADIUS':
        row['replacement']='Appearance: square/rounded, exact radius disclosed; appearance-only path changes are retained even with identical polyline scores.'
    if rid=='RTE-CLEARANCE':
        row['measured_joint_routing_evidence']=joint['per_layout_policy']
        row['joint_caution']='Clearance22 loses7 of36 default-valid layout/base combinations; it is an inspectable alternative, not a safe unguarded default.'
    if rid.startswith('BRUSH-') or rid.startswith('ACT-BRUSH') or rid.startswith('ACT-TIMELINE'):
        row['measured_warm_suite_evidence']={'manifest':'data/sculpt-run-manifest.json','outcomes':'data/sculpt-geometry-results.json',
            'assertions_passed':54,'assertions_failed':0,'scope':'Existing unchanged sculpt suite; do not treat each inventory row as independently ablated or as a user study.'}
    if row['witness_case'].startswith('See targeted witness requirement'):
        row['witness_case']='Source-traced applicability and semantics at source_symbols; no isolated trial assigned to this specific surface. Do not infer measured gain from inventory presence.'
    if row.get('evidence_type','').endswith('measured annotation pending'):
        row['evidence_type']='Source fact and explicit UI recommendation; no isolated outcome claim for this row.'
assert len(rows)==175 and len({r['recommendation_id'] for r in rows})==175
assert set(r['decision'] for r in rows)<={'Keep','Merge','Automate','Hide','Remove'}
(ROOT/'inventory-development-evidence.json').write_text(json.dumps(rows,indent=2)+'\n')
fields=list(dict.fromkeys(k for r in rows for k in r))
with (ROOT/'inventory-development-evidence.csv').open('w',newline='') as f:
    writer=csv.DictWriter(f,fieldnames=fields);writer.writeheader()
    writer.writerows({k:json.dumps(v,separators=(',',':')) if isinstance(v,(dict,list)) else v for k,v in r.items()} for r in rows)
manifest={'rows':len(rows),'recommendation_ids_unique':True,'decisions':dict(collections.Counter(r['decision'] for r in rows)),
    'heldout_access':False,'geometry_algorithm_calls':0,'script_sha256':hashlib.sha256(pathlib.Path(__file__).read_bytes()).hexdigest(),
    'engine_implementation_retention':'All11 retained; public disclosure can shrink independently.',
    'final_policy_caution':'This table has complete UI dispositions and development evidence. The final cold/heldout policy recommendation must cite its own frozen selection and gate results.'}
(A/'inventory-development-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps(manifest,indent=2))
