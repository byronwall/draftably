#!/usr/bin/env python3
"""Create declared detail crops with the baseline shoot script, never a replacement renderer."""
from pathlib import Path
import argparse
import concurrent.futures
import datetime as dt
import hashlib
import json
import os
import runpy
from PIL import Image


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--baseline', type=Path, required=True)
    parser.add_argument('--workers', type=int, default=2)
    parser.add_argument('--case', action='append', default=[])
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    baseline = args.baseline.resolve()
    run = runpy.run_path(str(root / 'scripts/run-trials.py'))['run']
    env = os.environ.copy()
    env['DRAFTABLY_NO_UPDATE_CHECK'] = '1'
    cases = [p for p in sorted((root / 'corpus').iterdir()) if p.is_dir() and
             (not args.case or p.name in args.case)]

    def capture(folder):
        selected = folder / 'detail-selection.json'
        if not selected.exists():
            return {'case': folder.name, 'status': 'missing-selection'}
        plan = json.loads(selected.read_text())
        run_id = dt.datetime.now(dt.timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
        log = root / 'logs' / folder.name / 'details' / run_id
        log.mkdir(parents=True, exist_ok=True)
        (log / selected.name).write_bytes(selected.read_bytes())
        output = folder / 'details'
        output.mkdir(exist_ok=True)
        commands = {}
        for stage, name in [('reference', 'reference-preview.png'), ('v0', 'v0.png'), ('v2', 'v2.png')]:
            image = folder / name
            crop = plan['crops'][stage]
            if len(crop) != 4 or not all(isinstance(v, (int, float)) for v in crop):
                raise ValueError(f'Invalid crop in {selected}: {stage}')
            x, y, w, h = crop
            with Image.open(image) as im:
                iw, ih = im.size
            if min(x, y) < 0 or min(w, h) <= 0 or x + w > iw or y + h > ih:
                raise ValueError(f'Crop outside source image: {folder.name}/{stage} {crop} vs {iw}x{ih}')
            commands[stage] = run(['pnpm', '--silent', 'shoot', str(image), str(output / f'{stage}.png'),
                '--crop', ','.join(str(v) for v in crop)], baseline, log, stage, env)
        if all(r['exit_code'] == 0 for r in commands.values()):
            commands['sheet'] = run(['pnpm', '--silent', 'shoot', '--sheet',
                str(output / 'comparison.png'), '--cols', '3',
                f"Reference detail::{output / 'reference.png'}",
                f"v0 detail::{output / 'v0.png'}", f"v2 detail::{output / 'v2.png'}"],
                baseline, log, 'sheet', env)
        result = {'case': folder.name, 'focus': plan['focus'], 'log': str(log.relative_to(root)),
                  'selection_sha256': hashlib.sha256(selected.read_bytes()).hexdigest(),
                  'source_sha256': {name: hashlib.sha256((folder / name).read_bytes()).hexdigest()
                                    for name in ('reference-preview.png', 'v0.png', 'v2.png')},
                  'commands': commands,
                  'status': 'complete' if len(commands) == 4 and all(r['exit_code'] == 0 for r in commands.values()) else 'incomplete'}
        (output / 'validation.json').write_text(json.dumps(result, indent=2) + '\n')
        return result

    with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as pool:
        records = list(pool.map(capture, cases))
    manifest = root / 'logs/detail-runs.json'
    prior = json.loads(manifest.read_text()) if manifest.exists() else []
    merged = {r['case']: r for r in prior}
    merged.update({r['case']: r for r in records})
    manifest.write_text(json.dumps(list(merged.values()), indent=2) + '\n')
    print(json.dumps({'complete': sum(r['status'] == 'complete' for r in records),
                      'incomplete': [r['case'] for r in records if r['status'] != 'complete']}, indent=2))
    if not records or any(r['status'] != 'complete' for r in records):
        raise SystemExit(1)


if __name__ == '__main__':
    main()
