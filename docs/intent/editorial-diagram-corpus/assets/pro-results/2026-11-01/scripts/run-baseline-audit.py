#!/usr/bin/env python3
"""Run the original historical audit using an explicit v1/e1, v2/e2 filename adapter.

Only the temporary filenames change. The application, audit script and source bytes do not.
The audit's heuristic defect index is supplemental; the visual reviews remain authoritative.
"""
from pathlib import Path
import argparse
import datetime as dt
import json
import os
import subprocess
import tempfile
import shutil


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--baseline", type=Path, required=True)
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    out = root / "baseline-audit"
    out.mkdir(exist_ok=True)
    if (out / "run.json").exists():
        previous = json.loads((out / "run.json").read_text())
        stamp = previous.get("started_utc", "previous").replace(":", "").replace("+", "_")
        archived = out / "trials" / stamp
        archived.mkdir(parents=True, exist_ok=True)
        for name in ("run.json", "stdout.log", "stderr.log"):
            if (out / name).exists():
                shutil.copy2(out / name, archived / name)
    mapping = []
    with tempfile.TemporaryDirectory(prefix="draftably-editorial-audit-") as td:
        stage_root = Path(td)
        for folder in sorted((root / "corpus").iterdir()):
            if not folder.is_dir():
                continue
            target = stage_root / folder.name
            target.mkdir()
            for stage, adapted in [("v0", "v0"), ("v1", "e1"), ("v2", "e2")]:
                source = folder / f"{stage}.draft"
                if not source.exists():
                    continue
                (target / f"{adapted}.draft").symlink_to(source)
                mapping.append({"case": folder.name, "audit_name": adapted + ".draft",
                                "corpus_name": stage + ".draft"})
        argv = ["node", "scripts/diagram-audit.mjs", str(stage_root), str(out), "--no-shots"]
        env = os.environ.copy()
        env["DRAFTABLY_NO_UPDATE_CHECK"] = "1"
        begun = dt.datetime.now(dt.timezone.utc).isoformat()
        result = subprocess.run(argv, cwd=args.baseline.resolve(), env=env, capture_output=True)
        (out / "stdout.log").write_bytes(result.stdout)
        (out / "stderr.log").write_bytes(result.stderr)
        (out / "run.json").write_text(json.dumps({"argv": argv, "started_utc": begun,
                                                "exit_code": result.returncode,
                                                "mapping": mapping}, indent=2) + "\n")
        print(result.stdout.decode(errors="replace"))
        print("Historical audit exit:", result.returncode)
        if result.returncode:
            raise SystemExit(result.returncode)


if __name__ == "__main__":
    main()
