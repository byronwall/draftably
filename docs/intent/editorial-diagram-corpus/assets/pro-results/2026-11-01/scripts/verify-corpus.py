#!/usr/bin/env python3
"""Verify deliverable integrity and execution evidence without changing the baseline."""
from pathlib import Path
import argparse
import csv
import datetime as dt
import hashlib
import json
import runpy
import xml.etree.ElementTree as ET
from PIL import Image

def sha(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--baseline',type=Path,required=True)
    args=parser.parse_args()
    root=Path(__file__).resolve().parents[1]
    effort=runpy.run_path(str(root/'scripts/aggregate.py'))['effort']
    issues=[]
    required_root=['README.md','report.md','gap-audit.md','implementation-plan.md','sources.csv','candidate-log.csv',
                   'coverage.md','methodology.md','effort-audit.md','source-read-log.md','remaining-work.md',
                   'file-register.md','index.html','gap-mapping.csv','effort.csv','ratings.csv','validation.csv',
                   'summary.json','execution-summary.json']
    missing=[name for name in required_root if not (root/name).is_file()]
    if missing:issues.append({'missing_root_deliverables':missing})
    packet=json.loads((root/'logs/baseline-integrity.json').read_text())
    mismatches=[x['path'] for x in packet['files'] if not (args.baseline/x['path']).is_file() or sha(args.baseline/x['path'])!=x['sha256']]
    if mismatches:issues.append({'baseline_mismatches':mismatches})
    cases=[]
    for p in sorted((root/'corpus').glob('*/item.json'),key=lambda p:json.loads(p.read_text())['id']):
        d=json.loads(p.read_text());folder=p.parent;cid=d['id'];bad=[]
        expected=['reference-preview.png','source.md','audit.md','review.json','v0-frozen.json',
                  'comparison.png','comparison.validation.json','detail-selection.json','details/comparison.png','details/validation.json']
        expected += [f'{s}.{ext}' for s in ['v0','v1','v2'] for ext in ['draft','svg','png','geometry.json','validation.json']]
        bad += ['missing '+n for n in expected if not (folder/n).is_file()]
        originals=list(folder.glob('reference.*'))
        if len(originals)!=1:bad.append(f'{len(originals)} original files')
        elif d.get('reference_sha256') and sha(originals[0])!=d['reference_sha256']:bad.append('original hash mismatch')
        if (folder/'v0-frozen.json').exists() and json.loads((folder/'v0-frozen.json').read_text())['sha256']!=sha(folder/'v0.draft'):bad.append('v0 drift')
        for s in ['v0','v1','v2']:
            if not (folder/f'{s}.validation.json').exists():continue
            v=json.loads((folder/f'{s}.validation.json').read_text())
            if v.get('source_sha256')!=sha(folder/f'{s}.draft'):bad.append(s+' source/run hash mismatch')
            for command in ['check','inspect','svg','shoot']:
                if v.get('commands',{}).get(command,{}).get('exit_code')!=0:bad.append(s+' '+command+' not successful')
            log=root/v.get('log','missing-log')
            for name in ['source.draft']+[f'{command}.{ext}' for command in ['check','inspect','svg','shoot'] for ext in ['stdout.log','stderr.log','result.json']]:
                if not (log/name).is_file():bad.append(s+' missing execution log '+name)
            if (log/'source.draft').is_file() and sha(log/'source.draft')!=sha(folder/f'{s}.draft'):bad.append(s+' recorded source differs')
            for ext,stdout in [('svg','svg.stdout.log'),('geometry.json','inspect.stdout.log')]:
                if (log/stdout).is_file() and (folder/f'{s}.{ext}').is_file() and sha(log/stdout)!=sha(folder/f'{s}.{ext}'):
                    bad.append(s+' output differs from successful '+stdout)
            try:ET.parse(folder/f'{s}.svg')
            except Exception as e:bad.append(s+' SVG '+str(e))
        if (folder/'v0.draft').exists() and effort(folder/'v0.draft')['v0_restriction_violations']:bad.append('v0 forbidden controls')
        for name in ['comparison.validation.json','details/validation.json']:
            if not (folder/name).exists():continue
            v=json.loads((folder/name).read_text())
            for source,recorded in v.get('source_sha256',{}).items():
                if sha(folder/source)!=recorded:bad.append(name+' stale '+source)
            if name.startswith('details'):
                if v.get('status')!='complete':bad.append('details incomplete')
                if set(v.get('commands',{}))!={'reference','v0','v2','sheet'} or any(c.get('exit_code')!=0 for c in v.get('commands',{}).values()):bad.append('detail command failure/incomplete')
                if v.get('selection_sha256')!=sha(folder/'detail-selection.json'):bad.append('detail selector changed after crop')
            elif v.get('command',{}).get('exit_code')!=0:bad.append('comparison command not successful')
        for image in list(folder.glob('*.png'))+list((folder/'details').glob('*.png')):
            try:
                with Image.open(image) as im:im.verify()
            except Exception as e:bad.append(str(image.relative_to(folder))+' '+str(e))
        if (folder/'review.json').exists():
            review=json.loads((folder/'review.json').read_text())
            if not 0<=review.get('refinement_cycles',99)<=3:bad.append('refinement budget exceeded/unrecorded')
            for s in ['v0','v1','v2']:
                for axis in ['quality','fidelity','semantic']:
                    score=review.get('stages',{}).get(s,{}).get(axis,0)
                    if not 1<=score<=5:bad.append('missing/invalid rating '+s+'/'+axis)
        if bad:issues.append({'case':cid,'issues':bad})
        cases.append({'id':cid,'folder':folder.name,'verified':not bad})
    if {c['id'] for c in cases}!={f'E{i:02}' for i in range(1,31)}:issues.append('case ID set differs from E01–E30')
    for name,expected in [('sources.csv',30),('candidate-log.csv',39),('effort.csv',90),('ratings.csv',90),('validation.csv',90)]:
        if (root/name).is_file():
            with (root/name).open(newline='') as f:count=sum(1 for _ in csv.DictReader(f))
            if count!=expected:issues.append({'table':name,'rows':count,'expected':expected})
    result={'checked_utc':dt.datetime.now(dt.timezone.utc).isoformat(),'baseline_packet_files':len(packet['files']),
            'baseline_mismatches':mismatches,'cases':cases,'issues':issues,'passed':not issues}
    (root/'logs/final-verification.json').write_text(json.dumps(result,indent=2)+'\n')
    print(json.dumps({'passed':not issues,'cases':len(cases),'issues':issues},indent=2))
    if issues:raise SystemExit(1)

if __name__=='__main__':main()
