#!/usr/bin/env python3
"""Package measured evidence with relative paths and verify every archived byte.

No geometry, statistics, policy selection or product code is executed here.
The ZIP and its verification JSON are written outside the bundle directory.
"""
from __future__ import annotations
import argparse
import collections
import datetime
import hashlib
import json
from pathlib import Path
import re
import urllib.parse
import zipfile

ROOT = Path(__file__).resolve().parents[1]
PREFIX = 'draftably-evaluation'

def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()

def eligible(path: Path) -> bool:
    rel = path.relative_to(ROOT)
    return path.is_file() and '__pycache__' not in rel.parts and path.suffix != '.pyc' and rel.as_posix() != 'MANIFEST.sha256'

def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--output', type=Path, default=ROOT.parent/'draftably-evaluation-2026-11-02.zip')
    args = ap.parse_args()
    output = args.output.resolve()
    if output.is_relative_to(ROOT):
        raise SystemExit('Archive must be outside the bundle to prevent recursion.')
    required = ['report.md','inventory.csv','evaluation-method.md','visual-review.md','ui-recommendation.md','implementation-plan.md','corpus/manifest.json','data/execution-summary.json','evaluation/replay-all.sh','baseline-packet/source-packet.zip']
    assert all((ROOT/p).is_file() for p in required)
    summary = json.loads((ROOT/'data/execution-summary.json').read_text())
    assert summary['complete'] and summary['registeredDistinctTrials'] == summary['canonicalTerminalTrials'] == 8203
    assert summary['canonicalStatuses'] == {'ok':7731,'timed_out':452,'failed':20}
    validation = json.loads((ROOT/'data/analysis/inventory-csv-validation.json').read_text())
    assert validation['passed'] and validation['sha256'] == sha((ROOT/'inventory.csv').read_bytes())
    visual = json.loads((ROOT/'data/analysis/visual-agreement-all.json').read_text())
    assert visual['pairs'] == 63
    audit = json.loads((ROOT/'data/analysis/final-accounting-audit.json').read_text())
    assert audit['checks'] and all(value is True for value in audit['checks'].values())
    # The final audit is retained intact; its detailed checks are human-readable.
    docs = sorted(ROOT.glob('*.md')) + [ROOT/'evaluation/README.md']
    missing_links = []
    links_checked = 0
    for doc in docs:
        content = doc.read_text()
        assert not re.search(r'\{\{[A-Z_]+\}\}', content), f'Placeholder in {doc}'
        for target in re.findall(r'\]\(([^\s)]+)(?:\s+[^)]*)?\)', content):
            if target.startswith(('http:','https:','#','mailto:','sandbox:','visualize:')):
                continue
            target = urllib.parse.unquote(target.split('#')[0])
            links_checked += 1
            if not (doc.parent/target).exists():
                missing_links.append({'file':str(doc.relative_to(ROOT)),'target':target})
    assert not missing_links, missing_links
    assert not any(p.is_symlink() for p in ROOT.rglob('*')), 'Unexpected symlink in evidence tree'
    readiness = {
        'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),
        'registeredTrialCount':summary['canonicalTerminalTrials'],
        'canonicalStatuses':summary['canonicalStatuses'],
        'mainReportsWithoutPlaceholders':len(docs),
        'relativeReportLinksChecked':links_checked,
        'missingRelativeReportLinks':missing_links,
        'inventoryRows':validation['records'],
        'inventoryValidationPassed':validation['passed'],
        'frozenVisualPairs':visual['pairs'],
        'geometryAlgorithmsExecutedByPackaging':0,
        'excludedReproducibleIntermediates':['__pycache__ directories','*.pyc'],
        'archivePrefix':PREFIX,
        'finalIndependentAudit':'evaluation/final-accounting-audit.md'
    }
    (ROOT/'data/package-readiness.json').write_text(json.dumps(readiness,indent=2)+'\n')
    files = sorted((p for p in ROOT.rglob('*') if eligible(p)), key=lambda p:p.relative_to(ROOT).as_posix())
    expected = {p.relative_to(ROOT).as_posix():sha(p.read_bytes()) for p in files}
    manifest = ''.join(f'{digest}  {name}\n' for name,digest in expected.items())
    manifest_path = ROOT/'MANIFEST.sha256'
    manifest_path.write_text(manifest)
    all_files = files + [manifest_path]
    with zipfile.ZipFile(output,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6,allowZip64=True) as archive:
        for path in all_files:
            archive.write(path, PREFIX+'/'+path.relative_to(ROOT).as_posix())
    with zipfile.ZipFile(output) as archive:
        assert len(archive.namelist()) == len(all_files)
        assert len(set(archive.namelist())) == len(all_files)
        assert archive.testzip() is None
        for name,digest in expected.items():
            assert sha(archive.read(PREFIX+'/'+name)) == digest, name
        assert archive.read(PREFIX+'/MANIFEST.sha256') == manifest_path.read_bytes()
    groups = collections.Counter(p.relative_to(ROOT).parts[0] if len(p.relative_to(ROOT).parts)>1 else 'top-level reports' for p in files)
    result = {
        **readiness,
        'archive':str(output),
        'archiveBytes':output.stat().st_size,
        'archiveSha256':sha(output.read_bytes()),
        'filesIncludingManifest':len(all_files),
        'filesWithSha256':len(expected),
        'uncompressedBytes':sum(p.stat().st_size for p in all_files),
        'contentGroups':dict(groups),
        'zipCrcCheckPassed':True,
        'allArchivedContentHashesMatch':True,
        'manifestSha256':sha(manifest_path.read_bytes())
    }
    verification = output.with_suffix('.verification.json')
    verification.write_text(json.dumps(result,indent=2)+'\n')
    print(json.dumps(result,indent=2))

if __name__ == '__main__':
    main()
