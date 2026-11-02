#!/usr/bin/env python3
"""Reporting-only family tails from canonical saved measurements.

No engine, router, metric, profile, gate, or policy is executed or changed here.
Logical selected-preset aliases exactly reuse the frozen portfolio analyzer.
One base contributes once to each family/method summary. Physical execution
counts deduplicate aliases; methods are not treated as independent users.
"""
from __future__ import annotations

import argparse
import collections
import csv
import datetime
import gzip
import hashlib
import importlib.util
import json
import math
import pathlib
import statistics
import types

ROOT = pathlib.Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("frozen_portfolio_analysis", ROOT / "evaluation/analyze-portfolio.py")
A = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(A)

RAW_METRICS = [
    "nodes", "groups", "visibleNodes", "edges", "hardDefects", "layoutHardDefects",
    "routingHardDefects", "requiredIntentFailures", "blockedRoutes", "overlaps",
    "overlapArea", "throughNodes", "authoredSideViolations", "pinScopeViolations",
    "width", "height", "area", "aspect", "density", "deadSpaceRatio", "alignment",
    "crossings", "sharedPairs", "sharedLength", "lanePairs", "laneDeficit", "minLaneGap",
    "bends", "maxBends", "bendsPerEdge", "tinyJogs", "hooks", "backEdges", "routeLength",
    "routeLengthPerEdge", "detourMean", "detourMax", "labelCount", "labelDefects",
    "titleTextHits", "titleBandHits", "defectRaw", "defectIndex", "diPer10",
]
GROUP_METRICS = ["groupFillCount", "groupFillMedianWithinBase", "groupFillMeanWithinBase",
                 "groupFillMinimumWithinBase", "groupFillMaximumWithinBase",
                 "groupPaddingSpreadMaximumWithinBase"]
RUNTIME_METRICS = ["screeningCompileMs", "screeningRoutingMs", "screeningLabelMs",
                   "screeningTotalMs", "screeningWorkerMs"]
WORST_DIRECTIONS = {
    "hardDefects": "high", "layoutHardDefects": "high", "routingHardDefects": "high",
    "requiredIntentFailures": "high", "blockedRoutes": "high", "crossings": "high",
    "bends": "high", "routeLength": "high", "area": "high", "diPer10": "high",
    "labelDefects": "high", "detourMax": "high", "throughNodes": "high",
    "alignment": "low", "density": "low", "groupFillMinimumWithinBase": "low",
    "groupPaddingSpreadMaximumWithinBase": "high", "screeningTotalMs": "high",
}


def sha(path):
    return hashlib.sha256(pathlib.Path(path).read_bytes()).hexdigest()


def finite(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)


def quantile(values, probability):
    """Linear interpolation at (n-1)*p; a descriptive statistic, not a CI."""
    if not values:
        return None
    values = sorted(values)
    position = (len(values) - 1) * probability
    left = math.floor(position)
    right = math.ceil(position)
    return values[left] + (values[right] - values[left]) * (position - left)


def describe(values, eligible):
    values = [v for v in values if finite(v)]
    return {"n": len(values), "eligibleBases": eligible, "missing": eligible - len(values),
            "minimum": min(values) if values else None,
            "median": statistics.median(values) if values else None,
            "p90": quantile(values, .9), "maximum": max(values) if values else None}


def counts(rows):
    status = collections.Counter(r["status"] for r in rows)
    completed = status["ok"]
    valid = sum(r["hardValid"] for r in rows)
    return {"planned": len(rows), "terminal": sum(status[k] for k in ["ok", "timed_out", "failed"]),
            "completed": completed, "hardValid": valid, "hardInvalidCompleted": completed - valid,
            "timedOut": status["timed_out"], "failed": status["failed"],
            "unavailable": status["unavailable"],
            "completedRateOfPlanned": completed / len(rows) if rows else None,
            "hardValidRateOfPlanned": valid / len(rows) if rows else None,
            "timedOutRateOfPlanned": status["timed_out"] / len(rows) if rows else None}


def profile_index(split):
    index = collections.defaultdict(list)
    inputs = []
    for name in ["profile-scores.csv", "retuned-profile-scores.csv"]:
        path = ROOT / "data/analysis" / split / name
        if not path.exists():
            continue
        with path.open(newline="") as handle:
            for line, row in enumerate(csv.DictReader(handle), 2):
                if row.get("split") != split:
                    raise ValueError(f"Wrong split in existing profile file: {path}")
                index[(row["trial"], row["method"])].append({
                    "path": str(path.relative_to(ROOT)), "line": line,
                    "profile": row["profile"], "method": row["method"],
                })
        inputs.append({"path": str(path.relative_to(ROOT)), "sha256": sha(path)})
    return index, inputs


def saved_group_details(row, cache, gaps):
    """Summarize saved groupFill/groupPadding only; never derive new geometry."""
    if not row or row.get("status") != "ok":
        return {}, "not completed"
    if row["id"] in cache:
        return cache[row["id"]]
    if row.get("metrics", {}).get("groups") == 0:
        result = ({"groupFillCount": 0}, "no groups")
        cache[row["id"]] = result
        return result
    path = ROOT / row.get("geometry", f'data/geometry/{row["id"]}.json.gz')
    if not path.exists():
        gaps.append({"trial": row["id"], "kind": "group-details-archive-missing", "path": str(path.relative_to(ROOT))})
        result = ({}, "archive missing")
        cache[row["id"]] = result
        return result
    data = json.loads(gzip.decompress(path.read_bytes()))
    metrics = data.get("metrics", {})
    same = data.get("trialId") == row["id"] and all(
        metrics.get(key) == row.get("metrics", {}).get(key)
        for key in ["nodes", "groups", "edges", "hardDefects", "crossings", "area", "routeLength", "diPer10"]
    )
    if not same:
        gaps.append({"trial": row["id"], "kind": "archive-metrics-disagree-with-canonical-row", "path": str(path.relative_to(ROOT))})
        result = ({}, "canonical archive mismatch; details excluded")
        cache[row["id"]] = result
        return result
    fills = metrics.get("groupFill")
    if not isinstance(fills, dict):
        gaps.append({"trial": row["id"], "kind": "saved-groupFill-unavailable"})
        result = ({}, "groupFill not saved")
        cache[row["id"]] = result
        return result
    values = [v for v in fills.values() if finite(v)]
    pads = metrics.get("groupPadding", {})
    spreads = [max(p["left"], p["right"], p["bottom"]) - min(p["left"], p["right"], p["bottom"])
               for p in pads.values() if all(finite(p.get(k)) for k in ["left", "right", "bottom"])]
    details = {"groupFillCount": len(values),
               "groupFillMedianWithinBase": statistics.median(values) if values else None,
               "groupFillMeanWithinBase": statistics.mean(values) if values else None,
               "groupFillMinimumWithinBase": min(values) if values else None,
               "groupFillMaximumWithinBase": max(values) if values else None,
               "groupPaddingSpreadMaximumWithinBase": max(spreads) if spreads else None,
               "savedGroupFill": fills, "savedGroupPadding": pads}
    result = (details, "saved production-metric details; reporting-only within-base summary")
    cache[row["id"]] = result
    return result


def planned_pool(split, cases):
    """Reuse frozen canonicalization/selected aliases without scoring or fitting."""
    frozen = A.read_json(ROOT / "data/policy-freeze.json")
    policy = frozen.get("proposal", frozen)
    if split == "heldout":
        policy, _ = A.frozen_policy()
    stages = ["screen-" + split, "documented-default-" + split, "selected-presets-" + split]
    if split == "development":
        stages.append("tuning-development")
    stage_rows, stage_tasks, infos = {}, {}, []
    all_tasks = []
    by_id = {}
    for stem in stages:
        rows, info = A.load_trials(stem, require_complete=False, split=split)
        stage_rows[stem] = rows
        tasks_path = ROOT / "evaluation/tasks" / (stem + ".json")
        tasks = A.read_json(tasks_path) if tasks_path.exists() else []
        stage_tasks[stem] = tasks
        all_tasks.extend(tasks)
        by_id.update({r["id"]: r for r in rows})
        infos.append(info)
    base = stage_rows["screen-" + split] + stage_rows["documented-default-" + split]
    base_tasks = stage_tasks["screen-" + split] + stage_tasks["documented-default-" + split]
    logical = [(t, A.method_key(t), by_id.get(t["id"]), False) for t in base_tasks]
    tuned = policy.get("tunedProposal")
    missing = []
    if tuned:
        selected = tuned["selection"]
        aliases, _, missing = A.selected_tuned_rows(
            cases, base, {"selected": selected}, types.SimpleNamespace(allow_partial=True), split=split)
        aliases = {(r["caseId"], r["method"]): r for r in aliases}
        # Task order matches the frozen helper's source order: C/doc, tuning, extra.
        ordered_tasks = base_tasks + stage_tasks.get("tuning-development", []) + stage_tasks["selected-presets-" + split]
        task_map = {t["id"]: t for t in ordered_tasks}
        for case in cases:
            for engine in case["engines"]:
                p = selected[engine]["presetIndex"]
                method = f"tuned:{engine}:RIGHT:p{p}"
                if p == 0:
                    task = task_map.get(f'C-{split}-{case["id"]}-{engine}-RIGHT')
                else:
                    task = next((t for t in ordered_tasks if t["caseId"] == case["id"] and A.method_key(t) == method), None)
                if task is None:
                    task = {"id": None, "caseId": case["id"], "family": case["family"], "split": split,
                            "stage": "unavailable selected-preset definition", "sourcePath": case["path"]}
                alias = aliases.get((case["id"], method))
                if alias and alias["id"] != task["id"]:
                    raise ValueError(f"Planned alias differs from frozen replay: {case['id']}/{method}")
                logical.append((task, method, alias, True))
    return logical, stage_rows, stage_tasks, infos, missing, policy


def materialize(logical, cases, split, profiles):
    by_case = {c["id"]: c for c in cases}
    cache, gaps, rows = {}, [], []
    seen = set()
    for task, method, result, selected_alias in logical:
        key = (task["caseId"], method)
        if key in seen:
            raise ValueError(f"More than one observation per base/method: {key}")
        seen.add(key)
        case = by_case[task["caseId"]]
        metrics = result.get("metrics", {}) if result else {}
        status = result.get("status", "unavailable") if result else "unavailable"
        valid = bool(result and A.is_valid(result))
        trial = result["id"] if result else task.get("id")
        source = task.get("sourcePath", case["path"])
        values = {k: metrics.get(k) for k in RAW_METRICS}
        values.update({"balancedDIper10": metrics.get("weightingScores", {}).get("balanced"),
                       "directDIper10": metrics.get("weightingScores", {}).get("direct"),
                       "traceableDIper10": metrics.get("weightingScores", {}).get("traceable")})
        for name, value in metrics.get("counts", {}).items():
            values["issueCount." + name] = value
        timing = result.get("timing", {}) if result else {}
        for name, source_name in zip(RUNTIME_METRICS, ["compileMs", "routingMs", "labelMs", "totalMs", "workerMs"]):
            values[name] = timing.get(source_name)
        group, coverage = saved_group_details(result, cache, gaps)
        values.update({name: group.get(name) for name in GROUP_METRICS})
        rows.append({"split": split, "family": case["family"], "caseId": case["id"],
                     "common": case["common"], "sizeBand": case.get("sizeBand"),
                     "method": method, "table": "current-source" if method == "current" else "engine-method",
                     "stage": task.get("stage"), "trial": trial, "status": status, "hardValid": valid,
                     "selectedPresetAnalysisAlias": selected_alias,
                     "physicalExecutionKey": trial, "sourcePath": source,
                     "geometryPath": result.get("geometry") if result else None,
                     "layoutCheckpointPath": result.get("layoutCheckpoint") if result else None,
                     "timeoutPhase": result.get("timeoutPhase") if result else None,
                     "error": result.get("error") if result else None,
                     "reportedTrialBudgetMs": result.get("trialBudgetMs") if result else None,
                     "routingCacheHit": result.get("routingCacheHit") if result else None,
                     "metrics": values, "rawIssueCounts": metrics.get("counts", {}),
                     "hardFailures": result.get("hard", []) if result else [],
                     "intentFailures": result.get("intent", {}).get("failures", []) if result else [],
                     "savedGroupFill": group.get("savedGroupFill"), "savedGroupPadding": group.get("savedGroupPadding"),
                     "groupDetailCoverage": coverage,
                     "profileReferences": profiles.get((trial, method), []),
                     "measurementCoverage": metrics.get("measurementCoverage", {})})
    # Absent issue kinds are zero only where a complete measurement was saved.
    issue_names = sorted({k for r in rows for k in r["metrics"] if k.startswith("issueCount.")})
    for row in rows:
        for name in issue_names:
            row["metrics"].setdefault(name, 0 if row["status"] == "ok" else None)
    return rows, gaps


def aggregate(rows, cases):
    groups = collections.defaultdict(list)
    for row in rows:
        groups[(row["family"], row["method"])].append(row)
    family_bases = collections.Counter(c["family"] for c in cases)
    summaries, long_rows, ledger = [], [], []
    for (family, method), observations in sorted(groups.items()):
        common = {"split": observations[0]["split"], "family": family, "method": method,
                  "table": observations[0]["table"], "familyBaseCount": family_bases[family]}
        summary = {**common, **counts(observations),
                   "baseIds": sorted(r["caseId"] for r in observations),
                   "physicalTrialIds": sorted({r["trial"] for r in observations if r["trial"]}),
                   "cacheHitsAmongCompleted": sum(r["status"] == "ok" and r["routingCacheHit"] is True for r in observations),
                   "cacheMissesAmongCompleted": sum(r["status"] == "ok" and r["routingCacheHit"] is False for r in observations),
                   "cacheUnknownAmongCompleted": sum(r["status"] == "ok" and r["routingCacheHit"] is None for r in observations),
                   "statistics": {}}
        names = sorted({k for r in observations for k in r["metrics"]})
        for cohort, eligible in [("completed-only", [r for r in observations if r["status"] == "ok"]),
                                 ("hard-valid-only", [r for r in observations if r["hardValid"]])]:
            summary["statistics"][cohort] = {}
            for metric in names:
                stat = describe([r["metrics"].get(metric) for r in eligible], len(eligible))
                summary["statistics"][cohort][metric] = stat
                long_rows.append({**common, "cohort": cohort, "metric": metric,
                                  "screeningRuntimeOnly": metric in RUNTIME_METRICS, **stat})
                if metric in WORST_DIRECTIONS:
                    available = [r for r in eligible if finite(r["metrics"].get(metric))]
                    if available:
                        direction = WORST_DIRECTIONS[metric]
                        extreme = (max if direction == "high" else min)(r["metrics"][metric] for r in available)
                        # An all-zero defect count has no adverse witness. The
                        # zero maximum remains in the complete statistics table.
                        if direction == "high" and extreme == 0:
                            continue
                        if metric in ["alignment", "density", "groupFillMinimumWithinBase"] and extreme >= 1:
                            continue
                        tied = sorted([r for r in available if r["metrics"][metric] == extreme], key=lambda r: (r["caseId"], r["trial"] or ""))
                        first = tied[0]
                        ledger.append({**common, "kind": "observed-tail-witness", "cohort": cohort,
                                       "metric": metric, "worseDirection": direction, "value": extreme,
                                       "caseId": first["caseId"], "trial": first["trial"],
                                       "status": first["status"], "hardValid": first["hardValid"],
                                       "tieCaseIds": [r["caseId"] for r in tied],
                                       "sourcePath": first["sourcePath"], "geometryPath": first["geometryPath"],
                                       "profileLookupPath": f"data/analysis/family-tails-{first['split']}-case-metrics.json",
                                       "interpretation": "observed maximum/minimum within a small family, not a population quantile guarantee"})
        for row in observations:
            if row["status"] != "ok" or not row["hardValid"]:
                ledger.append({**common, "kind": "execution-or-hard-failure", "cohort": "all-planned",
                               "caseId": row["caseId"], "trial": row["trial"], "status": row["status"],
                               "hardValid": row["hardValid"], "sourcePath": row["sourcePath"],
                               "geometryPath": row["geometryPath"], "layoutCheckpointPath": row["layoutCheckpointPath"],
                               "timeoutPhase": row["timeoutPhase"], "error": row["error"],
                               "hardFailures": row["hardFailures"], "intentFailures": row["intentFailures"],
                               "profileLookupPath": f"data/analysis/family-tails-{row['split']}-case-metrics.json"})
        summaries.append(summary)
    return summaries, long_rows, ledger


def number(value, digits=2):
    return "—" if value is None else f"{value:.{digits}f}"


def markdown_report(split, metadata, summaries, rows):
    current = [r for r in summaries if r["table"] == "current-source"]
    reuse_note = ("Selected presets reuse canonical tuning measurements and canonical C results for preset 0."
                  if split == "development" else
                  "Heldout selected presets use their frozen supplemental runs, with preset 0 reusing canonical heldout C results; development tuning outcomes are not read.")
    lines = [f"# {split.title()} family tails", "",
             "This is a reporting-only view of saved measurements. It does not fit a policy, change a score, or execute an algorithm.", "",
             "## Denominators and interpretation", "",
             f"The logical method pool contains **{metadata['logicalMethodObservations']} base/method observations**, drawn from **{metadata['physicalExecutionsUsed']['planned']} distinct physical trials** on **{metadata['baseCount']} bases**. {reuse_note} Reused rows do not add executions.", "",
             "Each family/method cell contains one observation per base. Candidate methods are repeated measurements of the same diagrams, not independent users or extra corpus cases. `completed` means status `ok`, even when a hard gate failed. `hardValid` applies the frozen geometry and source-intent gates. `unavailable` means a planned logical observation has no terminal result; inapplicable specialist cases are not silently counted as missing runs.", "",
             "Median, p90, and maximum are shown separately for completed-only and hard-valid-only observations. The p90 uses linear interpolation at (n−1)×0.9. With four development or two heldout bases per family, these are descriptive observed tails, not precise population estimates. Timeouts and failed trials remain in every planned denominator and in the failure ledger, but are not fabricated into numerical geometry scores.", "",
             "Screening runtime medians are cache affected and may also reflect parallel worker contention. Use `data/analysis/validation/timing.json` and `data/timing-sample-freeze.json` for the dedicated uncached timing experiment. Original timeout durations and missing recovered timings remain in the raw records.", "",
             "## Current-source family table", "",
             "All geometry statistics below use completed-only observations. The companion CSV/JSON tables also show hard-valid-only statistics.", "",
             "| Family | Planned | Completed | Hard valid | Timeout | Failed | Unavailable | DI/10 median / p90 / max | Crossings median / p90 / max | Route length median / p90 / max |",
             "|---|---:|---:|---:|---:|---:|---:|---|---|---|"]
    for row in current:
        stats = row["statistics"]["completed-only"]
        triples = []
        for metric in ["diPer10", "crossings", "routeLength"]:
            s = stats[metric]
            triples.append(" / ".join(number(s[key]) for key in ["median", "p90", "maximum"]))
        lines.append("| " + " | ".join([row["family"], str(row["planned"]), str(row["completed"]), str(row["hardValid"]),
                                                   str(row["timedOut"]), str(row["failed"]), str(row["unavailable"])] + triples) + " |")
    failures = [r for r in rows if r["method"] == "current" and (r["status"] != "ok" or not r["hardValid"])]
    lines += ["", "## Concrete current-source failures", "",
              "| Case | Terminal status | Hard defects | Required intent failures | Saved evidence |",
              "|---|---|---:|---:|---|"]
    if failures:
        for row in failures:
            evidence = row["geometryPath"] or row["layoutCheckpointPath"] or "raw terminal record only"
            lines.append(f"| {row['caseId']} | {row['status']} | {number(row['metrics'].get('hardDefects'),0)} | {number(row['metrics'].get('requiredIntentFailures'),0)} | `{evidence}` |")
    else:
        lines.append("| No observed current-source execution or hard failures | — | — | — | — |")
    lines += ["", "## Saved detail and limitations", "",
              "Group density is reported from the frozen metric's saved `groupFill` values: the sum of child rectangle areas divided by their enclosing child span. Within-base summaries are computed before family summaries, so diagrams with more groups do not become extra observations. Alignment is the saved per-diagram fraction of visible nodes aligned with another node; a distinct per-group alignment metric was not measured. Group padding spread excludes the top header margin, matching the saved metric's left/right/bottom convention.", "",
              "Raw defect index, normalized DI per 10 edges, crossings, bends, route length, area, label counts and defects, detours, density, alignment, and hard layout/routing defects remain available. Extent and route-length maxima are scale-sensitive descriptors, not additional quality gates. Lower density or alignment witnesses are descriptive and do not introduce new pass/fail thresholds.", "",
              f"Saved group-detail gaps: **{len(metadata['groupDetailGaps'])}**. Existing per-case profile score rows are referenced by file, trial, method, profile, and CSV line; scores are not recalculated here.", "",
              "## Files", "",
              f"- `family-tails-{split}.json`: metadata and nested family/method statistics.",
              f"- `family-tails-{split}-current-source.csv`: current-source counts and both statistic cohorts.",
              f"- `family-tails-{split}-engine-methods.csv`: all other methods, with their own base denominators.",
              f"- `family-tails-{split}-statistics-long.csv`: one family/method/cohort/metric per row.",
              f"- `family-tails-{split}-case-metrics.json` and `.csv`: one logical base/method observation, physical trial key, raw metrics, and profile links.",
              f"- `family-tails-{split}-worst-cases.json` and `.csv`: observed tail witnesses and every execution/hard failure.", ""]
    return "\n".join(lines)


def selfcheck():
    assert quantile([1, 2, 3, 4], .9) == 3.7
    assert quantile([1], .9) == 1
    assert quantile([], .9) is None
    assert describe([1, None, 3], 3) == {"n": 2, "eligibleBases": 3, "missing": 1, "minimum": 1, "median": 2.0, "p90": 2.8, "maximum": 3}
    rows = [{"status": "ok", "hardValid": True}, {"status": "ok", "hardValid": False},
            {"status": "timed_out", "hardValid": False}, {"status": "failed", "hardValid": False},
            {"status": "unavailable", "hardValid": False}]
    c = counts(rows)
    assert (c["planned"], c["terminal"], c["completed"], c["hardValid"], c["hardInvalidCompleted"], c["timedOut"], c["failed"], c["unavailable"]) == (5, 4, 2, 1, 1, 1, 1, 1)
    return {"checks": 5, "passed": 5, "engineCalls": 0, "metricCalls": 0,
            "scope": "descriptive quantiles, missing values, and mutually explicit execution denominators"}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--split", choices=["development", "heldout"], default="development")
    parser.add_argument("--selfcheck", action="store_true")
    args = parser.parse_args()
    if args.selfcheck:
        print(json.dumps(selfcheck()))
        return
    split = args.split
    if split == "heldout":
        A.frozen_policy()
    manifest = A.read_json(ROOT / "corpus/manifest.json")
    cases = [c for c in manifest["cases"] if c["split"] == split]
    frozen = A.read_json(ROOT / "data/policy-freeze.json")
    protected = ["evaluation/analyze-portfolio.py", "evaluation/metrics.mjs", "data/policy-freeze.json", "corpus/manifest.json"]
    before = {name: sha(ROOT / name) for name in protected}
    if frozen["frozenCodeHashes"]["evaluation/analyze-portfolio.py"] != before["evaluation/analyze-portfolio.py"]:
        raise ValueError("Frozen portfolio loader changed; refusing reporting replay")
    if frozen["frozenCodeHashes"]["evaluation/metrics.mjs"] != before["evaluation/metrics.mjs"]:
        raise ValueError("Frozen metric changed; refusing reporting replay")
    profiles, profile_inputs = profile_index(split)
    logical, stage_rows, stage_tasks, inputs, missing_aliases, policy = planned_pool(split, cases)
    rows, gaps = materialize(logical, cases, split, profiles)
    summaries, long_rows, ledger = aggregate(rows, cases)
    physical = {}
    for row in rows:
        if row["physicalExecutionKey"]:
            physical.setdefault(row["physicalExecutionKey"], row)
    stages = []
    for stem, tasks in stage_tasks.items():
        byid = {r["id"]: r for r in stage_rows[stem]}
        samples = [{"status": byid[t["id"]]["status"] if t["id"] in byid else "unavailable",
                    "hardValid": bool(t["id"] in byid and A.is_valid(byid[t["id"]]))} for t in tasks]
        stages.append({"stem": stem, **counts(samples),
                       "physicalTrialsUsedInLogicalPool": sum(t["id"] in physical for t in tasks),
                       "excludedOtherTuningConfigurations": sum(t["id"] not in physical for t in tasks)})
    all_input_ids = {t["id"] for tasks in stage_tasks.values() for t in tasks}
    metadata = {"schema": "draftably-family-tails-1", "split": split,
                "createdAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                "reportingCodeSha256": sha(__file__), "createdAfterPolicyFreeze": True,
                "reportingOnly": True, "policyFitted": False, "engineCalls": 0, "metricCalls": 0,
                "baseCount": len(cases), "familyCount": len({c['family'] for c in cases}),
                "logicalMethodObservations": len(rows), "physicalExecutionsUsed": counts(list(physical.values())),
                "inputDistinctPlannedPhysicalExecutions": len(all_input_ids), "inputStageCounts": stages,
                "selectedPresetAliases": sum(r["selectedPresetAnalysisAlias"] for r in rows),
                "duplicateLogicalAliasesOfExistingPhysicalTrials": len(rows) - len(physical),
                "selectedPresetAliasesMissing": missing_aliases, "inputs": inputs,
                "profileInputs": profile_inputs, "groupDetailGaps": gaps,
                "existingProfileObservationKeys": len(profiles),
                "observationsMissingExistingProfileReferences": sum(not r['profileReferences'] for r in rows),
                "canonicalRule": "first terminal row per physical trial; later attempts never improve coverage",
                "unitOfAnalysis": "one base diagram within each split/family/method; candidate methods are repeated observations, not users",
                "selectedPresetRule": "same frozen selected_tuned_rows helper as portfolio analysis; p0 reuses canonical C, selected nondefault presets reuse tuning cases and supplemental runs",
                "cohorts": {"completed-only": "status ok, including hard-invalid completed outcomes", "hard-valid-only": "status ok and frozen geometry/source-intent hard gates pass"},
                "quantileRule": "p90 linear interpolation at (n-1)*0.9; descriptive small-sample tail",
                "runtimeRule": "screening descriptive/cache affected; completed/valid only; null timings remain missing; no fabricated geometry or latency for timeouts",
                "performanceEvidence": ["data/analysis/validation/timing.json", "data/timing-sample-freeze.json"],
                "densityAlignmentRule": "saved groupFill summarized within each base; saved alignment is diagram-level, not an unmeasured group-specific statistic",
                "witnessLedgerRule": "positive observed maxima for adverse/high metrics and subunit minima for density/alignment; zero maxima remain in full summary tables; case/method/trial keys resolve raw profile links in case-metrics JSON",
                "protectedFileHashes": before,
                "limitations": ["Four development or two heldout bases per family are too few for precise population tail claims.",
                                "Raw area, route length, and crossing counts depend on diagram size; normalized metrics and case IDs remain available.",
                                "Logical method totals contain correlated measurements and must not be interpreted as independent user counts.",
                                "Failed/timed-out/unavailable runs remain in denominator but have no fabricated completed geometry scores.",
                                "Snapshot archive details are accepted only when their saved scalar metrics match canonical rows.",
                                "Supplementary cell-access audit is separate and never changes these frozen metrics."]}
    prefix = ROOT / "data/analysis" / ("family-tails-" + split)
    A.dump(str(prefix) + ".json", {"metadata": metadata, "families": summaries})
    flat = []
    for row in summaries:
        f = {k: v for k, v in row.items() if k != "statistics"}
        for cohort, metrics in row["statistics"].items():
            for name, stats in metrics.items():
                for statistic, value in stats.items():
                    f[cohort + "." + name + "." + statistic] = value
        flat.append(f)
    A.write_csv(str(prefix) + "-current-source.csv", [r for r in flat if r["table"] == "current-source"])
    A.write_csv(str(prefix) + "-engine-methods.csv", [r for r in flat if r["table"] == "engine-method"])
    A.write_csv(str(prefix) + "-statistics-long.csv", long_rows)
    A.dump(str(prefix) + "-case-metrics.json", rows)
    A.write_csv(str(prefix) + "-case-metrics.csv", [{**{k: v for k, v in r.items() if k != "metrics"}, **r["metrics"]} for r in rows])
    A.dump(str(prefix) + "-worst-cases.json", ledger)
    A.write_csv(str(prefix) + "-worst-cases.csv", ledger)
    pathlib.Path(str(prefix) + ".md").write_text(markdown_report(split, metadata, summaries, rows))
    after = {name: sha(ROOT / name) for name in protected}
    if before != after:
        raise ValueError("Protected input changed while reporting; report snapshot must be reviewed")
    for entry in profile_inputs:
        if sha(ROOT / entry["path"]) != entry["sha256"]:
            raise ValueError("Existing profile table changed while reporting; rerun from completed inputs")
    print(json.dumps({"split": split, "logicalObservations": len(rows), "physicalExecutionsUsed": metadata["physicalExecutionsUsed"],
                      "familyMethodCells": len(summaries), "tailWitnessesAndFailures": len(ledger),
                      "groupDetailGaps": len(gaps), "engineCalls": 0, "metricCalls": 0, "output": str(prefix) + ".json"}))


if __name__ == "__main__":
    main()
