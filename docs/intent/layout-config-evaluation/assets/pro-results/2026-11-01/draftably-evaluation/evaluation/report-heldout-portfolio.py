#!/usr/bin/env python3
"""Original-run evidence memo and witnesses for already frozen heldout policies.

Uses existing source outcomes and the frozen policy-analysis functions. It never
fits a tree, sweeps subsets, minimizes configurations, or executes geometry.
The narrative describes the original experiment. A raw-input hash guard refuses
fresh replay outcomes; use the dynamic core analyzers to report those outcomes.
"""
import collections
import csv
import importlib.util
import json
import math
import pathlib
import types
from original_report_inputs import require_original_report_inputs

ROOT = pathlib.Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('dependencies_frozen', ROOT/'evaluation/analyze-dependencies.py')
D = importlib.util.module_from_spec(spec)
spec.loader.exec_module(D)
A = D.a
OUT = ROOT/'data/analysis/heldout'


def csv_rows(name):
    with (OUT/name).open(newline='') as handle:
        return list(csv.DictReader(handle))


def truth(value):
    return value is True or value == 'True'


def numeric(value):
    try:
        answer = float(value)
        return answer if math.isfinite(answer) else None
    except (ValueError, TypeError):
        return None


def compact(row, name=None):
    result = {'policy': name or row.get('policy'), 'oracleOnly': 'oracle' in (name or row.get('policy', '')),
              'commonProfileCounts': row['commonProfileCounts'],
              'commonFeasibleProfileCoverage': row['commonFeasibleProfileCoverage'],
              'commonAbsoluteProfileCoverage': row['commonAbsoluteProfileCoverage'],
              'worstProfileCommonFeasibleCoverage': row['worstProfileCommonFeasibleCoverage'],
              'worstProfileCommonAbsoluteCoverage': row['worstProfileCommonAbsoluteCoverage'],
              'currentValidHardRegressionCases': row['currentValidHardRegressionCases'],
              'specialistCurrentValidLossCases': row['specialistCurrentValidLossCases'],
              'acceptableCoverageAllFeasibleFamilies': row['acceptableCoverage'],
              'worstFamilyCoverage': row['worstFamilyCoverage']}
    result['contractRelativeGatePass'] = result['worstProfileCommonFeasibleCoverage'] >= .95 and result['currentValidHardRegressionCases'] == 0 and result['specialistCurrentValidLossCases'] == 0
    result['conservativeAbsoluteGatePass'] = result['worstProfileCommonAbsoluteCoverage'] >= .95 and result['currentValidHardRegressionCases'] == 0 and result['specialistCurrentValidLossCases'] == 0
    return result


def main():
    original_inputs = require_original_report_inputs(ROOT)
    policy, freeze_path = A.frozen_policy()
    frozen = A.read_json(freeze_path)
    protected = ['evaluation/analyze-portfolio.py', 'evaluation/analyze-dependencies.py', 'evaluation/metrics.mjs']
    for name in protected:
        if A.sha(ROOT/name) != frozen['frozenCodeHashes'][name]:
            raise ValueError('Frozen code changed: '+name)
    screen, inputs = D.load_screen('heldout', types.SimpleNamespace(allow_partial=False), policy)
    deps = {c['id']: D.source_dependencies(c) for c in screen.cases}
    fixed = next(x for x in policy['engineRecipeDiagnostic']['minima'] if x['mode']=='combined' and x['scenario']=='recipes-and-authored-safe' and x['weighting']=='equal-family')
    if fixed['portfolio'] is None:
        raise ValueError('No frozen dependency portfolio to replay')
    witnesses = D.selection_witnesses(screen, fixed['mode'], fixed['scenario'], fixed['portfolio'], deps)
    choices = [screen.lookup(w['caseId'], w['method']) if w['method'] else None for w in witnesses]
    six_name = 'frozen-six-engine-recipe-oracle'
    six_rows = screen.selection_rows(choices, six_name)
    current_rows = screen.selection_rows([j['rows'].get('current') for j in screen.jobs], 'current-authored')
    six_summary = screen.evaluate(choices)
    existing_dependency = A.read_json(OUT/'engine-recipe-frozen-subsets.json')
    reference = next(x for x in existing_dependency['results'] if x['mode']==fixed['mode'] and x['scenario']==fixed['scenario'] and x['selectedUnderWeighting']=='equal-family' and x['evaluationWeighting']=='equal-family')
    for profile in A.PROFILES:
        assert six_summary['commonProfileCounts'][profile]['acceptableBases'] == reference['commonProfileCounts'][profile]['acceptable']
    A.write_csv(OUT/'frozen-engine-recipe-witnesses.csv', six_rows+current_rows)
    A.dump(OUT/'frozen-engine-recipe-witnesses.json', {'fittedOnHeldout':False, 'frozenPortfolio':fixed['portfolio'], 'witnesses':witnesses})
    six_ci = A.bootstrap_paired(six_rows+current_rows, six_name)
    A.dump(OUT/'frozen-engine-recipe-paired-bootstrap.json', six_ci)

    all_summaries = A.read_json(OUT/'policy-summaries.json') + A.read_json(OUT/'retuned-policy-summaries.json')
    by_name = {x['policy']:x for x in all_summaries if x['weighting']=='equal-family'}
    preferred = policy['compact']['preferredSelector']
    prefix = 'tuned-' if preferred['mode']=='tuned' else ''
    selector_name = prefix+f"k{preferred['size']}-prelayout-selector-validity-guard"
    goal_name = prefix+f"k{preferred['size']}-goal-selector-validity-guard"
    names = ['current-authored', 'implicit-recipe', 'documented-default', 'best-fixed-global-validity-guard',
             'k1-configuration-oracle', 'k2-configuration-oracle', 'k3-configuration-oracle',
             'k4-configuration-oracle', 'k5-configuration-oracle', selector_name, goal_name]
    summaries = [compact(by_name[n]) for n in names]
    summaries.append(compact(six_summary, six_name))
    config = A.read_json(OUT/'minimum-configuration-frozen-policy.json')
    config_name = 'frozen-minimum-configuration-oracle'
    summaries.append(compact(config['heldoutSummary'], config_name))
    cis = A.read_json(OUT/'paired-cluster-bootstrap.json') + A.read_json(OUT/'retuned-paired-cluster-bootstrap.json') + [six_ci, A.read_json(OUT/'minimum-configuration-paired-bootstrap.json')]
    ci_map = {x['policy']:x for x in cis}

    selections = csv_rows('policy-case-selections.csv') + csv_rows('retuned-policy-case-selections.csv') + csv_rows('minimum-configuration-frozen-selections.csv') + six_rows
    # The existing profile table has the frozen scalar score and observed size/length.
    profile_rows = csv_rows('profile-scores.csv')
    by_profile = {(r['caseId'],r['profile'],r['method']):r for r in profile_rows}
    failures = []
    relevant_names = {selector_name, goal_name, six_name, config_name}
    seen = set()
    for row in selections:
        key = (row['policy'],row['caseId'],row['profile'])
        if row['policy'] not in relevant_names or key in seen:
            continue
        seen.add(key)
        if truth(row['acceptable']):
            continue
        oracle_available = truth(row['oracleAvailable'])
        reasons = []
        source = by_profile.get((row['caseId'],row['profile'],row.get('chosenMethod')))
        oracle = by_profile.get((row['caseId'],row['profile'],row.get('oracleMethod')))
        ratio_area = ratio_length = None
        if not oracle_available:
            reasons.append('full measured pool has no hard-valid outcome')
        elif not truth(row['hardValid']):
            reasons.append('chosen output is hard-invalid or unavailable')
        elif source and oracle:
            score, oscore = numeric(source['score']), numeric(oracle['score'])
            area, oarea = numeric(source['area']), numeric(oracle['area'])
            length, olength = numeric(source['routeLength']), numeric(oracle['routeLength'])
            if score is not None and oscore is not None and score > oscore + A.BANDS['score'] + 1e-8:
                reasons.append('score exceeds frozen +1 band')
            if area is not None and oarea is not None:
                ratio_area = area/oarea if oarea else None
                if area > oarea*(1+A.BANDS['area'])+1e-6:
                    reasons.append('area exceeds frozen +10% band')
            if length is not None and olength is not None:
                ratio_length = length/olength if olength else None
                if length > olength*(1+A.BANDS['routeLength'])+1e-6:
                    reasons.append('route length exceeds frozen +10% band')
        failures.append({**row, 'lossReasonsFromExistingMetrics':reasons,
                         'areaRatioToFrozenOracle':ratio_area, 'routeLengthRatioToFrozenOracle':ratio_length,
                         'sourceGeometry':f"data/geometry/{row['chosenTrial']}.json.gz" if row.get('chosenTrial') else None,
                         'oracleGeometry':f"data/geometry/{row['oracleTrial']}.json.gz" if row.get('oracleTrial') else None})
    A.write_csv(OUT/'portfolio-failure-witnesses.csv', failures)
    A.dump(OUT/'portfolio-failure-witnesses.json', failures)
    unavailable = sorted({r['caseId'] for r in selections if r['policy']==selector_name and not truth(r['oracleAvailable'])})
    band = A.read_json(OUT/'band-sensitivity-no-retuning.json') + A.read_json(OUT/'retuned-band-sensitivity-no-retuning.json')
    sensitivity = [{k:r[k] for k in ['policy','bandMultiplier','selectionSemantics','commonProfileCounts','worstProfileCommonFeasibleCoverage','worstProfileCommonAbsoluteCoverage','currentValidHardRegressionCases']} for r in band if r['policy'] in [selector_name,goal_name,'k5-configuration-oracle','k5-configuration-oracle-current-fallback']]
    weighting = [{k:r[k] for k in ['policy','weighting','acceptableCoverage','commonAcceptableCoverage','worstFamilyCoverage','worstProfileCommonFeasibleCoverage']} for r in all_summaries if r['policy'] in names]
    cell_audit = A.read_json(ROOT/'data/analysis/cell-access-audit-heldout.json')
    cell_totals = cell_audit['totals']
    data = {'schema':'heldout-portfolio-evidence-1','reportingOnly':True,'originalRunReportingOnly':True,'geometryRuns':0,'policyRefitted':False,
            'originalReportInputGuard':{'path':'data/analysis/original-report-inputs.json','sha256':A.sha(ROOT/'data/analysis/original-report-inputs.json'),'verifiedStreams':len(original_inputs['streams'])},
            'policyFreezeSha256':A.sha(freeze_path),'reportingCodeSha256':A.sha(__file__),
            'enginePortfolio':fixed['portfolio'],'globalConfigurations':config['policy']['globalMethods'],
            'preferredSelector':selector_name,'preferredGoalSelector':goal_name,
            'summary':summaries,'allPoolUnavailableCases':unavailable,
            'commonDenominators':{'all':14,'feasible':12,'currentHardValid':11},
            'allBaseDenominators':{'all':24,'feasible':19},
            'pairedBootstrapScopeClarification':'Existing bootstrap uses all 12 families, conditional on their shared full-pool feasibility; it does not filter the seven common-job families. Its intervals must not be called common-job gate intervals.',
            'pairedCIs':[ci_map[n] for n in names+[six_name,config_name] if n in ci_map],
            'weightingSensitivity':weighting,'bandSensitivity':sensitivity,
            'frozenInputs':inputs,'failureWitnessesFile':'data/analysis/heldout/portfolio-failure-witnesses.csv',
            'supplementaryCellAccessAudit':{'path':'data/analysis/cell-access-audit-heldout.json','snapshotStarted':cell_audit['snapshotStarted'],'totals':cell_totals,'unscored':True}}
    A.dump(OUT/'portfolio-evidence-summary.json',data)
    lines = ['# Frozen heldout portfolio evidence','',
             'Original-experiment report. This helper verifies the exact raw inputs listed in `data/analysis/original-report-inputs.json` and refuses fresh replay results, whose timestamps and measurements identify a different run. Dynamic core analyzers remain available for fresh-result reporting.','',
             '**No frozen reduced portfolio or automatic selector passed the experiment’s heldout acceptance rule.** The development minimum of six dependency-safe engines did not retain 95% acceptable common-job coverage in every profile. Restricting those engines to the eleven development-selected global configurations lost further coverage. The selector trained on source features performed substantially below either availability oracle.','',
             'These findings support retaining the shipped engine implementations and their explicit advanced escape path. The six-engine set is a measured development candidate, not a validated implementation-deletion plan. A goal-oriented interface can still be proposed, but this experiment does not validate automatic replacement of current source layout by the fitted selector. Actual editing behavior is evaluated separately in the E experiment.','',
             '## Exact common-case counts','',
             'There are **14 common heldout bases**, of which the full measured pool has a hard-valid output for **12**. Current authored source is hard valid on **11**. The contract requires at least 95% of the 12 feasible bases separately in each profile, plus no new current-valid hard failure and preservation of specialist escapes. At this sample size, 11/12 is insufficient. The stricter absolute sensitivity uses all 14 bases and is reported separately.','',
             '| Frozen policy | Readable | Compact | Traceable | Stable proxy | Specialist proxy | Lowest relative | Lowest absolute | New current-valid hard losses |',
             '|---|---:|---:|---:|---:|---:|---:|---:|---:|']
    for row in summaries:
        values = [str(row['commonProfileCounts'][p]['acceptableBases']) for p in A.PROFILES]
        lines.append('| '+ ' | '.join([row['policy']]+values+[f"{row['worstProfileCommonFeasibleCoverage']:.1%}",f"{row['worstProfileCommonAbsoluteCoverage']:.1%}",str(row['currentValidHardRegressionCases'])])+' |')
    lines += ['', 'Each profile column is an accepted-base count: divide by 12 for the contract’s relative rate, or by 14 for the absolute rate. These counts assess frozen practical-equivalence bands, not just hard validity. The preferred guarded selector and both dependency oracles preserved both currently valid protected specialist cases.','',
              '## What was retained in the dependency candidate','',
              'The frozen six-engine set is **'+', '.join(fixed['portfolio'])+'**. All six structural recipe implementations remain available. Source-dependent current layouts remain available only when their explicitly named engine dependencies are retained. The five-choice UI-fallback scenario still uses hidden implementations and is not evidence for deleting them.','',
              'The eleven global configurations are:', '']
    lines += ['- `'+m+'`' for m in config['policy']['globalMethods']]
    lines += ['', 'Grid remains an implementation dependency of authored nested layout, even though it is absent from those eleven global configurations. The configuration search was conditional on the chosen engine set; it was not joint global optimization over every possible engine/parameter combination. No set or configuration was retuned on heldout.','',
              '## Paired uncertainty','',
              'The following differences are acceptable-coverage changes versus current source across **all oracle-feasible families**, with profiles clustered within each base. The frozen bootstrap resamples families and then bases, with 2,000 draws. Its phrase “common full-pool oracle feasibility” refers to feasibility shared by both compared policies; its code does not filter to common-job families. These intervals are therefore distinct from the exact common-job gate above.','',
              '| Policy | Coverage difference | Paired 95% interval |','|---|---:|---|']
    for name in ['best-fixed-global-validity-guard',selector_name,goal_name,six_name,config_name]:
        ci = ci_map[name]
        lines.append(f"| {name} | {100*ci['point']:+.1f} pp | {100*ci['ci95'][0]:+.1f} to {100*ci['ci95'][1]:+.1f} pp |")
    lines += ['', 'Only two heldout bases were constructed per family. The intervals describe this stratified corpus and cannot establish real-user prevalence. An oracle’s positive difference does not establish that an automatic selector can realize it.','',
              '## Weighting and band sensitivity','',
              'Equal-family, 80/20 common/niche, 50/50, and worst-family views all retain the same common-profile count failures. The preferred selector has at least one feasible family with zero accepted jobs. Its all-feasible acceptable coverage changes only modestly with common/niche weighting; weighting does not repair the missing cases.','',
              '| Frozen policy | Band multiplier | Lowest relative common coverage | Selection interpretation |','|---|---:|---:|---|']
    for row in sensitivity:
        lines.append(f"| {row['policy']} | {row['bandMultiplier']} | {row['worstProfileCommonFeasibleCoverage']:.1%} | {row['selectionSemantics']} |")
    lines += ['', 'A band multiplier of 0.5 means +0.5 score and +5% area/length; 2 means +2 score and +20% area/length. Trees and retained subsets remain fixed. Oracle sensitivity may choose a different already-measured configuration inside the same frozen subset; deployed selectors retain their frozen decisions. No new policy was selected from this sensitivity.','',
              '## Failures and concrete witnesses','',
              'The full pool has no acceptable hard-valid result for: **'+', '.join(unavailable)+'**. These five bases stay in the absolute denominator and in the failure ledger. Two are common cases: architecture-06 and dags-06.','',
              'The six-engine oracle misses architecture-05 on readable/stable/specialist and cycles-06 on traceable/stable/specialist; it also misses the niche routing-06 compact job. The eleven-configuration restriction additionally loses pipelines-05 on four profiles and cycles-05 on stable/specialist. A score tie can still fail because area or route length exceeds the frozen +10% bands; the witness ledger preserves those separate reasons.','',
              'For example, the selector chooses force RIGHT for pipelines-05. It passes the hard gates but misses all five profile acceptance tests. The traceable score ties the full-pool oracle while its geometry falls outside a practical-equivalence bound. This demonstrates why the comparison cannot be summarized by score or crossing count alone.','',
              'Use `data/analysis/heldout/portfolio-failure-witnesses.csv` for case/profile reasons, chosen and oracle trial IDs, geometry paths, and size/length ratios. `frozen-engine-recipe-witnesses.csv` contains every applied six-engine oracle decision. `minimum-configuration-frozen-selections.csv` contains the frozen eleven-configuration choices used for visual matching.','',
              '## Verification and related artifacts','',
              '- `archive-hash-audit.json` verifies all 673 successful heldout source artifacts, with zero missing files and zero hash mismatches.',
              '- `../family-tails-heldout.md` summarizes 852 logical method observations from 829 physical source trials: 673 completed, 607 hard valid, and 156 timed out. These are repeated measurements of 24 bases, not independent users.',
              '- `frozen-policy-acceptance.json` retains every tested policy gate result, including unguarded tuned-policy hard regressions.',
              '- `portfolio-evidence-summary.json` supplies the compact machine-readable evidence table.',
              '- `renders/analysis/heldout-portfolio-coverage.*` and `heldout-profile-coverage.*` show the frozen size curves and exact profile counts.', '',
              f"The completed supplementary heldout cell-access census inspected **{cell_totals['artifacts']:,} saved artifacts** containing **{cell_totals['drawnRoutes']:,} drawn routes**, across the finished source, routing, joint, and edit stages. It found **{cell_totals['crossRoutes']} cell-access cross routes**, **{cell_totals['newUnscoredNativeNodeFindings']} new unscored native-node findings**, **{cell_totals['canonicalGeometryHashMismatches']} canonical geometry-hash mismatches**, and **{cell_totals['coverageGaps']} recorded coverage gaps. No actual cross route was present, so this is an unexercised production path, not proof that the frozen exception is safe. Timeout checkpoints lack complete drawn routes and are outside that geometric census. The separate development census is preserved; neither audit changes a score or gate in this memo.",'']
    report = ROOT/'reports/heldout-portfolio-evidence.md'
    report.parent.mkdir(parents=True,exist_ok=True)
    report.write_text('\n'.join(lines))
    for name in protected:
        assert A.sha(ROOT/name)==frozen['frozenCodeHashes'][name]
    print(json.dumps({'report':str(report.relative_to(ROOT)),'sixEnginePortfolio':fixed['portfolio'],
                      'sixEngineBootstrap':six_ci,'reportingOnly':True,'geometryRuns':0,'frozenCodeChanged':False}))


if __name__=='__main__':
    main()
