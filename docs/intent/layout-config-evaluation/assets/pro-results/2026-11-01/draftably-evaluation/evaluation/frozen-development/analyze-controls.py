#!/usr/bin/env python3
"""Analyze completed DEVELOPMENT control trials without executing a geometry algorithm.

Inputs are deliberately allow-listed; this program never opens heldout trial results.
Fixed-geometry route policies use only configurations observed on every one of the 24
fixtures. Partial interaction grids are reported separately and are never imputed.
"""
from __future__ import annotations

import argparse
import collections
import csv
import datetime
import functools
import gzip
import hashlib
import itertools
import json
import math
import pathlib
import statistics
import subprocess

ROOT = pathlib.Path(__file__).resolve().parents[1]
DATA = ROOT / 'data'
OUT = DATA / 'analysis'
SPEC = json.loads((ROOT / 'evaluation/settings-spec.json').read_text())
PROFILES = ('balanced', 'traceable', 'direct')
METRICS = ('hardDefects', 'layoutHardDefects', 'routingHardDefects', 'requiredIntentFailures',
           'blockedRoutes', 'overlaps', 'throughNodes', 'authoredSideViolations', 'pinScopeViolations',
           'crossings', 'sharedLength', 'laneDeficit', 'bends', 'tinyJogs', 'hooks', 'backEdges',
           'routeLength', 'detourMean', 'labelDefects', 'titleTextHits', 'titleBandHits',
           'area', 'aspectError', 'diPer10')
ROUTE_DEFAULTS = {s['key']: s['default'] for s in SPEC['routing_parameters']}
INPUTS = ('settings-routing', 'interactions-routing', 'settings-layout', 'interactions-layout', 'settings-warm')
TOL = 1.0
EPS = 1e-7


def key(value):
    return json.dumps(value, sort_keys=True, separators=(',', ':'), ensure_ascii=False)


def mean(values):
    values = [v for v in values if v is not None and math.isfinite(v)]
    return statistics.mean(values) if values else None


def valid(row):
    return row.get('status') == 'ok' and bool(row.get('metrics', {}).get('hardValid')) and not row.get('metrics', {}).get('requiredIntentFailures', 0)


def score(row, profile='balanced'):
    return row.get('metrics', {}).get('weightingScores', {}).get(profile, math.inf)


def rank(row, profile='balanced'):
    return (not valid(row), row.get('metrics', {}).get('hardDefects', 1e9), score(row, profile),
            row.get('metrics', {}).get('routeLength', math.inf), row['id'])


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def write_json(name, value):
    (OUT / name).write_text(json.dumps(value, indent=2, allow_nan=False) + '\n')


def write_csv(name, rows):
    if not rows:
        (OUT / name).write_text('')
        return
    fields = list(dict.fromkeys(k for row in rows for k in row))
    with (OUT / name).open('w', newline='') as f:
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        w.writerows({k: key(v) if isinstance(v, (dict, list, tuple)) else v for k, v in r.items()} for r in rows)


def load_completed(name):
    path = DATA / (name + '.jsonl')
    tasks_path = ROOT / 'evaluation/tasks' / (name + '.json')
    if not path.exists():
        return [], {}, {'name': name, 'state': 'not present'}
    tasks = json.loads(tasks_path.read_text())
    taskmap = {t['id']: t for t in tasks}
    text = path.read_text()
    rows = []
    partial = False
    for i, line in enumerate(text.splitlines()):
        if not line.strip():
            continue
        try:
            row = json.loads(line)
        except json.JSONDecodeError:
            if i == len(text.splitlines()) - 1:
                partial = True
                break
            raise
        if row.get('split') != 'development':
            raise ValueError(f'Refusing non-development row {row.get("id")}')
        if row['id'] not in taskmap:
            raise ValueError(f'Unexpected trial id {row["id"]}')
        rows.append(row)
    attempts = collections.defaultdict(list)
    for row in rows:
        attempts[row['id']].append(row)
    canonical_rows = [rs[0] for rs in attempts.values()]
    complete = len(canonical_rows) == len(tasks) and not partial
    info = {'name': name, 'state': 'complete' if complete else 'incomplete; excluded from analysis',
            'observed_rows': len(canonical_rows), 'attempt_rows': len(rows), 'expected_rows': len(tasks), 'file_sha256': digest(path),
            'task_sha256': digest(tasks_path), 'status_counts': dict(collections.Counter(r['status'] for r in canonical_rows)),
            'all_attempt_status_counts': dict(collections.Counter(r['status'] for r in rows)),
            'retry_policy': 'FIRST terminal row is the canonical outcome for one distinct trial. Later accidental attempts cannot improve coverage or policy selection. Every attempt remains in original JSONL and is enumerated here. Canonical success archives are verified against the first row hash before analysis.',
            'retries': {ident: [{'status': r['status'], 'error': r.get('error'), 'geometry': r.get('geometry'), 'geometry_hash': r.get('geometryHash')} for r in rs] for ident, rs in attempts.items() if len(rs) > 1}}
    return (canonical_rows if complete else []), taskmap, info


@functools.lru_cache(maxsize=1200)
def geometry(relative):
    return json.loads(gzip.decompress((ROOT / relative).read_bytes()))


def geometry_equal(a, b, tol=TOL):
    """Same convention as metrics.mjs geometryEquivalent, not a rounding-bin proxy."""
    if a.get('status') != 'ok' or b.get('status') != 'ok':
        return False
    if a.get('geometryHash') == b.get('geometryHash'):
        return True
    ga, gb = geometry(a['geometry']), geometry(b['geometry'])
    an, bn = ga['doc']['layout']['nodes'], gb['doc']['layout']['nodes']
    if set(an) != set(bn):
        return False
    for ident, r in an.items():
        if any(abs(r[k] - bn[ident][k]) > tol for k in ('x', 'y', 'w', 'h')):
            return False
    ar, br = ga['routes'], {r['id']: r for r in gb['routes']}
    if len(ar) != len(br):
        return False
    for r in ar:
        s = br.get(r['id'])
        if not s or r['fromSide'] != s['fromSide'] or r['toSide'] != s['toSide'] or len(r['points']) != len(s['points']):
            return False
        if any(math.hypot(p['x'] - q['x'], p['y'] - q['y']) > tol for p, q in zip(r['points'], s['points'])):
            return False
    return True


@functools.lru_cache(maxsize=5000)
def appearance_signature(relative):
    return key([(r['id'], r.get('path'), r.get('halo')) for r in sorted(geometry(relative)['routes'], key=lambda r: r['id'])])


def port_changes(a, b):
    if a.get('status') != 'ok' or b.get('status') != 'ok':
        return None
    ar = {r['id']: r for r in geometry(a['geometry'])['routes']}
    br = {r['id']: r for r in geometry(b['geometry'])['routes']}
    return sum((ar[i]['fromSide'], ar[i]['toSide']) != (br[i]['fromSide'], br[i]['toSide']) for i in ar.keys() & br.keys())


def node_delta(a, b):
    if a.get('status') != 'ok' or b.get('status') != 'ok':
        return None
    an = geometry(a['geometry'])['doc']['layout']['nodes']
    bn = geometry(b['geometry'])['doc']['layout']['nodes']
    if set(an) != set(bn):
        return None
    return max((abs(an[i][k] - bn[i][k]) for i in an for k in ('x', 'y', 'w', 'h')), default=0)


def paired(candidate, baseline, control, level, stratum):
    ok = candidate.get('status') == baseline.get('status') == 'ok'
    out = {'stratum': stratum, 'control': control, 'level': level, 'case_id': candidate['caseId'],
           'family': candidate['family'], 'trial_id': candidate['id'], 'baseline_id': baseline['id'],
           'status': candidate['status'], 'baseline_status': baseline['status'],
           'hard_valid': valid(candidate), 'baseline_hard_valid': valid(baseline),
           'valid_gained': valid(candidate) and not valid(baseline),
           'valid_lost': not valid(candidate) and valid(baseline),
           'exact_geometry_changed': (candidate.get('geometryHash') != baseline.get('geometryHash')) if ok else None,
           'geometry_changed_over_1px': not geometry_equal(candidate, baseline) if ok else None,
           'rounded_bin_hash_changed': candidate.get('geometryBin1pxHash') != baseline.get('geometryBin1pxHash') if ok else None,
           'rendered_path_changed': appearance_signature(candidate['geometry']) != appearance_signature(baseline['geometry']) if ok else None,
           'changed_port_pair_count': port_changes(candidate, baseline),
           'max_node_box_coordinate_delta': node_delta(candidate, baseline),
           'routing_ms': candidate.get('timing', {}).get('routingMs'),
           'baseline_routing_ms': baseline.get('timing', {}).get('routingMs')}
    for name in METRICS:
        a, b = candidate.get('metrics', {}).get(name), baseline.get('metrics', {}).get(name)
        out['delta_' + name] = (a - b) if isinstance(a, (int, float)) and isinstance(b, (int, float)) else None
    for profile in PROFILES:
        out['delta_score_' + profile] = score(candidate, profile) - score(baseline, profile) if ok else None
    for name in ('changedSides', 'changedSideRate', 'changedRoutes', 'changedRouteRate', 'meanDisplacement', 'translationAdjustedMean', 'orderFlipRate'):
        a, b = candidate.get('metrics', {}).get('edit', {}).get(name), baseline.get('metrics', {}).get('edit', {}).get(name)
        out['candidate_edit_' + name] = a
        out['baseline_edit_' + name] = b
        out['delta_edit_' + name] = (a - b) if isinstance(a, (int, float)) and isinstance(b, (int, float)) else None
    return out


def default_level(spec):
    if spec.get('key') == 'rootId':
        return '$automatic'
    if spec.get('key') == 'scope':
        return 'all'
    return spec['default']


def summarize_controls(rows, specs, stratum, shared_baselines=None):
    summaries, comparisons = [], []
    for spec in specs:
        control = spec.get('key', spec.get('attr'))
        subset = [r for r in rows if r.get('control') == control]
        if not subset:
            continue
        bycase = collections.defaultdict(list)
        for r in subset:
            bycase[r['caseId']].append(r)
        pairs, cases, candidate_groups = [], [], {}
        default = default_level(spec)
        for cid, rs in sorted(bycase.items()):
            base = (shared_baselines or {}).get(cid) or next((r for r in rs if key(r.get('level')) == key(default)), None)
            if base is None:
                raise ValueError(f'Missing default {stratum} {control} {cid} {default}')
            candidates = [base] + [r for r in rs if r['id'] != base['id']]
            candidate_groups[cid] = {'default': base, 'levels': {key(default if r['id'] == base['id'] else r.get('level')): r for r in candidates}}
            for r in candidates:
                if r['id'] == base['id']:
                    continue
                pairs.append(paired(r, base, control, r.get('level'), stratum))
            ok = [r for r in candidates if r.get('status') == 'ok']
            reps = []
            for r in ok:
                if not any(geometry_equal(r, q) for q in reps):
                    reps.append(r)
            best = min(candidates, key=lambda r: (*rank(r)[:-1], r['id'] != base['id'], r['id']))
            any_valid = any(valid(r) for r in candidates)
            case = {'case_id': cid, 'family': base['family'], 'baseline_id': base['id'],
                    'baseline_valid': valid(base), 'any_level_valid': any_valid,
                    'any_level_invalid': any(not valid(r) for r in candidates),
                    'exact_unique_geometries': len({r['geometryHash'] for r in ok}),
                    'representative_geometries_1px': len(reps),
                    'best_balanced_trial': best['id'], 'best_balanced_level': default if best['id'] == base['id'] else best.get('level'),
                    'best_balanced_valid': valid(best),
                    'best_balanced_gain': score(base) - score(best) if valid(base) and valid(best) else None}
            for profile in PROFILES:
                winner = min(candidates, key=lambda r: (*rank(r, profile)[:-1], r['id'] != base['id'], r['id']))
                case['best_' + profile + '_id'] = winner['id']
                case['best_' + profile + '_gain'] = score(base, profile) - score(winner, profile) if valid(base) and valid(winner) else None
            cases.append(case)
        comparisons.extend(pairs)
        level_summary = []
        for lk in sorted({key(p['level']) for p in pairs}):
            ps = [p for p in pairs if key(p['level']) == lk]
            level_summary.append({'level': json.loads(lk), 'paired_cases': len(ps),
                'exact_geometry_changes': sum(p['exact_geometry_changed'] is True for p in ps),
                'geometry_changes_over_1px': sum(p['geometry_changed_over_1px'] is True for p in ps),
                'rendered_path_changes': sum(p['rendered_path_changed'] is True for p in ps),
                'port_pair_change_cases': sum(bool(p['changed_port_pair_count']) for p in ps),
                'valid_gained': sum(p['valid_gained'] for p in ps), 'valid_lost': sum(p['valid_lost'] for p in ps),
                'mean_balanced_delta_on_both_valid': mean([p['delta_score_balanced'] for p in ps if p['hard_valid'] and p['baseline_hard_valid']]),
                'mean_route_length_delta': mean([p['delta_routeLength'] for p in ps]),
                'median_single_run_routing_ms': statistics.median([p['routing_ms'] for p in ps if p['routing_ms'] is not None]) if any(p['routing_ms'] is not None for p in ps) else None})
        useful = [p for p in pairs if p['valid_gained'] or (p['hard_valid'] and p['baseline_hard_valid'] and (p['delta_score_balanced'] or 0) < -1 - EPS)]
        adverse = [p for p in pairs if p['valid_lost'] or (p['hard_valid'] and p['baseline_hard_valid'] and (p['delta_score_balanced'] or 0) > 1 + EPS)]
        useful.sort(key=lambda p: (not p['valid_gained'], p['delta_score_balanced'] if p['delta_score_balanced'] is not None else math.inf, p['trial_id']))
        adverse.sort(key=lambda p: (not p['valid_lost'], -(p['delta_score_balanced'] or 0), p['trial_id']))
        global_levels = []
        for value in spec.get('levels', []):
            observed = [cg['levels'].get(key(value)) for cg in candidate_groups.values()]
            if any(r is None for r in observed):
                continue
            mutual = [(r, candidate_groups[r['caseId']]['default']) for r in observed if valid(r) and valid(candidate_groups[r['caseId']]['default'])]
            global_levels.append({'level': value, 'cases': len(observed), 'hard_valid_cases': sum(valid(r) for r in observed),
                'mean_balanced_on_valid': mean(score(r) for r in observed if valid(r)),
                'new_hard_invalid_vs_default': sum(not valid(r) and valid(candidate_groups[r['caseId']]['default']) for r in observed),
                'valid_gained_vs_default': sum(valid(r) and not valid(candidate_groups[r['caseId']]['default']) for r in observed),
                'mean_balanced_gain_on_mutually_valid': mean(score(b) - score(r) for r, b in mutual),
                'paired_valid_cases': len(mutual)})
        global_best = min(global_levels, key=lambda g: (-g['hard_valid_cases'], g['mean_balanced_on_valid'] if g['mean_balanced_on_valid'] is not None else math.inf, key(g['level']) != key(default), key(g['level']))) if global_levels else None
        semantic_control = control in ('scope', 'fixedIds', 'respectManual', 'direction', 'fit', 'rootId')
        summary = {'stratum': stratum, 'control': control, 'source_attribute': spec.get('attr'),
                   'default': default, 'tested_levels': spec.get('levels', []) + spec.get('categorical_coverage', []),
                   'case_count': len(cases), 'families': sorted({c['family'] for c in cases}),
                   'actual_rows': len(subset), 'shared_default_rows': len(cases) if shared_baselines else 0,
                   'paired_alternatives': len(pairs), 'baseline_valid_cases': sum(c['baseline_valid'] for c in cases),
                   'paired_successful_alternatives': sum(p['exact_geometry_changed'] is not None for p in pairs),
                   'cases_with_comparable_geometry': len({p['case_id'] for p in pairs if p['exact_geometry_changed'] is not None}),
                   'unavailable_geometry_pairs': sum(p['exact_geometry_changed'] is None for p in pairs),
                   'any_level_valid_cases': sum(c['any_level_valid'] for c in cases),
                   'valid_cases_gained_by_local_oracle': sum(not c['baseline_valid'] and c['any_level_valid'] for c in cases),
                   'baseline_valid_cases_with_adverse_level': sum(c['baseline_valid'] and c['any_level_invalid'] for c in cases),
                   'cases_with_exact_change': len({p['case_id'] for p in pairs if p['exact_geometry_changed']}),
                   'cases_with_over_1px_change': len({p['case_id'] for p in pairs if p['geometry_changed_over_1px']}),
                   'cases_with_rendered_path_change': len({p['case_id'] for p in pairs if p['rendered_path_changed']}),
                   'cases_with_port_pair_change': len({p['case_id'] for p in pairs if p['changed_port_pair_count']}),
                   'cases_with_material_balanced_gain': sum((c['best_balanced_gain'] or 0) > 1 + EPS for c in cases),
                   'mean_local_oracle_balanced_gain_on_both_valid': mean(c['best_balanced_gain'] for c in cases),
                   'exact_unique_geometry_count_sum': sum(c['exact_unique_geometries'] for c in cases),
                   'one_px_representative_count_sum': sum(c['representative_geometries_1px'] for c in cases),
                   'good_witnesses': [p['trial_id'] for p in useful[:3]], 'adverse_witnesses': [p['trial_id'] for p in adverse[:3]],
                   'bounded_global_level_retuning': {'training_budget': len(global_levels), 'levels': global_levels, 'selected': None if semantic_control else global_best,
                       'semantic_choice_excluded_from_automatic_ranking': semantic_control,
                       'rule': 'Descriptive balanced-objective retuning only: one common level for every case; maximize hard-valid count, then minimize mean balanced score on valid cases; default wins exact ties. Use the predeclared core levels only, excluding extra categorical coverage from this comparable-budget selection. Distinct requested scope, protection, direction, format and root choices are not ranked as interchangeable jobs. This is retuning the same control, not proof that removing it can be compensated by another control.'},
                   'levels': level_summary, 'cases': cases,
                   'interpretation': 'Local oracle chooses one tested level independently for each fixture; it is an upper bound, not a global preset or selector.'}
        summaries.append(summary)
    return summaries, comparisons


def analyze_interactions(rows, specs, stratum):
    summaries, comparisons = [], []
    defaults = {s['key']: s['default'] for s in SPEC['routing_parameters'] + SPEC['source_engine_parameters']}
    for spec in specs:
        factors = spec if isinstance(spec, list) else spec['keys']
        a, b = factors
        control = a + '*' + b
        subset = [r for r in rows if r.get('control') == control]
        if not subset:
            continue
        bycase = collections.defaultdict(list)
        for r in subset:
            bycase[r['caseId']].append(r)
        case_results = []
        conditional = {a: set(), b: set()}
        interaction_witnesses = []
        for cid, rs in sorted(bycase.items()):
            grid = {(key(r['level'][0]), key(r['level'][1])): r for r in rs}
            a0, b0 = key(defaults[a]), key(defaults[b])
            baseline = grid[(a0, b0)]
            for r in rs:
                if r['id'] != baseline['id']:
                    comparisons.append(paired(r, baseline, control, r['level'], stratum))
            levels_a = sorted({x[0] for x in grid})
            levels_b = sorted({x[1] for x in grid})
            single = [r for (x, y), r in grid.items() if x == a0 or y == b0]
            best_single = min(single, key=rank)
            best_grid = min(rs, key=rank)
            for x in levels_a:
                if x == a0:
                    continue
                base_effect = not geometry_equal(grid[(x, b0)], grid[(a0, b0)])
                if not base_effect and any(not geometry_equal(grid[(x, y)], grid[(a0, y)]) for y in levels_b if y != b0):
                    conditional[a].add(cid)
            for y in levels_b:
                if y == b0:
                    continue
                base_effect = not geometry_equal(grid[(a0, y)], grid[(a0, b0)])
                if not base_effect and any(not geometry_equal(grid[(x, y)], grid[(x, b0)]) for x in levels_a if x != a0):
                    conditional[b].add(cid)
            residuals = []
            for (x, y), r in grid.items():
                if x == a0 or y == b0:
                    continue
                ax, by = grid[(x, b0)], grid[(a0, y)]
                if all(valid(q) for q in (r, ax, by, baseline)):
                    residuals.append({'trial_id': r['id'], 'balanced_second_difference': score(r) - score(ax) - score(by) + score(baseline)})
            gain = score(best_single) - score(best_grid) if valid(best_single) and valid(best_grid) else None
            gained = valid(best_grid) and not valid(best_single)
            if gained or (gain or 0) > 1 + EPS:
                interaction_witnesses.append(best_grid['id'])
            case_results.append({'case_id': cid, 'family': baseline['family'], 'baseline_id': baseline['id'],
                'rows': len(rs), 'default_valid': valid(baseline), 'single_axis_best_id': best_single['id'],
                'grid_best_id': best_grid['id'], 'single_axis_valid': valid(best_single), 'grid_valid': valid(best_grid),
                'joint_only_valid_gain': gained, 'balanced_gain_over_single_axis': gain,
                'numeric_second_differences': residuals,
                'adverse_hard_trial_ids': [r['id'] for r in rs if valid(baseline) and not valid(r)]})
        summaries.append({'stratum': stratum, 'interaction': control, 'factors': factors,
            'fixture_count': len(case_results), 'actual_rows': len(subset),
            'families': sorted({c['family'] for c in case_results}),
            'conditional_only_geometry_cases': {k: sorted(v) for k, v in conditional.items()},
            'joint_only_valid_gain_cases': sum(c['joint_only_valid_gain'] for c in case_results),
            'material_balanced_gain_beyond_single_axis_cases': sum((c['balanced_gain_over_single_axis'] or 0) > 1 + EPS for c in case_results),
            'combination_witnesses': interaction_witnesses, 'cases': case_results,
            'coverage_note': 'These partial grids have their own fixed fixture subset and context. Do not impute untested fixtures or rank a partial policy as if it covered all 24 routing fixtures.'})
    return summaries, comparisons


def route_policy_analysis(rows, gridrows, tasks):
    candidates = collections.defaultdict(dict)
    full_rows = [r for r in rows if r['stage'] == 'D-routing']
    cases = sorted({r['caseId'] for r in full_rows})
    family = {r['caseId']: r['family'] for r in full_rows}
    for r in full_rows:
        patch = {k: v for k, v in r['routingSettings'].items() if v != ROUTE_DEFAULTS[k]}
        candidates[key(patch)][r['caseId']] = r
    partial = collections.defaultdict(dict)
    for r in gridrows:
        task = tasks[r['id']]
        if task.get('history') or task.get('patchDoc'):
            continue
        patch = {k: v for k, v in r['routingSettings'].items() if v != ROUTE_DEFAULTS[k]}
        ident = key(patch)
        if ident not in candidates:
            partial[ident][r['caseId']] = r
    pool = []
    for ident, bycase in sorted(candidates.items(), key=lambda kv: (len(json.loads(kv[0])), kv[0])):
        if set(bycase) != set(cases):
            raise ValueError('A global routing candidate lacks complete coverage')
        patch = json.loads(ident)
        slug = 'default' if not patch else '-'.join(k + '-' + str(v) for k, v in patch.items())
        pool.append({'id': slug, 'patch': patch, 'routing': {**ROUTE_DEFAULTS, **patch}, 'rows': bycase})
    oracles = {(cid, p): min([c['rows'][cid] for c in pool], key=lambda r: rank(r, p)) for cid in cases for p in PROFILES}

    def acceptable(r, oracle, profile, band=1.0):
        if not valid(r) or not valid(oracle):
            return False
        m, o = r['metrics'], oracle['metrics']
        return (score(r, profile) <= score(oracle, profile) + band + EPS
                and m['area'] <= o['area'] * (1 + .1 * band) + EPS
                and m['routeLength'] <= o['routeLength'] * (1 + .1 * band) + EPS)

    # Bit masks and precomputed regret arrays make exact three-policy search inexpensive.
    oracle_valid_cases = {cid for cid in cases if valid(oracles[(cid, 'balanced')])}
    arrays = []
    for c in pool:
        masks = {}
        for band in (.5, 1.0, 2.0):
            mask = 0
            for i, (cid, p_current) in enumerate(itertools.product(cases, PROFILES)):
                if acceptable(c['rows'][cid], oracles[(cid, p_current)], p_current, band):
                    mask |= 1 << i
            masks[band] = mask
        vm = sum(1 << i for i, cid in enumerate(cases) if valid(c['rows'][cid]))
        regrets = []
        for cid, p in itertools.product(cases, PROFILES):
            r, oracle = c['rows'][cid], oracles[(cid, p)]
            regrets.append(max(0.0, score(r, p) - score(oracle, p)) if valid(r) and valid(oracle) else None)
        arrays.append({'valid_mask': vm, 'masks': masks, 'regrets': regrets})
    def stats(indices):
        vm = 0
        masks = {b: 0 for b in (.5, 1.0, 2.0)}
        for i in indices:
            vm |= arrays[i]['valid_mask']
            for b in masks:
                masks[b] |= arrays[i]['masks'][b]
        regrets = []
        for j in range(len(cases) * len(PROFILES)):
            observed = [arrays[i]['regrets'][j] for i in indices if arrays[i]['regrets'][j] is not None]
            regrets.append(min(observed) if observed else None)
        family_values = collections.defaultdict(list)
        for (cid, _), value in zip(itertools.product(cases, PROFILES), regrets):
            if value is not None:
                family_values[family[cid]].append(value)
        family_means = {f: mean(values) for f, values in family_values.items()}
        family_regret = mean(family_means.values())
        fixture_regret = mean(regrets)
        cover_by_profile = {p: sum(bool(masks[1.0] & (1 << (i * len(PROFILES) + j))) for i, _ in enumerate(cases)) for j, p in enumerate(PROFILES)}
        return {'valid_case_coverage': vm.bit_count(), 'acceptable_case_profile_coverage': masks[1.0].bit_count(),
            'acceptable_by_profile': cover_by_profile,
            'coverage_half_bands': masks[.5].bit_count(), 'coverage_double_bands': masks[2.0].bit_count(),
            'equal_fixture_mean_oracle_regret': fixture_regret, 'equal_family_mean_oracle_regret': family_regret,
            'family_mean_oracle_regret': family_means,
            'worst_family_mean_oracle_regret': max(family_means.values(), default=None),
            'max_case_profile_oracle_regret': max((v for v in regrets if v is not None), default=None),
            'regret_case_profile_count': sum(v is not None for v in regrets),
            'regret_note': 'Mean and maximum soft regret include only oracle-valid case×profiles covered by at least one valid policy. Hard failures remain separate coverage losses; no arbitrary numeric failure penalty is inserted.',
            'uncovered_oracle_valid_cases': [cid for i, cid in enumerate(cases) if cid in oracle_valid_cases and not vm & (1 << i)]}

    cache = {}

    def search(allowed, size, family_weight=False):
        cachekey = (tuple(allowed), size, family_weight)
        if cachekey in cache:
            return cache[cachekey]
        best = None
        for indices in itertools.combinations(allowed, size):
            st = stats(indices)
            order = (-st['valid_case_coverage'], -st['acceptable_case_profile_coverage'],
                     st['equal_family_mean_oracle_regret'] if family_weight else st['equal_fixture_mean_oracle_regret'],
                     st['max_case_profile_oracle_regret'], sum(len(pool[i]['patch']) for i in indices), tuple(pool[i]['id'] for i in indices))
            if best is None or order < best[0]:
                best = (order, indices, st)
        cache[cachekey] = best
        return best

    all_indices = tuple(range(len(pool)))
    curve = []
    for size in (1, 2, 3):
        _, indices, st = search(all_indices, size)
        curve.append({'size': size, 'policy_ids': [pool[i]['id'] for i in indices], **st})
    _, selected, selection_stats = search(all_indices, 3)
    _, family_selected, family_stats = search(all_indices, 3, True)
    single_rankings = []
    for i, c in enumerate(pool):
        st = stats((i,))
        single_rankings.append({'policy_id': c['id'], 'patch': c['patch'], **st,
            'mean_balanced_on_valid': mean(score(r) for r in c['rows'].values() if valid(r)),
            'mean_traceable_on_valid': mean(score(r, 'traceable') for r in c['rows'].values() if valid(r)),
            'mean_direct_on_valid': mean(score(r, 'direct') for r in c['rows'].values() if valid(r)),
            'valid_gained_vs_default': sum(valid(c['rows'][cid]) and not valid(pool[0]['rows'][cid]) for cid in cases),
            'valid_lost_vs_default': sum(not valid(c['rows'][cid]) and valid(pool[0]['rows'][cid]) for cid in cases)})
    single_rankings.sort(key=lambda c: (-c['valid_case_coverage'], -c['acceptable_case_profile_coverage'], c['equal_fixture_mean_oracle_regret'], len(c['patch']), c['policy_id']))
    ablations = []
    allpool_stats = stats(all_indices)
    for control in ROUTE_DEFAULTS:
        allowed = tuple(i for i, c in enumerate(pool) if control not in c['patch'])
        fixed = tuple(dict.fromkeys(i if i in allowed else 0 for i in selected))
        full_without = stats(allowed)
        fixed_stats = stats(fixed)
        _, replacement, retuned_stats = search(allowed, 3)
        lost = []
        for cid in cases:
            for p in PROFILES:
                oracle = oracles[(cid, p)]
                if valid(oracle) and not any(acceptable(pool[i]['rows'][cid], oracle, p) for i in allowed):
                    lost.append({'case_id': cid, 'profile': p, 'full_pool_oracle_trial_id': oracle['id'],
                                 'replacement_best_trial_id': min([pool[i]['rows'][cid] for i in allowed], key=lambda r: rank(r, p))['id']})
        ablations.append({'control': control, 'candidate_budget_before': 3, 'candidate_budget_after_retuning': 3,
            'available_configs_without_control': len(allowed), 'fixed_replacement_policy_ids': [pool[i]['id'] for i in fixed],
            'fixed_replacement': fixed_stats, 'retuned_policy_ids': [pool[i]['id'] for i in replacement], 'retuned': retuned_stats,
            'full_pool_without_control': full_without,
            'fixed_acceptable_loss': selection_stats['acceptable_case_profile_coverage'] - fixed_stats['acceptable_case_profile_coverage'],
            'retuned_acceptable_loss': selection_stats['acceptable_case_profile_coverage'] - retuned_stats['acceptable_case_profile_coverage'],
            'pool_acceptable_loss': allpool_stats['acceptable_case_profile_coverage'] - full_without['acceptable_case_profile_coverage'],
            'pool_loss_witnesses': lost})
    proposal = {'status': 'DEVELOPMENT PROPOSAL ONLY; not sealed; no heldout results read',
        'selection_rule': 'Exhaustive size-three portfolio over fully observed default and single-control settings. Maximize union hard-valid fixtures, then practical acceptable case×weighting coverage, then minimize equal-fixture mean oracle regret, worst regret and number of changed fields. Defaults break equivalent-cost ties when fewer altered fields suffice.',
        'scope': 'Oracle choice among three numeric route policies on fixed positions; this is not an automatic route-policy selector or evidence that a user chooses the oracle.',
        'fixture_count': len(cases), 'weightings': list(PROFILES), 'case_profile_denominator': len(cases) * len(PROFILES),
        'oracle_valid_fixtures': len(oracle_valid_cases), 'fully_observed_policy_count': len(pool),
        'policies': [{'policy_id': pool[i]['id'], 'patch': pool[i]['patch'], 'routing': pool[i]['routing'],
            'individual_stats': stats((i,)),
            'individual_valid_gained_vs_defaults': sum(valid(pool[i]['rows'][cid]) and not valid(pool[0]['rows'][cid]) for cid in cases),
            'individual_valid_lost_vs_defaults': sum(not valid(pool[i]['rows'][cid]) and valid(pool[0]['rows'][cid]) for cid in cases),
            'marginal_acceptable_case_profiles_in_three_policy_set': selection_stats['acceptable_case_profile_coverage'] - stats(tuple(j for j in selected if j != i))['acceptable_case_profile_coverage']}
            for i in selected],
        'selection_stats': selection_stats, 'all_pool_stats': allpool_stats, 'size_curve': curve,
        'family_weight_sensitivity': {'policy_ids': [pool[i]['id'] for i in family_selected], **family_stats},
        'partial_grid_policy_count_excluded': len(partial),
        'partial_grid_policies': [{'patch': json.loads(k), 'observed_fixture_count': len(v), 'observed_fixture_ids': sorted(v)} for k, v in sorted(partial.items())],
        'limitations': ['No imputation of partial grids.', 'Rounded-corner appearance is not quality-ranked by polyline metrics.',
            'Two alternative values plus one shared baseline per public scalar; no claim of continuous optimum.',
            'Single-run timing is descriptive only; use repeated timing stage for speed conclusions.',
            'Within-1px comparisons preserve route point sequence and side identity; no rounding-bin equivalence claim.',
            'All 24 fixed routing fixtures are development probes, not the 24 heldout diagrams.']}
    return proposal, single_rankings, ablations


def analyze_ports(rows):
    auto = {r['caseId']: r for r in rows if r.get('tag') == 'automatic-ports'}
    authored = {r['caseId']: r for r in rows if r.get('tag') == 'authored-ports'}
    explicit = collections.defaultdict(list)
    for r in rows:
        if r.get('tag') == 'explicit-side-grid':
            explicit[r['caseId']].append(r)
    full = collections.defaultdict(list)
    for r in rows:
        if r['stage'] == 'D-routing':
            full[r['caseId']].append(r)
    comparisons = []
    for cid, a in sorted(auto.items()):
        rs = explicit.get(cid, [])
        source_edges = geometry(full[cid][0]['geometry'])['doc']['layout']['edges']
        fixed_in_source = any(c.get('fromSide') not in (None, 'auto') or c.get('toSide') not in (None, 'auto') for c in source_edges.values())
        automatic_pool = [a] if fixed_in_source else full[cid] + [a]
        best_auto = min(automatic_pool, key=rank)
        b = min(rs, key=rank) if rs else authored[cid]
        comparisons.append({'case_id': cid, 'automatic_default_id': a['id'], 'authored_id': authored[cid]['id'],
            'automatic_default_valid': valid(a), 'authored_valid': valid(authored[cid]),
            'explicit_authored_side_violations': authored[cid]['metrics']['authoredSideViolations'],
            'exhaustive_side_pair_count': len(rs), 'best_side_pair_id': b['id'], 'best_side_pair_valid': valid(b),
            'best_tested_automatic_id': best_auto['id'], 'best_tested_automatic_valid': valid(best_auto),
            'automatic_numeric_configs_compared': 1 if fixed_in_source else len(full[cid]),
            'declared_source_had_fixed_sides': fixed_in_source,
            'balanced_gain_vs_best_tested_automatic': score(best_auto) - score(b) if valid(best_auto) and valid(b) else None,
            'explicit_only_valid': valid(b) and not valid(best_auto),
            'tested_automatic_scope_note': 'Best automatic result uses the 25 fully observed numeric configurations only when their input has no fixed side. Otherwise it uses the released-sides default run alone; no missing released-sides parameter results are imputed.'})
    return comparisons


def enrich_inventory(summaries, ablations, interactions):
    """Add measured evidence without promoting a UI proposal to a tested conclusion."""
    rows = json.loads((ROOT / 'inventory-source.json').read_text())
    abmap = {r['control']: r for r in ablations}
    bycontrol = collections.defaultdict(list)
    for s in summaries:
        bycontrol[s['control']].append(s)
    aliases = {'LAY-FIT': 'fit', 'LAY-RECIPE-GAP': 'gap', 'LAY-MIN-WIDTH': 'min-width', 'LAY-MIN-HEIGHT': 'min-height',
               'UI-SCOPE': 'scope', 'UI-MAX-ITERATIONS': 'maxIterations', 'UI-FIXED-IDS': 'fixedIds'}
    for row in rows:
        control = row.get('setting_key', aliases.get(row['recommendation_id']))
        evidence = bycontrol.get(control, [])
        if row['category'] not in ('layout-setting', 'routing-setting', 'recipe-setting', 'runtime-or-ui-control') or not evidence:
            continue
        evidence = [s for s in evidence if (row['category'] == 'routing-setting') == s['stratum'].startswith('routing')]
        if not evidence:
            continue
        row['measured_control_evidence'] = [{k: v for k, v in s.items() if k not in ('cases', 'levels')} for s in evidence]
        row['measured_interactions'] = [{k: v for k, v in s.items() if k != 'cases'} for s in interactions if control in s['factors']]
        if row['category'] == 'routing-setting':
            row['measured_routing_ablation'] = abmap[control]
        row['evidence_type'] = 'Source facts plus measured development sensitivity; Keep/Merge/Hide/Automate disposition remains a UI proposal until the final experiment decision.'
        row['witness_case'] = '; '.join(dict.fromkeys(w for s in evidence for w in s['good_witnesses'] + s['adverse_witnesses'])) or 'No material scalar quality witness in tested levels; inspect interaction, appearance and source conditions before removal.'
        row['marginal_gain_loss'] = '; '.join(f"{s['stratum']}: {s['cases_with_over_1px_change']}/{s['case_count']} cases change >1px; {s['valid_cases_gained_by_local_oracle']} validity gain(s); {s['baseline_valid_cases_with_adverse_level']} baseline-valid case(s) harmed by a tested level" for s in evidence)
        row['runtime_impact'] = 'Per-trial raw timing retained; no repeated-timing inference from scalar sweep.'
        row['uncertainty'] += ' Development fixture sensitivity is not user preference or universal inactivity proof.'
    (ROOT / 'inventory-control-evidence.json').write_text(json.dumps(rows, indent=2) + '\n')
    write_csv('control-inventory.csv', rows)


def narrative(routing, history, interactions, proposal, ports, coverage, layouts, warm):
    lines = ['# Configuration findings', '',
        '**Measured development results.** This report reads completed development files only. It runs no layout or routing algorithm and does not read heldout results. A nondefault value changing a drawing is sensitivity, not evidence that it improves the drawing. The routing policy below is a proposal for the later crossed experiment, not a shipped default.', '',
        '## Completed trial accounting', '',
        '| File | Read rows | Planned rows | Analysis state |', '| --- | ---: | ---: | --- |']
    for c in coverage:
        lines.append(f"| {c['name']} | {c.get('observed_rows', 0)} | {c.get('expected_rows', '—')} | {c['state']} |")
    lines += ['', 'The routing setting file contains 600 fixed-position scalar trials (24 shared defaults plus 12 × 2 × 24 alternatives), 144 history/edit trials, and 240 explicit-port trials. The six 3 × 3 interaction grids add 432 trials on eight predeclared fixtures each. These are correlated experimental runs, not independent users or 1,416 independent diagrams.', '',
        '## All twelve route controls', '',
        '“Changed” means at least one alternative differs from its same-fixture default by more than 1 px under the contract comparator: identical object IDs, side identities and route-point sequence lengths, coordinate checks on boxes, and Euclidean distance at corresponding route points. Exact hashes and rounded-bin hashes are retained separately in the raw comparison table. Rounded-bin equality is not treated as the tolerance test. Representative counts use deterministic default-first matching because tolerance is not mathematically transitive.', '',
        '| Control | Default | Alternatives | Changed / 24 | Port pair changed / 24 | Any valid gain | Default-valid fixture harmed by some level | Local oracle mean balanced gain* |',
        '| --- | ---: | --- | ---: | ---: | ---: | ---: | ---: |']
    for r in routing:
        levels = [x for x in r['tested_levels'] if key(x) != key(r['default'])]
        gain = r['mean_local_oracle_balanced_gain_on_both_valid']
        lines.append(f"| {r['control']} | {r['default']} | {', '.join(map(str, levels))} | {r['cases_with_over_1px_change']} | {r['cases_with_port_pair_change']} | {r['valid_cases_gained_by_local_oracle']} | {r['baseline_valid_cases_with_adverse_level']} | {gain:.3f} |" if gain is not None else f"| {r['control']} | {r['default']} | {levels} | {r['cases_with_over_1px_change']} | {r['cases_with_port_pair_change']} | {r['valid_cases_gained_by_local_oracle']} | {r['baseline_valid_cases_with_adverse_level']} | — |")
    lines += ['', '*The local oracle selects the best of the same three tested levels separately on each fixture, restricted to comparisons with valid default and valid winner. It is an upper bound; it is neither an implemented selector nor a global retuned policy. Level-by-level signed score, route length, crossing, bend, label and hard-defect changes are in `control-comparisons.csv`.', '',
        'The source inventory supplies allowed ranges and normalization: the source parser rejects invalid values, while the raw settings normalizers clamp numeric values and round integer effort. All tested levels are within those declared ranges. The row tables retain the requested level and the actual normalized `routingSettings` in original trial records. No range-clamping boundary experiment is claimed here.', '',
        '| Source attribute | Normalizer/source bounds | Default |', '| --- | --- | ---: |',
        '| clearance | 4–30 | 10 |', '| port-gap | 6–28 | 16 |', '| edge-gap | 4–48 | 16 |',
        '| bend-penalty | 0–100 | 32 |', '| crossing-penalty | 0–1200 | 360 |', '| shared-penalty | 0–20 | 8 |',
        '| parallel-penalty | 0–60 | 18 |', '| port-stability | 0–150 | 20 |', '| fanout-penalty | 0–160 | 50 |',
        '| passes | 1–5, integer rounded | 3 |', '| corner-radius | 0–16 | 6 |', '| standoff | 0–40 | 20 |', '',
        '### Appearance and hidden activity', '']
    corner = next(r for r in routing if r['control'] == 'cornerRadius')
    lines += [f"`cornerRadius` changes no measured polyline geometry on {corner['case_count']} fixtures, but changes the production SVG path strings on {corner['cases_with_rendered_path_change']}/{corner['case_count']}. That is measured rendering sensitivity, not a finding that square or rounded corners are preferred. Preserve it as Appearance, outside route optimization.", '',
        '`portStability` has two histories. The initial search can use explicit previous-route sides, while improvement passes call the search with their current route as `old`. The latter can activate the coefficient even when external history is empty (`routing-engine.js`, first pass near line 1231; repair call near line 1329). Therefore “no external history” does not imply “coefficient unused.”', '',
        '| History after same small edit | Cases | Changed over 1 px | Valid gains from tested levels |', '| --- | ---: | ---: | ---: |']
    for r in history:
        lines.append(f"| {r['stratum']} | {r['case_count']} | {r['cases_with_over_1px_change']} | {r['valid_cases_gained_by_local_oracle']} |")
    lines += ['', 'All shared-history candidates receive the same original route-side state. No candidate seeds the next candidate. Empty-history and shared-history outputs are compared within their own edited-input strata. A change in stability coefficient may trade route quality against fewer side changes; raw edit metrics preserve that distinction.', '',
        '## Interactions and conditional value', '',
        '| Interaction | Fixtures | Rows | Conditional-only cases by factor | Joint material gains beyond either one-factor change |',
        '| --- | ---: | ---: | --- | ---: |']
    for r in interactions:
        conditional = '; '.join(k + ': ' + str(len(v)) for k, v in r['conditional_only_geometry_cases'].items())
        lines.append(f"| {r['interaction']} | {r['fixture_count']} | {r['actual_rows']} | {conditional} | {r['material_balanced_gain_beyond_single_axis_cases']} |")
    lines += ['', 'A conditional-only count means one tested factor level tied its default within 1 px when the other factor was at default, but diverged when the other factor changed. It is sensitivity evidence, not automatically quality value. “Joint material gain” requires a valid result that improves balanced defect score by more than one per-ten-edge score unit beyond the best tested single-axis result on that same fixture. Numeric second differences and adverse combinations are preserved in `control-interactions.json`.', '',
        'The port-stability × crossing grid uses the edited geometry with shared external history; it is not pooled with unchanged, empty-history routing. Other grids cover only eight fixtures. Their unobserved sixteen fixture outcomes are never filled in, so partial combinations cannot become a global policy by missing-data advantage.', '',
        '## Three numeric routing policies for the crossed development stage', '',
        'Selection exhaustively searches all size-three portfolios among the 25 configurations observed on every fixed fixture: current defaults plus two alternatives for each of twelve controls. It first maximizes union hard-valid coverage, then practical acceptable case × weighting coverage, then minimizes mean oracle regret. Each case is checked under balanced, traceable and direct weights; a soft improvement cannot cover a hard failure. Choosing among the portfolio is an oracle upper bound, not an automatic runtime choice.', '',
        '| Policy | Exact changes from all current defaults |', '| --- | --- |']
    for p in proposal['policies']:
        lines.append(f"| {p['policy_id']} | {key(p['patch'])} |")
    st = proposal['selection_stats']
    lines += ['', f"The selected three cover {st['valid_case_coverage']}/{proposal['fixture_count']} fixtures with at least one hard-valid result and {st['acceptable_case_profile_coverage']}/{proposal['case_profile_denominator']} acceptable fixture–weighting combinations. The complete 25-configuration pool covers {proposal['all_pool_stats']['valid_case_coverage']}/{proposal['fixture_count']} hard-valid fixtures and {proposal['all_pool_stats']['acceptable_case_profile_coverage']}/{proposal['case_profile_denominator']} acceptable combinations. Unresolved fixtures remain failures. They are not removed from the denominator.", '',
        'The precise defaults, full twelve-number configuration for each proposal, size-one/two/three curve, family-weight sensitivity and half/double equivalence bands are in `routing-policy-proposal.json`. The proposal remains unsealed and must go through the crossed layout experiment and final selection procedure. Single-run routing milliseconds are descriptive only and should not be used as a latency ranking; repeated timing is a separate stage.', '',
        '### Leave-one-control-out result contract', '',
        '`control-routing-ablations.json` compares three views of each removed coefficient: (1) selected portfolio entries that use it are replaced by defaults without other retuning; (2) exhaustive retuning to three policies from the remaining fully observed settings, with the same three-policy budget; and (3) the complete tested pool with that control fixed to its default. Loss witnesses cite original trial IDs. A surviving replacement shows redundancy within this grid and objective, not that the implementation or authored override is universally useless. Appearance-only corner rounding and history conditions are preserved outside that narrow numerical quality claim.', '',
        '## Explicit ports', '',
        f"The file contains {len(ports)} default automatic-versus-authored pairs and {sum(bool(p['exhaustive_side_pair_count']) for p in ports)} exhaustive sixteen-side-pair fixtures. Each sixteen-pair grid varies the nominated single edge (e0), with all other sides automatic; it is not an exhaustive all-edge port assignment search. Authored side violations are checked as hard constraints. The best explicit side pair can be compared against the best tested numeric route result, but fixtures whose source already forces sides must not be called an unrestricted automatic optimum. Full rows and this restriction are in `control-port-overrides.json`.", '',
        '## Source and warm settings', '']
    if layouts or warm:
        lines += ['Completed source and warm strata are analyzed independently. Cold source ordering is not a proxy for warm ordering; source `fit` search is not the raw engine aspect target; protected objects and scope are invocation semantics.', '',
            '| Stratum | Control | Planned cases | Cases with comparable geometry | Changed over 1 px | Valid gain | Baseline-valid harmed |', '| --- | --- | ---: | ---: | ---: | ---: | ---: |']
        for r in layouts + warm:
            lines.append(f"| {r['stratum']} | {r['control']} | {r['case_count']} | {r['cases_with_comparable_geometry']} | {r['cases_with_over_1px_change']} | {r['valid_cases_gained_by_local_oracle']} | {r['baseline_valid_cases_with_adverse_level']} |")
    else:
        lines += ['Those stages were not complete at this analysis snapshot and are excluded. Rerunning the analyzer after completion adds them without changing trial data or reading heldout output.']
    lines += ['', '## Limits and reproducibility', '',
        'These fixed fixtures were built to exercise mechanisms and include deliberately difficult authored geometry. They do not estimate real-user frequencies. No significance claim is made from correlated scalar settings. Soft scores omit some appearance and typography judgments, so witness renders remain necessary. Inputs, hashes, counts, exact comparisons, per-level summaries, interaction details and selected configurations are downloadable alongside this text. The first terminal row is canonical for each distinct trial; later accidental attempts cannot improve coverage or selection. The manifest retains all attempt statuses, and every canonical successful archive is checked against that first row’s exact geometry hash before analysis.', '',
        'Replay: `python evaluation/analyze-controls.py` from the delivered bundle, or the corresponding path from its parent. The script only opens its five development input names and refuses rows marked heldout. It never invokes a product engine. Source defaults and ranges remain in `inventory-source.json` and `evaluation/settings-spec.json`; numeric outputs here are evidence annotations, not edits to the immutable product.']
    (ROOT / 'config-findings.md').write_text('\n'.join(lines) + '\n')


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    streams, taskmaps, coverage = {}, {}, []
    for name in INPUTS:
        rows, tasks, info = load_completed(name)
        streams[name], taskmaps[name] = rows, tasks
        coverage.append(info)
    successful = [r for rows in streams.values() for r in rows if r.get('status') == 'ok']
    requests = [{k: r[k] for k in ('id', 'geometry', 'geometryHash')} for r in successful]
    verification = json.loads(subprocess.run(['node', str(ROOT / 'evaluation/verify-control-archives.mjs')],
        input=json.dumps(requests), text=True, check=True, capture_output=True).stdout)
    write_json('control-archive-verification.json', verification)
    if verification['mismatches']:
        raise ValueError('Canonical geometry archive differs from first terminal row; see control-archive-verification.json. No later artifact is silently substituted.')
    route = streams['settings-routing']
    grids = streams['interactions-routing']
    if not route or not grids:
        raise RuntimeError('Complete routing settings and interactions are required before routing analysis')
    baseline = {r['caseId']: r for r in route if r.get('tag') == 'shared-baseline'}
    routing, comparisons = summarize_controls([r for r in route if r['stage'] == 'D-routing'], SPEC['routing_parameters'], 'routing-unedited-empty-history', baseline)
    history = []
    for tag in ('empty-prior', 'shared-prior'):
        s, p = summarize_controls([r for r in route if r.get('tag') == tag], [next(s for s in SPEC['routing_parameters'] if s['key'] == 'portStability')], 'routing-edited-' + tag)
        history += s
        comparisons += p
    history_inputs = []
    for tag in ('empty-prior', 'shared-prior'):
        bycase = collections.defaultdict(list)
        for r in route:
            if r.get('tag') == tag:
                bycase[r['caseId']].append(taskmaps['settings-routing'][r['id']])
        for cid, ts in sorted(bycase.items()):
            signatures = {key({k: t.get(k) for k in ('reference', 'patchDoc', 'history')}) for t in ts}
            if len(signatures) != 1:
                raise ValueError(f'History input mismatch {tag} {cid}')
            history_inputs.append({'case_id': cid, 'stratum': tag, 'candidate_count': len(ts),
                'identical_input_context': True, **json.loads(next(iter(signatures)))})
    if any(p['max_node_box_coordinate_delta'] not in (None, 0) for p in comparisons if p['stratum'].startswith('routing')):
        raise ValueError('A purported fixed-position route comparison moved a node or group')
    interactions, p = analyze_interactions(grids, SPEC['routing_interactions'], 'routing-interaction')
    comparisons += p
    layouts, warm = [], []
    if streams['settings-layout']:
        layouts, p = summarize_controls(streams['settings-layout'], SPEC['source_engine_parameters'] + SPEC['source_other_parameters'], 'source-cold')
        comparisons += p
    if streams['settings-warm']:
        warm, p = summarize_controls([r for r in streams['settings-warm'] if r['stage'] == 'D-warm'], SPEC['warm_layout_parameters'], 'raw-warm')
        comparisons += p
    if streams['interactions-layout']:
        ss, p = analyze_interactions(streams['interactions-layout'], SPEC['layout_interactions'], 'source-layout-interaction')
        interactions += ss
        comparisons += p
    proposal, rankings, ablations = route_policy_analysis(route, grids, taskmaps['interactions-routing'])
    ports = analyze_ports(route)
    metadata = {'version': 'control-analysis-1.0', 'generated_at': datetime.datetime.now(datetime.timezone.utc).isoformat(),
        'evidence': 'Measured completed development outputs; no geometry algorithms executed by this analyzer',
        'inputs': coverage, 'settings_spec_sha256': digest(ROOT / 'evaluation/settings-spec.json'),
        'analysis_script_sha256': digest(pathlib.Path(__file__)), 'heldout_read': False,
        'geometry_tolerance_px': TOL, 'pair_rows': len(comparisons),
        'score_gains': 'Lower is better; signed candidate minus baseline deltas in comparisons; positive baseline minus winner gain in summaries.',
        'equivalence_note': 'Actual elementwise comparator, identical route point counts and side identity; boxed coordinates <=1px and Euclidean route-point distance <=1px. Binned hashes retained only as a separate descriptive column.',
        'canonical_attempt_rule': 'First terminal row per distinct trial; later accidental attempts are diagnostics only.',
        'archive_verification': verification,
        'timing_note': 'Single-run values are not repeated timing evidence.'}
    write_json('control-analysis-manifest.json', metadata)
    write_json('control-routing-summary.json', routing)
    write_json('control-history-summary.json', history)
    write_json('control-history-inputs.json', history_inputs)
    write_json('control-layout-summary.json', layouts)
    write_json('control-warm-summary.json', warm)
    write_json('control-interactions.json', interactions)
    write_json('control-comparisons.json', comparisons)
    write_csv('control-comparisons.csv', comparisons)
    flat = [{k: v for k, v in r.items() if k not in ('cases', 'levels')} for r in routing + history + layouts + warm]
    write_csv('control-summary.csv', flat)
    write_json('control-routing-policy-rankings.json', rankings)
    write_csv('control-routing-policy-rankings.csv', rankings)
    write_json('control-routing-ablations.json', ablations)
    write_csv('control-routing-ablations.csv', ablations)
    write_json('control-port-overrides.json', ports)
    write_csv('control-port-overrides.csv', ports)
    write_json('routing-policy-proposal.json', proposal)
    enrich_inventory(routing + history + layouts + warm, ablations, interactions)
    narrative(routing, history, interactions, proposal, ports, coverage, layouts, warm)
    print(json.dumps({'completed_inputs': [c['name'] for c in coverage if c['state'] == 'complete'],
        'control_summaries': len(flat), 'paired_comparisons': len(comparisons), 'routing_proposal': proposal['policies'],
        'routing_coverage': proposal['selection_stats']}, indent=2))


if __name__ == '__main__':
    main()
