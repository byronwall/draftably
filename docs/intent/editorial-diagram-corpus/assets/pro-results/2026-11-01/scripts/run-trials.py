#!/usr/bin/env python3
"""Run the unchanged Draftably CLI and supplied screenshot script; retain every log.

This is an orchestration script, not a renderer. It never edits a .draft file.
"""
from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import subprocess
import time


def run(argv: list[str], cwd: Path, folder: Path, name: str, env: dict) -> dict:
    started = dt.datetime.now(dt.timezone.utc).isoformat()
    begin = time.monotonic()
    try:
        result = subprocess.run(argv, cwd=cwd, env=env, capture_output=True, timeout=180)
        stdout, stderr, code = result.stdout, result.stderr, result.returncode
    except subprocess.TimeoutExpired as exc:
        stdout, stderr, code = exc.stdout or b"", (exc.stderr or b"") + b"\nTIMEOUT after 180 seconds\n", 124
    except OSError as exc:
        stdout, stderr, code = b"", (str(exc) + "\n").encode(), 127
    (folder / f"{name}.stdout.log").write_bytes(stdout)
    (folder / f"{name}.stderr.log").write_bytes(stderr)
    record = dict(argv=argv, cwd=str(cwd), started_utc=started,
                  environment={k: env[k] for k in ("PLAYWRIGHT_BROWSERS_PATH", "DRAFTABLY_NO_UPDATE_CHECK") if k in env},
                  elapsed_seconds=round(time.monotonic() - begin, 4), exit_code=code)
    (folder / f"{name}.result.json").write_text(json.dumps(record, indent=2) + "\n")
    print(f"[{folder.parent.name}/{folder.name}] {name}: exit {code}", flush=True)
    return record


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("case", type=Path, help="corpus/<slug> folder")
    parser.add_argument("--baseline", type=Path, required=True)
    parser.add_argument("--stages", nargs="+", default=["v0", "v1", "v2"])
    parser.add_argument("--no-shoot", action="store_true")
    parser.add_argument("--sheet", action="store_true")
    args = parser.parse_args()
    case, baseline = args.case.resolve(), args.baseline.resolve()
    output = Path(__file__).resolve().parents[1]
    env = os.environ.copy()
    env["DRAFTABLY_NO_UPDATE_CHECK"] = "1"
    run_id = dt.datetime.now(dt.timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
    records = []
    failed = False
    for stage in args.stages:
        source = case / f"{stage}.draft"
        if not source.is_file():
            print(f"Missing {source}; not marked complete.", flush=True)
            failed = True
            continue
        sha = hashlib.sha256(source.read_bytes()).hexdigest()
        log = output / "logs" / case.name / stage / run_id
        log.mkdir(parents=True, exist_ok=True)
        (log / "source.draft").write_bytes(source.read_bytes())
        # The first successful v0 is frozen below; existing freezes are never rewritten.
        frozen = case / "v0-frozen.json"
        if stage == "v0" and frozen.exists() and json.loads(frozen.read_text())["sha256"] != sha:
            raise SystemExit("Refusing to rerun a changed frozen v0 source: " + str(source))
        command = ["pnpm", "--silent", "draftably"]
        checks = {}
        checks["check"] = run(command + ["check", str(source)], baseline, log, "check", env)
        checks["inspect"] = run(command + ["inspect", str(source), "--json", "--metrics"],
                                baseline, log, "inspect", env)
        if checks["inspect"]["exit_code"] == 0:
            (case / f"{stage}.geometry.json").write_bytes((log / "inspect.stdout.log").read_bytes())
        checks["svg"] = run(command + ["inspect", str(source), "--svg"], baseline, log, "svg", env)
        if checks["svg"]["exit_code"] == 0:
            (case / f"{stage}.svg").write_bytes((log / "svg.stdout.log").read_bytes())
        if not args.no_shoot:
            checks["shoot"] = run(["pnpm", "--silent", "shoot", str(source), str(case / f"{stage}.png")],
                                  baseline, log, "shoot", env)
        successful = len(checks) == 4 and all(r["exit_code"] == 0 for r in checks.values())
        failed = failed or any(r["exit_code"] != 0 for r in checks.values())
        if stage == "v0" and successful and not frozen.exists():
            frozen.write_text(json.dumps(dict(sha256=sha, frozen_utc=run_id), indent=2) + "\n")
        record = dict(stage=stage, source_sha256=sha, run_id=run_id,
                      log=str(log.relative_to(output)), commands=checks)
        records.append(record)
        (case / f"{stage}.validation.json").write_text(json.dumps(record, indent=2) + "\n")
    if args.sheet and not failed and not args.no_shoot:
        log = output / "logs" / case.name / "comparison" / run_id
        log.mkdir(parents=True, exist_ok=True)
        targets = [f"Reference::{case / 'reference-preview.png'}",
                   f"v0 — default::{case / 'v0.png'}", f"v2 — refined::{case / 'v2.png'}"]
        sheet = run(["pnpm", "--silent", "shoot", "--sheet", str(case / "comparison.png"),
                     "--cols", "3", *targets], baseline, log, "sheet", env)
        failed = failed or sheet["exit_code"] != 0
    print(json.dumps({"case": case.name, "stages_run": len(records), "failed": failed}), flush=True)
    if failed:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
