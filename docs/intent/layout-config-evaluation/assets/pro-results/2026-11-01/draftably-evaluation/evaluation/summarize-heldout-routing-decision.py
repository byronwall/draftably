#!/usr/bin/env python3
'''Reporting only: apply the stated 95% threshold to published frozen-policy counts.
Does not select, retune, execute, or change any algorithm or metric.
'''
import datetime
import hashlib
import json
import pathlib
from original_report_inputs import require_original_report_inputs

ROOT = pathlib.Path(__file__).resolve().parents[1]
require_original_report_inputs(ROOT)
A = ROOT / 'data/analysis'
PROFILES = ['readable', 'compact', 'traceable', 'stable', 'specialist']
WEIGHTS = ['balanced', 'traceable', 'direct']

def read(n): return json.loads((A / n).read_text())
def digest(p): return hashlib.sha256(p.read_bytes()).hexdigest()

def gates(rows):
    out = []
    for policy in dict.fromkeys(r['policy'] for r in rows):
        rr = [r for r in rows if r['policy'] == policy and r['subset'] == 'common']
        profile = {p: next(r for r in rr if r['axis'] == 'profile:' + p) for p in PROFILES}
        weights = {p: next(r for r in rr if r['axis'] == 'route:' + p) for p in WEIGHTS}
        out.append({'policy': policy, 'role': rr[0]['role'],
            'commonBases': 14, 'scopedOracleFeasibleCommonBases': profile['readable']['oracle_feasible_jobs'],
            'fiveProfileAcceptedCounts': {p: r['acceptable_jobs'] for p, r in profile.items()},
            'threeRouteWeightAcceptedCounts': {p: r['acceptable_jobs'] for p, r in weights.items()},
            'scopedRelative95EveryProfilePass': all(r['relative_to_scoped_feasible_pool_fraction'] >= .95 for r in profile.values()),
            'absolute95EveryProfilePass': all(r['absolute_acceptable_fraction'] >= .95 for r in profile.values()),
            'scopedRelative95EveryRouteWeightPass': all(r['relative_to_scoped_feasible_pool_fraction'] >= .95 for r in weights.values()),
            'currentValidHardLossCommonBases': max(r['current_valid_hard_loss_bases'] for r in profile.values()),
            'pooledProfiles': next({k: r[k] for k in ['acceptable_jobs', 'oracle_feasible_jobs', 'total_jobs']} for r in rr if r['axis'] == 'five_profiles_pooled')})
    return out

current = gates(read('routing-current-heldout-policy-summary.json'))
joint = gates(read('joint-heldout-policy-summary.json'))
runtime = read('heldout-routing-runtime.json')
manifest = read('heldout-routing-analysis-manifest.json')
result = {'at': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'reportingOnly': True, 'geometryRuns': 0, 'policyRefitted': False,
    'policyFreezeSha256': digest(ROOT / 'data/policy-freeze.json'),
    'sourceAnalysisSha256': manifest['code_sha256'], 'sourceDesignSha256': manifest['design_sha256'],
    'currentPositionPolicies': current, 'jointPolicies': joint,
    'scope': 'Current-position oracle is current default plus three frozen routes. Joint oracle is three default-routing layouts plus nine frozen layout-route combinations. These are different from the full cold-source algorithm pool.',
    'defaultDecision': 'Keep existing first-render source and routing defaults. Offer exact frozen routing alternatives behind Compare/preview; never apply clearance 22 unconditionally.',
    'thresholdInterpretation': 'A pooled 95% rate is insufficient. Every common-job profile must reach 95% separately. The frozen route triple passes its narrower scoped oracle test, while the fixed joint global, joint triple, and all-nine joint set fail at least one common profile. No new cold default or latency claim follows from cached-position route composition.',
    'serialSensitivity': {'trials': len(runtime), 'knownDerivedCosts': sum(r['derived_serial_compile_plus_route_worker_ms'] is not None for r in runtime),
        'hardValidRoutes': sum(r['hard_valid'] for r in runtime),
        'hardValidExceeding15000ms': sum(r['hard_valid'] and r['derived_serial_budget_eligible'] is False for r in runtime),
        'unknownCosts': sum(r['derived_serial_budget_eligible'] is None for r in runtime)},
    'inputIntegrity': manifest['reference_checks'], 'archiveVerification': manifest['verification'],
    'independentReview': 'Pre-outcome routing review passed. Heldout E has separate completed independent review. Post-outcome routing review status is recorded separately if available.'}
(A / 'heldout-routing-decision.json').write_text(json.dumps(result, indent=2) + '\n')
lines = ['# Heldout routing decision: strict denominators', '',
    '**Retain the current router default. Use the three frozen route alternatives in an inspectable comparison.** The frozen current-position route portfolio passes the narrower scoped comparison; no single route passes every common profile, and the frozen joint global/triple do not pass. This report applies thresholds to completed published tables and performs no new selection.', '',
    'Both strata contain 14 common bases, with 12 feasible in their scoped pools. Each cell is accepted bases / 12; divide the numerator by 14 for the absolute sensitivity. With this denominator, 11/12 (91.7%) fails the 95% gate. In both strata the static stable profile is the frozen balanced defect proxy; these are not warm-history observations.', '',
    '| Scope / frozen policy | Readable | Compact | Traceable | Stable | Specialist | Every profile ≥95% |',
    '| --- | ---: | ---: | ---: | ---: | ---: | --- |']
for scope, rows in [('Current positions', current), ('Joint layout + route', joint)]:
    for r in rows:
        values = ' | '.join(str(r['fiveProfileAcceptedCounts'][p]) + '/12' for p in PROFILES)
        lines.append('| ' + scope + ' / ' + r['policy'] + ' | ' + values + ' | ' + ('yes' if r['scopedRelative95EveryProfilePass'] else 'no') + ' |')
lines += ['',
    'The three-route union has 18/18 feasible all-base coverage in each profile, or 18/24 absolutely. It is an oracle Compare upper bound and preserves a useful alternative for all measured feasible cases. Its full scoped oracle contains only current defaults plus those three routes; this success does not establish dominance over every untested routing configuration or the full cold-layout pool.', '',
    'The joint triple covers 57/60 feasible common profile jobs when pooled—exactly 95%—but compact is 11/12 and traceable 10/12. The all-nine set covers 59/60 pooled but traceable 11/12. Both therefore fail the every-profile requirement. The fixed global covers 38/60. The matched three-layout default-route oracle covers 43/60. All bases with no feasible result remain in the 70-job absolute common denominator.', '',
    'Clearance 22 adds six new hard-invalid cases among 16 valid current-source bases (five among 11 valid common bases), despite two diagnostic rescues from source checkpoints. Clearance 4 and port gap 28 add none in this current-position stratum. Across the three frozen layouts, clearance 22 loses seven of 56 valid matched layout/base baselines; port gap 28 loses one under force. A setting that is safe on one position set is not universally safe after a layout change.', '',
    'The fixed joint boundary-align RIGHT + clearance 4 result is valid on 19/24 bases versus current source 16/24, with three diagnostic rescues and no new current-valid hard loss. Its common quality counts still fail the scoped gate. These route-only results compose measured compilation with measured rerouting on completed/cached positions; they are not new measured cold render outcomes.', '',
    'All 288 derived serial compile-plus-route-worker estimates are available; all 205 hard-valid route outputs are within 15,000 ms on that component sum. The primary geometric labels were not changed by a new time gate. Fifty-four tasks use explicit partial references: 44 time out, 8 complete hard-invalid, and 2 complete hard-valid. The original source outcomes remain failures where they failed.', '',
    'Evidence: `heldout-routing-findings.md`; `data/analysis/heldout-routing-decision.json`; the per-policy, per-case, paired, family, runtime and base/family bootstrap files with prefixes `routing-current-heldout`, `joint-heldout`, and `joint-global-heldout`. All 243 successful reroutes preserve the full document except routing settings, and 318 canonical output/reference geometry signatures pass verification.', '']
(ROOT / 'heldout-routing-decision.md').write_text('\n'.join(lines))
print(json.dumps({'current': current, 'joint': joint, 'serialSensitivity': result['serialSensitivity']}, indent=2))
