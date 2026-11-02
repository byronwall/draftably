"""Guard fixed original-experiment narratives against fresh replay results.

Dynamic analyzers do not need this guard. Reporting helpers with original-run
counts, examples, or conclusions must call require_original_report_inputs(ROOT)
before reading results or writing reports. Never regenerate the manifest during
a replay: its hashes identify the original historical evidence, including raw
timestamps and runtime fields, rather than merely equivalent geometry.
"""
from __future__ import annotations

import hashlib
import json
import pathlib


def _sha256(path):
    digest = hashlib.sha256()
    with path.open('rb') as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b''):
            digest.update(chunk)
    return digest.hexdigest()


def require_original_report_inputs(root):
    """Return the verified original-input manifest, or fail before report writes."""
    root = pathlib.Path(root).resolve()
    manifest_path = root / 'data/analysis/original-report-inputs.json'
    if not manifest_path.is_file():
        raise SystemExit(
            'Original-run reporting is blocked: data/analysis/original-report-inputs.json is missing. '
            'Use the dynamic core analyzers for fresh replay results; do not recreate this historical hash guard.'
        )
    manifest = json.loads(manifest_path.read_text())
    if manifest.get('schema') != 'draftably-original-report-inputs-1' or len(manifest.get('streams', [])) != 5:
        raise SystemExit('Original-run reporting is blocked: the original-input manifest is malformed.')
    checks = list(manifest['streams']) + list(manifest.get('immutableContext', []))
    mismatches = []
    for entry in checks:
        path = (root / entry['path']).resolve()
        if root not in path.parents:
            mismatches.append(entry['path'] + ': outside the deliverable root')
        elif not path.is_file():
            mismatches.append(entry['path'] + ': missing')
        else:
            actual = _sha256(path)
            if actual != entry['sha256']:
                mismatches.append(entry['path'] + ': raw SHA-256 differs from the original experiment')
    if mismatches:
        raise SystemExit(
            'Original-run reporting is blocked because the saved inputs changed:\n  - '
            + '\n  - '.join(mismatches)
            + '\nThis helper contains the original experiment narrative and must not overwrite reports for a fresh replay. '
            'Run the dynamic core analyzers (analyze-portfolio.py, analyze-dependencies.py, analyze-family-tails.py, '
            'and plot-portfolio.py) for new results. Raw timestamps intentionally make a new run distinct; '
            'do not regenerate or relax original-report-inputs.json to bypass this guard.'
        )
    return manifest


if __name__ == '__main__':
    root = pathlib.Path(__file__).resolve().parents[1]
    manifest = require_original_report_inputs(root)
    print(json.dumps({'originalRunInputsVerified': True, 'streams': len(manifest['streams']),
                      'immutableContextFiles': len(manifest.get('immutableContext', []))}))
