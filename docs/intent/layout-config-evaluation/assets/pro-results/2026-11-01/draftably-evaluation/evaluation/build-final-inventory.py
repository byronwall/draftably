#!/usr/bin/env python3
'''Reporting-only final inventory join. Never runs or selects a geometry policy.

Development snapshots remain untouched. Final JSON keeps detailed evidence; the
35-column CSV summarizes it and links the complete analysis artifacts.
'''
import collections
import csv
import datetime
import hashlib
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[1]
BASELINE = 'f14d9b891adba75de6cc172b190017ea5a5ca091'

def read(name):
    return json.loads((ROOT / name).read_text())

def sha(name):
    return hashlib.sha256((ROOT / name).read_bytes()).hexdigest()

def compact(values):
    return '; '.join(str(x) for x in values)

def main():
    names = [
        'inventory-development-evidence.json',
        'data/analysis/layout-control-ablations.json',
        'data/analysis/heldout/portfolio-evidence-summary.json',
        'data/analysis/edits-heldout-applicable-summary.json',
        'data/analysis/file-auto-ports-probe/result.json',
        'data/analysis/routing-current-heldout-policy-summary.json',
        'data/analysis/routing-current-heldout-pair-summary.json',
        'data/analysis/joint-heldout-policy-summary.json',
        'data/analysis/heldout-routing-analysis-manifest.json',
    ]
    for name in names:
        if not (ROOT / name).exists():
            raise SystemExit('Final inventory requires completed evidence: ' + name)
    rows = read(names[0])
    ablations = {r['control']: r for r in read(names[1])['controls']}
    portfolio = read(names[2])
    edits = read(names[3])
    probe = read(names[4])
    route_summary, route_pairs, joint_summary = read(names[5]), read(names[6]), read(names[7])
    assert probe['failed'] == 0 and probe['passed'] == 12
    assert probe['execution']['routerCalls'] == 2 and probe['execution']['layoutCalls'] == 0
    assert read(names[8])['reference_checks']['trials'] == 288
    preferred = next(x for x in portfolio['summary'] if x['policy'] == portfolio['preferredSelector'])
    six = next(x for x in portfolio['summary'] if x['policy'] == 'frozen-six-engine-recipe-oracle')
    assert not preferred['contractRelativeGatePass'] and not six['contractRelativeGatePass']
    with (ROOT / 'data/analysis/heldout/portfolio-failure-witnesses.csv').open() as f:
        losses = list(csv.DictReader(f))
    profiles = ['readable', 'compact', 'traceable', 'stable', 'specialist']
    coverage = 'Common heldout: selector ' + ','.join(str(preferred['commonProfileCounts'][p]['acceptableBases']) for p in profiles) + '/12 feasible; six-engine oracle ' + ','.join(str(six['commonProfileCounts'][p]['acceptableBases']) for p in profiles) + '/12; 14 absolute bases. Neither passes 95% gate in every profile.'
    for row in rows:
        rid, key = row['recommendation_id'], row.get('setting_key')
        row['default_raw'] = row['default']
        row['source_baseline_sha'] = BASELINE
        row['decision_status'] = 'Final reporting recommendation; measured development and frozen heldout strata remain separate. No product implementation changed.'
        row['decision_scope'] = 'Public disclosure/action placement only; retain underlying source/API behavior unless the row names a narrower proven ineffective UI removal.'
        row['final_recommendation_scope'] = 'Keep current first-render source and router defaults; six-engine Compare pack experimental; retain all 11 engines and six recipes.'
        row['frozen_policy'] = 'data/policy-freeze.json; no post-heldout fitting'
        row['heldout_seen_for_reporting'] = True
        row['not_a_user_study'] = True
        row['shipping_class'] = 'Build presentation/round-trip corrections; preserve existing computation'
        row['evidence_paths'] = ['inventory-source.json', 'evaluation/inventory-source-read-manifest.json']
        row['development_control_summary'] = ''
        row['replacement_ablation_summary'] = ''
        row['heldout_coverage_summary'] = ''
        row['heldout_edit_summary'] = ''
        row['probe_summary'] = ''
        row['comparison_pack_member'] = ''
        row['uncertainty'] = row['uncertainty'].replace('Measured marginal value pending root evaluation', 'Coverage and context evidence are attached where applicable; no isolated outcome claim for other surfaces.')
        if row['runtime_impact'] == 'Not separately measured yet':
            row['runtime_impact'] = 'No isolated latency estimate for this surface; relevant pipeline/component measurements are linked where available.'
        evidence = row.get('measured_control_evidence', [])
        if evidence:
            row['development_control_summary'] = compact(
                str(r['stratum']) + ': ' + str(r['cases_with_over_1px_change']) + '/' + str(r['case_count']) + ' bases change>1px; ' + str(r['valid_cases_gained_by_local_oracle']) + ' valid gains; ' + str(r['baseline_valid_cases_with_adverse_level']) + ' baseline-valid bases harmed by a tested level'
                for r in evidence)
            row['evidence_paths'] += ['config-findings.md', 'inventory-control-evidence.json']
            row['evidence_type'] = 'Measured development sensitivity plus source trace; disclosure is a proposed product change.'
        if key in ablations:
            a = ablations[key]
            row['measured_replacement_ablation'] = a
            row['replacement_ablation_summary'] = compact(
                p + ': acceptable loss after replacement with the same three-configuration budget=' + str(x['acceptableLossAfterRetuning']) + ', new hard bases=' + str(len(x['newHardCasesAfterRetuning'])) + ', adverse witnesses=' + str(len(x['lossWitnesses']))
                for p, x in a['profiles'].items())
            if a.get('semanticCaution'):
                row['replacement_ablation_summary'] += '; semantic/intent control retained, not a fungible automatic quality setting'
            row['evidence_paths'] += ['data/analysis/layout-control-ablations.json', 'layout-control-ablation.md']
            row['implementation_retention'] = 'Retain exact source/API input. A smaller main control surface does not remove the parameter.'
        if row['category'] == 'engine':
            row['heldout_coverage_summary'] = coverage
            row['measured_frozen_heldout_portfolio'] = {'preferred_selector': preferred, 'six_engine_oracle': six}
            row['comparison_pack_member'] = key in portfolio['enginePortfolio']
            row['shipping_class'] = 'Build truthful disclosure and retained Advanced access; Explore six-engine Compare pack'
            row['implementation_retention'] = 'Retain; no internal engine deletion. Cold and warm evidence are distinct.'
            row['evidence_paths'] += ['reports/heldout-portfolio-evidence.md', 'data/analysis/heldout/portfolio-evidence-summary.json', 'data/analysis/heldout/portfolio-failure-witnesses.csv', 'data/analysis/control-warm-engines.json']
            witness = [x for x in losses if x['policy'] == 'frozen-six-engine-recipe-oracle' and (':' + str(key) + ':') in x['oracleMethod']]
            if witness:
                row['measured_heldout_escape_witnesses'] = witness
                row['witness_case'] += '; heldout escape: ' + compact(dict.fromkeys(x['oracleTrial'] for x in witness))
                row['marginal_gain_loss'] += ' Excluded from the six-engine pack but has the linked heldout full-pool acceptable witness; do not remove.'
        if row['category'] == 'recipe':
            row['replacement'] = 'Retain authored recipe and source syntax; optional native picker is separate work.'
            row['implementation_retention'] = 'Retain all six authored recipes; specialist meaning is not replaced by a graph-engine score.'
            row['evidence_paths'] += ['reports/heldout-portfolio-evidence.md']
        if rid in ['LAY-ALGORITHM', 'UI-COMPARE-ALGORITHMS']:
            row['heldout_coverage_summary'] = coverage
            row['replacement'] = 'Keep current first-render behavior; experimental six-engine Compare pack plus full Advanced method access. No new automatic selector.'
            row['shipping_class'] = 'Build disclosure; Explore selector on a new untouched test set'
            row['evidence_paths'] += ['data/analysis/heldout/portfolio-evidence-summary.json']
        if row['category'] == 'routing-setting':
            row['heldout_routing_policies'] = [x for x in route_summary if x['subset'] == 'all' and x['axis'] in ['profile:readable', 'profile:compact', 'profile:traceable', 'profile:stable', 'profile:specialist']]
            row['heldout_routing_matched_pairs'] = [x for x in route_pairs if x['subset'] == 'all']
            row['heldout_joint_policies'] = [x for x in joint_summary if x['subset'] == 'common' and x['axis'].startswith('profile:')]
            row['heldout_coverage_summary'] = 'Frozen three routes and nine joint combinations are route-only on cached/completed positions; defaults remain current. See separate exact-count tables; no cold latency claim.'
            row['implementation_retention'] = 'Retain source/API parameter. Existing routing defaults remain production defaults; alternatives require preview.'
            row['evidence_paths'] += ['heldout-routing-findings.md', 'data/analysis/routing-current-heldout-policy-summary.json', 'data/analysis/routing-current-heldout-pair-summary.json', 'data/analysis/joint-heldout-policy-summary.json']
        if rid in ['ACT-TIDY', 'ACT-PREVIEW-TIDY', 'LAY-MODE', 'LAY-WARM-START', 'UI-WARM-START', 'ACT-REFLOW-GROUP', 'LAY-MAX-MOVE', 'LAY-RESPECT-MANUAL', 'UI-SCOPE']:
            warm = [x for x in edits if x['stratum'] == 'warm-action']
            row['measured_heldout_applicable_edits'] = warm
            row['heldout_edit_summary'] = compact(x['policy'] + ': ' + str(x['ordinary_hard_valid_jobs']) + '/' + str(x['ordinary_jobs']) + ' ordinary local valid; ' + str(x['color_hard_valid_jobs']) + '/' + str(x['color_jobs']) + ' color valid, all 12 geometry-exact' for x in warm)
            row['editing_applicability'] = 'Exclude 11 requested global direction/format diagnostics from each warm 60-job table: 37 ordinary local jobs + 12 color. Includes 4 specialist compiler escapes. Do not pool cold and warm references.'
            row['evidence_paths'] += ['edit-findings-heldout.md', 'data/analysis/edits-heldout-applicable-summary.json', 'data/analysis/edits-heldout-verification.json']
        if rid == 'LAY-ROOT-ID':
            row['default'] = 'Unset (empty string; automatic root)'
            row['source_symbols'] += '; src/engines/layout-engine.js:135 (rootId default empty string); :456 (forest prefers only a valid explicit ID)'
        if rid == 'UI-RELEASE-PORTS':
            row['decision_scope'] = 'Remove only the ineffective Release fixed port sides checkbox in file-source routing Compare; retain raw Explorer capability and explicit source side-edit commands.'
            row['replacement'] = 'Existing explicit Use auto ports action, or an explicit future source-edge rewrite with its own tests.'
            row['implementation_retention'] = 'Retain raw Explorer autoPorts implementation and authored From/To sides.'
            row['probe_summary'] = '12/12 assertions; exact source functions false/true byte-identical; sides retained; scalar clearance writes. Raw positive pair releases sides. 2 router calls, 0 layout, 0 compile.'
            row['measured_applicability_probe'] = {k: probe[k] for k in ['declaredAt', 'completedAt', 'functions', 'execution', 'source', 'checks', 'passed', 'failed', 'conclusion']}
            row['witness_case'] = 'Development route-20, exact file candidateSource and sourceWithRouting; raw Explorer positive pair on D-freeze-route-20 geometry.'
            row['marginal_gain_loss'] = 'Removing this context-specific no-op loses no source output effect in the targeted actual branch. It does not remove raw endpoint release.'
            row['runtime_impact'] = 'Two ancillary positive router calls only; no latency inference.'
            row['uncertainty'] = 'Executed source-branch applicability witness; browser visibility/removal integration still needs the named UI acceptance test. No quality tuning or heldout fitting.'
            row['source_symbols'] += '; src/state/comparison.ts:159 (candidateSource); src/state/file-session.ts:578 (sourceWithRouting); src/dsl/layout-edits.ts:144 (setRouting)'
            row['evidence_type'] = 'Measured post-seal applicability probe, declared before execution; independent of frozen policy quality evaluation.'
            row['evidence_paths'] += ['evaluation/probe-file-auto-ports.mjs', 'data/analysis/file-auto-ports-probe/design.json', 'data/analysis/file-auto-ports-probe/result.json']
        row['evidence_paths'] = list(dict.fromkeys(row['evidence_paths']))
    assert len(rows) == 175 and len({r['recommendation_id'] for r in rows}) == 175
    assert {r['decision'] for r in rows} <= {'Keep', 'Merge', 'Automate', 'Hide', 'Remove'}
    assert all(r['default'] != '' for r in rows)
    assert len([r for r in rows if r['decision'] == 'Remove']) == 1
    (ROOT / 'inventory-final.json').write_text(json.dumps(rows, indent=2) + '\n')
    fields = ['recommendation_id', 'category', 'name', 'user_job', 'surfaces', 'default', 'range', 'effective_conditions', 'decision', 'replacement', 'implementation_retention', 'proposed_placement', 'witness_case', 'marginal_gain_loss', 'runtime_impact', 'uncertainty', 'source_symbols', 'evidence_type', 'setting_key', 'decision_scope', 'decision_status', 'development_control_summary', 'replacement_ablation_summary', 'heldout_coverage_summary', 'heldout_edit_summary', 'probe_summary', 'evidence_paths', 'comparison_pack_member', 'shipping_class', 'frozen_policy', 'default_raw', 'source_baseline_sha', 'final_recommendation_scope', 'heldout_seen_for_reporting', 'not_a_user_study']
    assert len(fields) == 35
    with (ROOT / 'inventory.csv').open('w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        writer.writerows({k: compact(r[k]) if isinstance(r.get(k), list) else r.get(k, '') for k in fields} for r in rows)
    manifest = {'at': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'reportingOnly': True, 'geometryRuns': 0, 'policyRefitted': False,
        'rows': 175, 'csvColumns': len(fields), 'decisions': dict(collections.Counter(r['decision'] for r in rows)),
        'allEnginesRetained': 11, 'allRecipesRetained': 6, 'sourceEngineParametersRetained': 15, 'routingParametersRetained': 12,
        'inputHashes': {n: sha(n) for n in names}, 'scriptSha256': sha('evaluation/build-final-inventory.py'),
        'developmentSnapshotSha256': sha('inventory-development-evidence.json'),
        'finalJsonSha256': sha('inventory-final.json'), 'finalCsvSha256': sha('inventory.csv'),
        'rootIdPresentationOnly': 'Empty raw default retained; final display explicitly says automatic root.',
        'onlyRemoveDecision': 'UI-RELEASE-PORTS, limited to proven no-op file-source checkbox.'}
    (ROOT / 'data/analysis/inventory-final-manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    print(json.dumps(manifest, indent=2))

if __name__ == '__main__':
    main()
