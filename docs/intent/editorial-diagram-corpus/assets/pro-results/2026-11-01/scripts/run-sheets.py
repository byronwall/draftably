#!/usr/bin/env python3
"""Refresh final full comparisons with the original shoot tool and record image provenance."""
from pathlib import Path
import argparse
import concurrent.futures
import datetime as dt
import hashlib
import json
import os
import runpy


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--baseline', type=Path, required=True)
    parser.add_argument('--workers', type=int, default=2)
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    run = runpy.run_path(str(root / 'scripts/run-trials.py'))['run']
    env = os.environ.copy()
    env['DRAFTABLY_NO_UPDATE_CHECK'] = '1'
    def capture(folder):
        stamp = dt.datetime.now(dt.timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
        log = root / 'logs' / folder.name / 'final-comparison' / stamp
        log.mkdir(parents=True, exist_ok=True)
        names = ['reference-preview.png', 'v0.png', 'v2.png']
        hashes = {n: hashlib.sha256((folder / n).read_bytes()).hexdigest() for n in names}
        command = run(['pnpm', '--silent', 'shoot', '--sheet', str(folder / 'comparison.png'),
            '--cols', '3', f"Reference::{folder / names[0]}",
            f"v0 — default::{folder / names[1]}", f"v2 — refined::{folder / names[2]}"],
            args.baseline.resolve(), log, 'sheet', env)
        result = {'source_sha256': hashes, 'log': str(log.relative_to(root)), 'command': command}
        (folder / 'comparison.validation.json').write_text(json.dumps(result, indent=2) + '\n')
        return {'case': folder.name, 'exit_code': command['exit_code']}
    folders = sorted(p.parent for p in (root / 'corpus').glob('*/item.json'))
    with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as pool:
        results = list(pool.map(capture, folders))
    (root / 'logs/final-comparison-runs.json').write_text(json.dumps(results, indent=2) + '\n')
    print(json.dumps({'complete': sum(r['exit_code'] == 0 for r in results),
                      'failed': [r for r in results if r['exit_code']]}, indent=2))
    if not results or any(r['exit_code'] != 0 for r in results):
        raise SystemExit(1)


if __name__ == '__main__':
    main()
