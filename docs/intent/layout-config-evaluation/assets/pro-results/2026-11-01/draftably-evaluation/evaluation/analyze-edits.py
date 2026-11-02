#!/usr/bin/env python3
"""Analyze actual incremental-edit trials; never execute a product geometry algorithm.

Development is the default. Heldout files are never opened without an explicit flag
and a policy freeze. Bootstrap samples are whole bases, preserving all five edits.
"""
from __future__ import annotations

import argparse
import collections
import csv
import datetime
import gzip
import hashlib
import json
import math
import pathlib
import random
import re
import statistics
import subprocess

ROOT = pathlib.Path(__file__).resolve().parents[1]
DATA = ROOT / 'data'
OUT = DATA / 'analysis'
SPEC = json.loads((ROOT / 'evaluation/edit-analysis-spec.json').read_text())
EDIT_KEYS = ('sharedObjects', 'meanDisplacement', 'maxDisplacement', 'translationAdjustedMean',
             'translationAdjustedMax', 'movedOver24', 'adjustedMovedOver24', 'orderFlips', 'orderPairs',
             'orderFlipRate', 'changedSides', 'changedRoutes', 'comparedRoutes', 'changedSideRate',
             'changedRouteRate', 'localMean', 'distantMean')
QUALITY_KEYS = ('hardDefects', 'layoutHardDefects', 'routingHardDefects', 'requiredIntentFailures',
                'blockedRoutes', 'overlaps', 'throughNodes', 'authoredSideViolations', 'pinScopeViolations',
                'crossings', 'sharedLength', 'laneDeficit', 'bends', 'tinyJogs', 'hooks', 'backEdges',
                'routeLength', 'detourMean', 'labelDefects', 'titleBandHits', 'titleTextHits',
                'area', 'aspectError', 'diPer10')
TERMINAL = {'ok', 'failed', 'timed_out', 'cancelled', 'timeout', 'dependency_failed'}


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def mean(values):
    values = [v for v in values if v is not None and isinstance(v, (int, float)) and math.isfinite(v)]
    return statistics.mean(values) if values else None


def quantile(values, q):
    values = sorted(v for v in values if v is not None and isinstance(v, (int, float)) and math.isfinite(v))
    if not values:
        return None
    x = (len(values) - 1) * q
    lo, hi = math.floor(x), math.ceil(x)
    return values[lo] + (values[hi] - values[lo]) * (x - lo)


def hard_valid(row):
    m = row.get('metrics', {})
    return row.get('status') == 'ok' and bool(m.get('hardValid')) and not m.get('requiredIntentFailures', 0)


def write_json(name, obj):
    (OUT / name).write_text(json.dumps(obj, indent=2, allow_nan=False) + '\n')


def write_csv(name, rows):
    if not rows:
        (OUT / name).write_text('')
        return
    fields = list(dict.fromkeys(k for row in rows for k in row))
    with (OUT / name).open('w', newline='') as f:
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        w.writerows({k: json.dumps(v, sort_keys=True) if isinstance(v, (list, dict, tuple)) else v for k, v in row.items()} for row in rows)


def read_jsonl(path, split):
    """Retain every attempt in metadata and return only the first terminal record."""
    if not path.exists():
        return {}, {'path': str(path.relative_to(ROOT)), 'state': 'not present'}
    attempts = collections.defaultdict(list)
    lines = path.read_text().splitlines()
    partial = False
    for i, line in enumerate(lines):
        if not line.strip():
            continue
        try:
            row = json.loads(line)
        except json.JSONDecodeError:
            if i == len(lines) - 1:
                partial = True
                break
            raise
        if row.get('split') != split:
            raise ValueError(f'Refusing {row.get("split")} row while analyzing {split}: {row.get("id")}')
        if row.get('status') not in TERMINAL:
            raise ValueError(f'Nonterminal or unknown status {row.get("status")}')
        attempts[row['id']].append(row)
    rows = {ident: rs[0] for ident, rs in attempts.items()}
    return rows, {'path': str(path.relative_to(ROOT)), 'file_sha256': digest(path),
        'attempt_rows': sum(map(len, attempts.values())), 'distinct_terminal_rows': len(rows),
        'first_status_counts': dict(collections.Counter(r['status'] for r in rows.values())),
        'all_attempt_status_counts': dict(collections.Counter(r['status'] for rs in attempts.values() for r in rs)),
        'partial_final_line': partial,
        'later_attempts': {ident: [{'status': r['status'], 'error': r.get('error'), 'geometryHash': r.get('geometryHash')} for r in rs] for ident, rs in attempts.items() if len(rs) > 1}}


def load_stage(prefix, split):
    name = prefix + '-' + split
    tasks_path = ROOT / 'evaluation/tasks' / (name + '.json')
    if not tasks_path.exists():
        return {}, {}, {'stage': name, 'state': 'tasks not yet present'}
    tasks = json.loads(tasks_path.read_text())
    if len({t['id'] for t in tasks}) != len(tasks):
        raise ValueError('Duplicate task IDs: ' + name)
    taskmap = {t['id']: t for t in tasks}
    if any(t.get('split') != split for t in tasks):
        raise ValueError('Task split mismatch: ' + name)
    rows, info = read_jsonl(DATA / (name + '.jsonl'), split)
    if set(rows) - set(taskmap):
        raise ValueError('Unexpected outcome ID: ' + name)
    complete = len(rows) == len(tasks) and not info.get('partial_final_line')
    info.update(stage=name, planned_rows=len(tasks), task_sha256=digest(tasks_path), state='complete' if complete else 'incomplete; excluded from policy aggregates')
    return (rows if complete else {}), taskmap, info


def read_artifact(path):
    return json.loads(gzip.decompress((ROOT / path).read_bytes()))


def operation_ms(row):
    timing = row.get('timing', {})
    if row.get('status') == 'ok':
        return timing.get('totalMs', timing.get('workerMs'))
    return timing.get('workerMs', row.get('trialBudgetMs'))


def reference_for(task, catalog):
    path = task.get('reference', task.get('compareReference'))
    if not path:
        return {'path': None, 'available': False, 'reason': 'No declared reference'}
    sourcepath = ROOT / path
    if sourcepath.exists():
        artifact = read_artifact(path)
        canonical = catalog.get(artifact.get('trialId'))
        partial = artifact.get('phase') == 'layout-complete-routing-pending'
        if partial or canonical is None or canonical.get('status') == 'ok':
            return {'path': path, 'available': True, 'partial': partial,
                    'canonical_id': artifact.get('trialId'), 'canonical_status': canonical.get('status') if canonical else None,
                    'expected_hash': canonical.get('geometryHash') if canonical and not partial else None,
                    'canonical_record_available': canonical is not None}
    checkpoint = path.replace('data/geometry/', 'data/layout-checkpoints/')
    if task.get('allowPartialReference') and (ROOT / checkpoint).exists():
        artifact = read_artifact(checkpoint)
        return {'path': checkpoint, 'available': True, 'partial': True, 'canonical_id': artifact.get('trialId'),
                'canonical_status': catalog.get(artifact.get('trialId'), {}).get('status'),
                'expected_hash': None, 'canonical_record_available': artifact.get('trialId') in catalog}
    return {'path': path, 'available': False, 'reason': 'Canonical reference unavailable; later success is not substituted'}


def base_record(row, task, variant, effective, current, guard, ref):
    m = effective.get('metrics', {})
    raw_ms = operation_ms(row)
    fallback_ms = operation_ms(current) if guard else 0.0
    total = raw_ms + fallback_ms if raw_ms is not None and fallback_ms is not None else None
    rec = {'record_id': row['id'] + '::' + variant, 'raw_trial_id': row['id'], 'effective_trial_id': effective['id'],
        'case_id': task['caseId'], 'family': task['family'], 'split': task['split'], 'policy': task['policy'],
        'stratum': 'cold-source' if task['kind'] == 'source' else 'warm-action', 'variant': variant,
        'edit_id': task['editId'], 'edit_operation': task.get('editOperation'),
        'color_negative_control': task['editId'] == 'color_control',
        'requested_global_reflow': bool(task.get('requestedGlobalReflow')),
        'applicability': 'Diagnostic only: bounded warm repair is not a direction/fit rebuild' if task['kind'] == 'warm-edit' and task.get('requestedGlobalReflow') and task.get('action') == 'repair' else 'Stated source or local-action policy',
        'raw_status': row['status'], 'effective_status': effective['status'],
        'raw_hard_valid': hard_valid(row), 'hard_valid': hard_valid(effective),
        'guard_applied': guard, 'guard_rule': 'hard-invalid raw and hard-valid current source' if variant == 'guarded' else None,
        'reference': ref, 'reference_partial': ref.get('partial'),
        'reference_available': ref['available'], 'action': task.get('action', 'source-compile'),
        'engine_calls': row.get('engineCalls', 0),
        'raw_engine_action': task.get('action') == 'repair' and row.get('engineCalls', 0) > 0,
        'raw_operation_ms': raw_ms, 'fallback_operation_ms': fallback_ms,
        'operation_or_serial_guard_ms': total, 'raw_worker_ms': row.get('timing', {}).get('workerMs'),
        'routing_cache_hit': row.get('routingCacheHit'),
        'input_preparation_ms': operation_ms(current) if task['kind'] == 'warm-edit' and current else None,
        'raw_settings': row.get('settings'), 'local_ids': task.get('localIds', []),
        'manual_ids': task.get('patchDoc', {}).get('manual', []),
        'collapsed_groups': task.get('patchDoc', {}).get('collapsed', []),
        'scope': task.get('options', {}).get('scope'), 'respect_manual': task.get('options', {}).get('respectManual'),
        'hard_findings': effective.get('hard', []), 'intent_findings': effective.get('intent', {}).get('failures', []),
        'raw_geometry': row.get('geometry'), 'effective_geometry': effective.get('geometry'),
        'expected_effective_geometry_hash': effective.get('geometryHash')}
    for name in QUALITY_KEYS:
        rec[name] = m.get(name)
    for profile in ('balanced', 'traceable', 'direct'):
        rec['score_' + profile] = m.get('weightingScores', {}).get(profile)
    for name in EDIT_KEYS:
        rec[name] = None
    rec['stable_score'] = None
    return rec


def aggregate(records):
    groups = collections.defaultdict(list)
    for r in records:
        groups[(r['stratum'], r['policy'], r['variant'])].append(r)
    summaries = []
    for (stratum, policy, variant), rs in sorted(groups.items()):
        ordinary = [r for r in rs if not r['color_negative_control']]
        stability = [r for r in ordinary if not r['requested_global_reflow']]
        colors = [r for r in rs if r['color_negative_control']]
        out = {'stratum': stratum, 'policy': policy, 'variant': variant, 'bases': len({r['case_id'] for r in rs}),
            'jobs': len(rs), 'ordinary_jobs': len(ordinary), 'color_jobs': len(colors),
            'color_hard_valid_jobs': sum(r['hard_valid'] for r in colors),
            'completed_jobs': sum(r['effective_status'] == 'ok' for r in rs),
            'hard_valid_jobs': sum(r['hard_valid'] for r in rs),
            'ordinary_hard_valid_jobs': sum(r['hard_valid'] for r in ordinary),
            'guard_fallbacks': sum(r['guard_applied'] for r in rs),
            'bases_with_any_hard_failure': len({r['case_id'] for r in rs if not r['hard_valid']}),
            'hard_failure_trial_ids': [r['raw_trial_id'] for r in rs if not r['hard_valid']],
            'route_only_retain_jobs': sum(r['action'] == 'retain' for r in rs),
            'specialist_compile_recipe_jobs': sum(r['action'] == 'compile-recipe' for r in rs),
            'actual_warm_engine_jobs': sum(r['raw_engine_action'] for r in rs),
            'color_complete_geometry_available': sum(r.get('completeGeometryExact') is not None for r in colors),
            'color_complete_geometry_exact': sum(r.get('completeGeometryExact') is True for r in colors),
            'color_complete_geometry_within_1px': sum(r.get('completeGeometryWithin1px') is True for r in colors),
            'color_node_geometry_exact': sum(r.get('nodeGeometryExact') is True for r in colors),
            'color_node_geometry_available': sum(r.get('nodeGeometryExact') is not None for r in colors),
            'color_rendered_paths_exact': sum(r.get('renderedPathsExact') is True for r in colors),
            'color_failure_trial_ids': [r['raw_trial_id'] for r in colors if r.get('completeGeometryWithin1px') is False],
            'reference_partial_jobs': sum(bool(r['reference_partial']) for r in rs),
            'direction_request_jobs': sum(bool(r.get('requestedDirection')) for r in rs),
            'direction_setting_not_retained_jobs': sum(r.get('requestedDirectionSettingRetained') is False for r in rs),
            'unchanged_nodes_despite_direction_request_jobs': sum(r.get('unchangedNodesOnDirectionRequest') is True for r in rs),
            'scope_violation_jobs': sum(bool(r.get('pinScopeViolations')) for r in rs),
            'routing_cache_hit_jobs': sum(r.get('routing_cache_hit') is True for r in rs)}
        for metric in ('operation_or_serial_guard_ms', 'score_balanced', 'score_traceable', 'score_direct',
                       'meanDisplacement', 'translationAdjustedMean', 'maxDisplacement', 'translationAdjustedMax',
                       'orderFlipRate', 'changedSideRate', 'changedRouteRate', 'localMean', 'distantMean',
                       'translationAdjustedLocalMean', 'translationAdjustedDistantMean', 'stable_score'):
            source = rs if metric == 'operation_or_serial_guard_ms' else ordinary
            if metric in ('meanDisplacement', 'translationAdjustedMean', 'maxDisplacement', 'translationAdjustedMax',
                          'orderFlipRate', 'changedSideRate', 'changedRouteRate', 'localMean', 'distantMean',
                          'translationAdjustedLocalMean', 'translationAdjustedDistantMean'):
                source = stability
            if metric.startswith('score_') or metric == 'stable_score':
                source = [r for r in source if r['hard_valid']]
            values = [r.get(metric) for r in source if r.get(metric) is not None]
            out[metric + '_n'] = len(values)
            out[metric + '_mean'] = mean(values)
            out[metric + '_median'] = quantile(values, .5)
            out[metric + '_p95'] = quantile(values, .95)
            out[metric + '_max'] = max(values) if values else None
        summaries.append(out)
    return summaries


def paired_analysis(records, split):
    lookup = {(r['stratum'], r['policy'], r['variant'], r['case_id'], r['edit_id']): r for r in records}
    groups = sorted({(r['stratum'], r['policy'], r['variant']) for r in records})
    summary, rows = [], []
    metrics = ('hard_valid', 'operation_or_serial_guard_ms', 'score_balanced', 'stable_score',
               'meanDisplacement', 'translationAdjustedMean', 'distantMean', 'translationAdjustedDistantMean',
               'orderFlipRate', 'changedSideRate', 'changedRouteRate')
    for stratum, policy, variant in groups:
        baseline_policy = 'current-source' if stratum == 'cold-source' else 'current-tidy'
        if policy == baseline_policy and variant == 'raw':
            continue
        pairs = []
        for r in records:
            if (r['stratum'], r['policy'], r['variant']) != (stratum, policy, variant):
                continue
            b = lookup.get((stratum, baseline_policy, 'raw', r['case_id'], r['edit_id']))
            if b:
                pairs.append((r, b))
        if not pairs:
            continue
        comparison = {'stratum': stratum, 'policy': policy, 'variant': variant, 'baseline_policy': baseline_policy,
            'paired_jobs': len(pairs), 'paired_bases': len({r['case_id'] for r, _ in pairs}),
            'paired_ordinary_jobs': sum(not r['color_negative_control'] for r,b in pairs),
            'ordinary_new_hard_invalid_jobs': sum(not r['color_negative_control'] and not r['hard_valid'] and b['hard_valid'] for r,b in pairs),
            'ordinary_rescued_valid_jobs': sum(not r['color_negative_control'] and r['hard_valid'] and not b['hard_valid'] for r,b in pairs),
            'new_hard_invalid_jobs': sum(not r['hard_valid'] and b['hard_valid'] for r, b in pairs),
            'new_hard_invalid_bases': len({r['case_id'] for r, b in pairs if not r['hard_valid'] and b['hard_valid']}),
            'rescued_valid_jobs': sum(r['hard_valid'] and not b['hard_valid'] for r, b in pairs),
            'both_invalid_jobs': sum(not r['hard_valid'] and not b['hard_valid'] for r, b in pairs),
            'new_hard_invalid_witnesses': [r['raw_trial_id'] for r, b in pairs if not r['hard_valid'] and b['hard_valid']],
            'rescued_witnesses': [r['raw_trial_id'] for r, b in pairs if r['hard_valid'] and not b['hard_valid']]}
        for metric in metrics:
            bybase = collections.defaultdict(list)
            observations = 0
            for r, b in pairs:
                include = metric in ('hard_valid', 'operation_or_serial_guard_ms') or not r['color_negative_control']
                if metric not in ('hard_valid', 'operation_or_serial_guard_ms', 'score_balanced', 'stable_score') and r['requested_global_reflow']:
                    include = False
                if metric not in ('hard_valid', 'operation_or_serial_guard_ms') and not (r['hard_valid'] and b['hard_valid']):
                    include = False
                x, y = r.get(metric), b.get(metric)
                if not include or x is None or y is None:
                    continue
                delta = float(x) - float(y)
                bybase[r['case_id']].append(delta)
                observations += 1
                rows.append({'split': split, 'stratum': stratum, 'policy': policy, 'variant': variant,
                    'baseline_policy': baseline_policy, 'case_id': r['case_id'], 'family': r['family'],
                    'edit_id': r['edit_id'], 'metric': metric, 'candidate_value': x, 'baseline_value': y,
                    'delta_candidate_minus_baseline': delta, 'candidate_trial': r['raw_trial_id'],
                    'effective_candidate_trial': r['effective_trial_id'], 'baseline_trial': b['raw_trial_id']})
            base_means = [mean(v) for _, v in sorted(bybase.items())]
            rng = random.Random(SPEC['bootstrap']['seed'])
            draws = [mean(rng.choices(base_means, k=len(base_means))) for _ in range(SPEC['bootstrap']['replicates'])] if base_means else []
            comparison[metric] = {'paired_jobs_available': observations, 'base_clusters_available': len(base_means),
                'mean_paired_base_delta': mean(base_means), 'bootstrap_low_95': quantile(draws, .025),
                'bootstrap_high_95': quantile(draws, .975), 'base_mean_deltas': dict(zip(sorted(bybase), base_means)),
                'interpretation': 'Positive validity is better; positive costs/movement are worse. Whole base bundles resampled. Soft and movement contrasts require both outcomes valid; failures remain in validity contrast.'}
        summary.append(comparison)
    return summary, rows


def report(split, manifest, summaries, comparisons, records):
    lines = [f'# Incremental editing findings — {split}', '',
        '**Actual shipped source and warm-engine outputs; derived guard analysis is identified separately.** The first terminal result per trial is canonical. Success of execution and hard validity are different columns. The raw records, attempted settings, geometry, references and failures remain available.', '',
        '## What is being compared', '',
        'Cold source policies compare each policy after an edit with that same guarded policy before the edit. Warm actions start from the same current-source positions, prior endpoint sides and explicit protection/scope state. These are different questions and are not pooled into one stability ranking. The protected warm `current-tidy` baseline uses `respectManual=true` for the stated job; that is stricter than the shipped raw settings default. Warm action time begins after its edited input exists, so its source preparation cost is retained separately.', '',
        'The frozen design has four ordinary edits plus a color-only negative control for every base. Direction/format changes requesting global movement retain every movement/churn measurement but incur neither displacement nor side-churn penalty in the stable profile. The ordinary stable score is balanced defects per ten edges + adjusted mean movement / 24 + 5 × changed-side rate. Missing prior route history leaves churn and that composite unavailable; zero is never substituted.', '',
        '## Completion and validity', '',
        '| Stage | Planned | Canonical terminal rows | State |', '| --- | ---: | ---: | --- |']
    for stage in manifest['stages']:
        lines.append(f"| {stage['stage']} | {stage.get('planned_rows', '—')} | {stage.get('distinct_terminal_rows', 0)} | {stage['state']} |")
    lines += ['', '| Estimand / policy / view | All jobs including color | Executed successfully | Hard-valid all | Ordinary edits valid / attempted | Guard fallbacks | Bases with a failure |',
              '| --- | ---: | ---: | ---: | ---: | ---: | ---: |']
    for r in summaries:
        lines.append(f"| {r['stratum']} / {r['policy']} / {r['variant']} | {r['jobs']} | {r['completed_jobs']} | {r['hard_valid_jobs']} | {r['ordinary_hard_valid_jobs']} / {r['ordinary_jobs']} | {r['guard_fallbacks']} | {r['bases_with_any_hard_failure']} |")
    lines += ['', 'A hard-invalid completed geometry remains a failed usable outcome. Blocked routes, violated sides/pins/scope, missing objects or edges, and required-intent failures cannot be traded for a smaller area or lower soft score. “Guarded” is derived from the measured outputs using the declared rule; it is not an additional geometry run.', '',
        '## Movement and churn', '',
        '| Policy / view | Adjusted mean px | Distant mean px | Changed-side rate | Changed-route rate | Recorded operation median ms | Recorded operation p95 ms | Route-cache hits |',
        '| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |']
    fmt = lambda x: '—' if x is None else f'{x:.3f}'
    for r in summaries:
        lines.append(f"| {r['policy']} / {r['variant']} | {fmt(r['translationAdjustedMean_mean'])} | {fmt(r['distantMean_mean'])} | {fmt(r['changedSideRate_mean'])} | {fmt(r['changedRouteRate_mean'])} | {fmt(r['operation_or_serial_guard_ms_median'])} | {fmt(r['operation_or_serial_guard_ms_p95'])} | {r['routing_cache_hit_jobs']} / {r['jobs']} |")
    lines += ['', 'Movement/churn summaries above exclude color controls and requested global reflow; they describe completed measured geometry, including diagnostic invalid geometry. Quality-score summaries are conditional on valid output. The full table includes raw and adjusted means/maxima, exact contributing counts, per-family medians, local/distant object counts, tails and worst witnesses. A node deliberately nudged 56 px can exceed the 48 px *subsequent repair* cap relative to the pre-edit drawing; those are different origins. The cap must be checked against repair input, not against the pre-edit reference.', '',
        'Operation times are observed per-trial components in this environment, with routing-cache hits recorded. Cache reuse differs by policy and trial order, so the timing columns must not be used to claim that one warm algorithm is intrinsically faster; use the separate cache-bypassed repeated-timing stage. They do not establish an end-to-end pointer/UI latency budget. Guarded times add the raw attempt and current-source fallback operation as a **derived serial cost estimate**. They do not grant a failed candidate a free fallback. Warm input preparation is a separate measured source run and is not hidden inside a claimed fast source-edit action.', '',
        '## Color-only negative control', '',
        '| Policy / view | Controls | Hard-valid controls | Full geometry exact / available | Full geometry within 1 px | Nodes exact / available |',
        '| --- | ---: | ---: | --- | ---: | --- |']
    for r in summaries:
        lines.append(f"| {r['policy']} / {r['variant']} | {r['color_jobs']} | {r['color_hard_valid_jobs']} | {r['color_complete_geometry_exact']} / {r['color_complete_geometry_available']} | {r['color_complete_geometry_within_1px']} | {r['color_node_geometry_exact']} / {r['color_node_geometry_available']} |")
    lines += ['', 'The exact test covers boxes, selected sides and corresponding route points; the 1 px test uses elementwise box tolerance and Euclidean route-point tolerance, not rounding bins. Production path/halo-string equality is retained separately. Appearance colors are expected to change. For warm color controls the frozen policy retains positions and reroutes with shared history; it does not invoke an unsolicited layout pass. Missing prior route geometry leaves the full path comparison unavailable while the node-only check can still be reported.', '',
        '## Requested direction and action applicability', '',
        'Bounded warm Repair/Separate runs on a global direction request are diagnostic comparisons, not substitutes for a rebuild. The proposed editing workflow dispatches direction/format changes to its source rearrangement path; local warm actions handle local edits, and color retains positions. A hard-valid Separate result can simply keep the old orientation. The original hard-valid labels remain frozen; no new hard gate is silently added after inspection.', '',
        '| Policy / view | Direction requests | Projected tool setting differs from request | Unchanged nodes on a direction request |',
        '| --- | ---: | ---: | ---: |']
    for r in summaries:
        lines.append(f"| {r['policy']} / {r['variant']} | {r['direction_request_jobs']} | {r['direction_setting_not_retained_jobs']} | {r['unchanged_nodes_despite_direction_request_jobs']} |")
    lines += ['', 'The projected tool-setting column is NOT a direction-compliance count: `projectScene` only copies a root engine direction into `doc.settings`, while ordinary recipe layouts retain the tool default (`src/dsl/project.ts:102–112`). The forward-axis diagnostic records actual center progress, reverse/tied edges and axis dominance before/after, including cycles, returns and hidden descendants. It is evidence to inspect, not a universal direction-compliance test. In development, `presentation-03` explicitly changes to `direction=down fit=wide`, but current source compilation keeps the exact earlier node geometry. The source fit search tries both directions (`src/dsl/compile.ts:171–190`). Separate also keeps those nodes while its invocation setting says DOWN. Its apparent one-job hard-defect rescue over warm tidy therefore does not demonstrate completion of the requested direction task. The UI must resolve and explain direction-versus-format precedence before promising independent controls. Applicable warm-only summaries exclude requested global-reflow diagnostics and are saved separately.', '',
        '## Paired differences and base-cluster intervals', '',
        'Each bootstrap draw resamples whole base diagrams with replacement and retains their five-edit bundles. There are 2,000 draws with a recorded deterministic seed. Ordinary-edit/movement eligibility is applied within the selected bundle; edits are never treated as independent people. The intervals describe this synthetic sample and do not establish user preference or statistical significance in a population.', '',
        '| Comparison | New invalid jobs | Rescued jobs | Stable score paired delta [95% base interval] | Base clusters |',
        '| --- | ---: | ---: | --- | ---: |']
    for r in comparisons:
        s = r['stable_score']
        interval = f"{fmt(s['mean_paired_base_delta'])} [{fmt(s['bootstrap_low_95'])}, {fmt(s['bootstrap_high_95'])}]"
        lines.append(f"| {r['policy']} {r['variant']} vs {r['baseline_policy']} | {r['new_hard_invalid_jobs']} | {r['rescued_valid_jobs']} | {interval} | {s['base_clusters_available']} |")
    lines += ['', 'Validity and latency contrasts retain failed attempts. Soft/stability paired contrasts require both outputs valid and report their exact contributing jobs and bases. This avoids treating a missing or invalid result as a low-cost drawing; it also means a conditional soft improvement cannot cancel a validity regression.', '',
        '## Guard and reference integrity', '',
        'Only the named cold proposals `best-single` and `feature-selector` use the hard-validity guard. If the raw candidate is invalid/failed and the current edited source is valid, the effective result uses that current output. No favorable-soft-score fallback is allowed. Movement and churn are recomputed against the same policy’s pre-edit reference, so fallback does not borrow the current policy’s more favorable reference. Both raw and guarded rows remain in the data. A current-source fallback is not assumed to satisfy a different warm manual/scope job, so no warm guard is credited.', '',
        'Canonical successful artifacts are checked with the original geometry-signature hash. Complete references are checked when a canonical row is available. A layout checkpoint is labeled partial and supplies no invented prior routes. The derivation helper imports only the frozen metric serialization/edit functions; it does not call a layout or routing algorithm.', '',
        '## Interpretation and next decision', '',
        'Use the per-job hard and intent gates first, then inspect movement/churn and rendered witnesses. A warm method that keeps positions on one task can still fail a pin, container or route constraint elsewhere. Specialist `compile-recipe` jobs are compiler escapes and are not credited as successful raw warm-engine calls. These results test the stated policies and baselines; they are not evidence to delete an internal implementation solely because it loses one aggregate.', '',
        f'Replay: `python evaluation/analyze-edits.py --split {split}`' + (' plus `--allow-heldout-after-freeze` for the heldout report.' if split == 'heldout' else '. The default never opens heldout results.')]
    (ROOT / f'edit-findings-{split}.md').write_text('\n'.join(lines) + '\n')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--split', choices=('development', 'heldout'), default='development')
    ap.add_argument('--allow-heldout-after-freeze', action='store_true')
    args = ap.parse_args()
    split = args.split
    if split == 'heldout' and (not args.allow_heldout_after_freeze or not (DATA / 'policy-freeze.json').exists()):
        raise SystemExit('Heldout analysis requires explicit authorization flag and an existing policy freeze.')
    OUT.mkdir(parents=True, exist_ok=True)
    stage_names = ('edits-current', 'edits-states', 'edits-warm', 'edits-policies')
    streams, tasks, stages = {}, {}, []
    for name in stage_names:
        rows, tm, info = load_stage(name, split)
        streams[name], tasks[name] = rows, tm
        stages.append(info)
    if not streams['edits-current']:
        raise SystemExit('Current-source edit stage is not yet complete; no partial policy aggregate emitted.')
    # Only filenames explicitly belonging to the requested split enter the reference index.
    catalog, catalog_files = {}, []
    for path in sorted(DATA.glob('*-' + split + '.jsonl')):
        rows, info = read_jsonl(path, split)
        catalog_files.append(info)
        for ident, row in rows.items():
            if ident not in catalog:
                catalog[ident] = row
    predictions = {}
    prediction_path = DATA / ('edit-policy-predictions-' + split + '.json')
    if not prediction_path.exists():
        prediction_path = DATA / 'edit-policy-predictions.json'
    if prediction_path.exists():
        raw_predictions = json.loads(prediction_path.read_text())
        ps = raw_predictions.get('predictions', raw_predictions) if isinstance(raw_predictions, dict) else raw_predictions
        predictions = {(p['policy'], p['caseId'], p.get('editId', 'base')): p for p in ps if p['split'] == split}
    compact_path = DATA / 'policy-compact.json'
    guard_map = json.loads(compact_path.read_text()).get('proposedValidityGuards', {}) if compact_path.exists() else {}
    if any(guard_map.get(p) is not True for p in SPEC['guard']['policies']) and streams['edits-policies']:
        raise ValueError('Cold policy guard declaration missing or changed; do not silently reinterpret it.')
    current = {(tasks['edits-current'][r['id']]['caseId'], tasks['edits-current'][r['id']]['editId']): r for r in streams['edits-current'].values()}
    records, requests, derivation_info = [], [], {}
    for name in ('edits-current', 'edits-warm', 'edits-policies'):
        for row in streams[name].values():
            task = tasks[name][row['id']]
            cid, eid = task['caseId'], task['editId']
            cur = current.get((cid, eid))
            ref = reference_for(task, catalog)
            variants = ('raw', 'guarded') if name == 'edits-policies' and task['policy'] in SPEC['guard']['policies'] else ('raw',)
            for variant in variants:
                guarded = variant == 'guarded' and not hard_valid(row) and cur is not None and hard_valid(cur)
                effective = cur if guarded else row
                record = base_record(row, task, variant, effective, cur, guarded, ref)
                prediction = predictions.get((task['policy'], cid, eid), predictions.get((task['policy'], cid, 'base')))
                if prediction:
                    record['prediction'] = {k: prediction.get(k) for k in ('method', 'preeditRawMethod', 'preeditEffectiveMethod', 'preeditGuardUsed', 'referenceSamePolicyBeforeEdit', 'requestedDirectionOverride')}
                records.append(record)
                if effective.get('status') == 'ok' and ref['available']:
                    requested_direction = None
                    if task.get('editOperation') == 'change-direction':
                        requested_direction = task.get('options', {}).get('direction') or (task.get('layout') or {}).get('direction')
                        if not requested_direction and task.get('sourcePath'):
                            match = re.search(r'^layout\s+root\b[^\n]*\bdirection=(right|down)\b', (ROOT / task['sourcePath']).read_text(), re.M)
                            requested_direction = match.group(1).upper() if match else None
                    requests.append({'id': record['record_id'], 'before': ref['path'], 'after': effective['geometry'],
                        'referencePartial': ref.get('partial', False), 'localIds': task.get('localIds', []),
                        'requestedDirection': requested_direction,
                        'requestedGlobalReflow': task.get('requestedGlobalReflow', False)})
                    derivation_info[record['record_id']] = (record, effective, ref)
    result = subprocess.run(['node', str(ROOT / 'evaluation/derive-edit-metrics.mjs')],
        input=json.dumps(requests), text=True, capture_output=True, check=True)
    derived = json.loads(result.stdout)
    failures, verified_outputs, verified_references = [], 0, 0
    for d in derived:
        record, effective, ref = derivation_info[d['id']]
        if d.get('error'):
            failures.append(d)
            record['derivation_error'] = d['error']
            continue
        if d['afterGeometryHash'] != effective['geometryHash']:
            failures.append({'id': d['id'], 'error': 'Canonical effective geometry hash mismatch', 'expected': effective['geometryHash'], 'observed': d['afterGeometryHash']})
            continue
        verified_outputs += 1
        if ref.get('expected_hash') and d['beforeGeometryHash'] != ref['expected_hash']:
            failures.append({'id': d['id'], 'error': 'Canonical reference geometry hash mismatch', 'expected': ref['expected_hash'], 'observed': d['beforeGeometryHash']})
            continue
        if ref.get('expected_hash'):
            verified_references += 1
        record.update({k: v for k, v in d.items() if k not in ('id', 'edit', 'afterGeometryHash', 'beforeGeometryHash')})
        for k in EDIT_KEYS:
            record[k] = d['edit'].get(k)
        record['shift'] = d['edit'].get('shift')
        # A local edge label or a removed object need not leave any shared local node.
        if d['localSharedObjects'] == 0:
            record['localMean'] = None
        if d['distantSharedObjects'] == 0:
            record['distantMean'] = None
        if record['hard_valid']:
            if record['requested_global_reflow']:
                record['stable_score'] = record['score_balanced']
            elif record['translationAdjustedMean'] is not None and record['changedSideRate'] is not None:
                record['stable_score'] = record['score_balanced'] + record['translationAdjustedMean'] / 24 + 5 * record['changedSideRate']
    verification = {'geometry_derivations': len(derived), 'effective_geometry_hashes_verified': verified_outputs,
        'reference_geometry_hashes_verified': verified_references, 'errors': failures,
        'scope': 'Geometry signatures only; not whole archive byte identity. Edit metrics are recomputed without product engine execution.'}
    write_json(f'edits-{split}-verification.json', verification)
    if failures:
        raise ValueError('Edit artifact verification failed; inspect verification file before using results.')
    summaries = aggregate(records)
    comparisons, paired_rows = paired_analysis(records, split)
    applicable_records = [r for r in records if r['stratum'] != 'warm-action' or not r['requested_global_reflow']]
    applicable_summary = aggregate(applicable_records)
    applicable_paired, applicable_rows = paired_analysis(applicable_records, split)
    family_summary = []
    for family in sorted({r['family'] for r in records}):
        family_summary += [dict(family=family, **s) for s in aggregate([r for r in records if r['family'] == family])]
    manifest = {'version': SPEC['version'], 'generated_at': datetime.datetime.now(datetime.timezone.utc).isoformat(),
        'split': split, 'heldout_read': split == 'heldout', 'source': 'Measured E outputs plus declared derived hard-validity guard',
        'stages': stages, 'reference_catalog_files': catalog_files,
        'design_sha256': digest(DATA / 'edit-design-freeze.json'), 'analysis_spec_sha256': digest(ROOT / 'evaluation/edit-analysis-spec.json'),
        'analysis_code_sha256': digest(pathlib.Path(__file__)), 'derivation_code_sha256': digest(ROOT / 'evaluation/derive-edit-metrics.mjs'),
        'policy_compact_sha256': digest(compact_path) if compact_path.exists() else None,
        'prediction_sha256': digest(prediction_path) if prediction_path.exists() else None,
        'policy_freeze_sha256': digest(DATA / 'policy-freeze.json') if (DATA / 'policy-freeze.json').exists() else None,
        'records': len(records), 'verification': verification, 'bootstrap': SPEC['bootstrap'],
        'canonical_rule': 'First terminal outcome. Later attempts never promote coverage.',
        'guard_map': guard_map, 'no_geometry_algorithms_executed': True}
    write_json(f'edits-{split}-manifest.json', manifest)
    write_json(f'edits-{split}-records.json', records)
    write_csv(f'edits-{split}-records.csv', records)
    write_json(f'edits-{split}-summary.json', summaries)
    write_csv(f'edits-{split}-summary.csv', summaries)
    write_json(f'edits-{split}-family-summary.json', family_summary)
    write_csv(f'edits-{split}-family-summary.csv', family_summary)
    write_json(f'edits-{split}-paired.json', comparisons)
    write_csv(f'edits-{split}-paired.csv', paired_rows)
    write_json(f'edits-{split}-color-controls.json', [r for r in records if r['color_negative_control']])
    write_json(f'edits-{split}-direction-diagnostics.json', [r for r in records if r.get('requestedDirection')])
    write_json(f'edits-{split}-applicable-summary.json', applicable_summary)
    write_csv(f'edits-{split}-applicable-summary.csv', applicable_summary)
    write_json(f'edits-{split}-applicable-paired.json', applicable_paired)
    write_csv(f'edits-{split}-applicable-paired.csv', applicable_rows)
    report(split, manifest, summaries, comparisons, records)
    print(json.dumps({'split': split, 'records': len(records), 'verified': verification,
        'policies': [{k: s[k] for k in ('stratum', 'policy', 'variant', 'jobs', 'completed_jobs', 'hard_valid_jobs', 'guard_fallbacks', 'color_complete_geometry_exact', 'color_complete_geometry_available')} for s in summaries]}, indent=2))


if __name__ == '__main__':
    main()
