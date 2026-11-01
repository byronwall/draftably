#!/usr/bin/env python3
"""Reproduce the positive atlas companions with the real pinned Draftably CLI.

No Python dependencies. Does not edit inputs or install dependencies. The repository's
normal CLI launcher may refresh dist-cli/. Failed/negative repros are intentionally
excluded. Use --structural-only for fast artifact integrity checks.
"""
from __future__ import annotations
import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
import csv
import hashlib
import json
import math
from pathlib import Path
import re
import shutil
import subprocess
import sys
import time
import xml.etree.ElementTree as ET

BASELINE = 'af70d8317797d5a522acffdd604819376a3ec893'
ENGINE_KEYS = ['rank-gap','group-gap','node-gap','boundary-pull','hierarchy-sweeps','edge-length','repulsion','flow-strength','alignment','compactness','grid-strength','ordering','fold','aspect','root']
ROUTING_KEYS = ['clearance','port-gap','edge-gap','bend-penalty','crossing-penalty','shared-penalty','parallel-penalty','port-stability','fanout-penalty','passes','corner-radius','standoff']
ENGINES = ['compound-flow','boundary-align','compound-spring','tidy','stress','force','flow','layered','tree','grid']

def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()

def load(path: Path):
    return json.loads(path.read_text())

def write(path: Path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False)+'\n')

def geometry_errors(data):
    problems=[]
    for node in data.get('nodes',[]):
        for key in ['x','y','w','h']:
            value=node.get(key)
            if not isinstance(value,(int,float)) or not math.isfinite(value):
                problems.append(f"node {node.get('id')}: {key}={value}")
        if isinstance(node.get('w'),(int,float)) and node['w']<0:
            problems.append(f"negative width: {node.get('id')}")
        if isinstance(node.get('h'),(int,float)) and node['h']<0:
            problems.append(f"negative height: {node.get('id')}")
    for edge in data.get('routes',[]):
        for point in edge.get('points',[]):
            for key in ['x','y']:
                value=point.get(key)
                if not isinstance(value,(int,float)) or not math.isfinite(value):
                    problems.append(f"route {edge.get('id')}: {key}={value}")
    return problems

def rectangles(data):
    return sorted([{k:n.get(k) for k in ['id','parent','x','y','w','h']} for n in data.get('nodes',[])],key=lambda n:n['id'])

def structural(root: Path, manifest):
    problems=[]
    rows=list(csv.DictReader((root/'coverage.csv').open(newline='')))
    ids=[r['id'] for r in rows]
    if len(set(ids))!=len(ids): problems.append('Duplicate coverage ID')
    if len(rows)!=manifest['coverage_entries']: problems.append('Coverage count differs from manifest')
    groups={g['id']:g for g in manifest['groups']}
    seen=set()
    for row in rows:
        for k,v in row.items():
            if not v: problems.append(f"Empty coverage field {row['id']}:{k}")
        for vid in row['visual_ids'].split(';'):
            if vid not in groups: problems.append(f"Unresolved visual: {row['id']}->{vid}")
            elif row['id'] not in groups[vid]['controls']: problems.append(f"Reverse coverage missing: {vid}->{row['id']}")
    for g in manifest['groups']:
        if not g.get('variants') and g['kind']!='nonvisual':
            problems.append('No visual/starting document: '+g['id'])
        variants=g.get('variants',[])+g.get('model_variants',[])
        for v in variants:
            for key,hashkey in [('source','source_sha256'),('render','svg_sha256')]:
                rel=v.get(key)
                if not rel: problems.append(f"Missing {key}: {g['id']}");continue
                p=root/rel
                if not p.is_file(): problems.append('Missing file: '+rel);continue
                seen.add(rel)
                if v.get(hashkey) and sha(p.read_bytes())!=v[hashkey]: problems.append('Hash mismatch: '+rel)
            if v.get('render') and (root/v['render']).exists():
                try:
                    svg=ET.fromstring((root/v['render']).read_text())
                    values=[float(x) for x in re.split('[ ,]+',svg.attrib['viewBox'])]
                    if len(values)!=4 or not all(math.isfinite(x) for x in values) or min(values[2:])<=0:
                        problems.append('Invalid SVG frame: '+v['render'])
                except Exception as exc: problems.append(f"Invalid SVG: {v.get('render')}: {exc}")
            if v.get('geometry'):
                problems.extend([v['source']+': '+e for e in geometry_errors(v['geometry'])])
        for sub in g.get('subcomparisons',[]):
            paths={Path(v['source']).name for v in g.get('variants',[])}
            if sub['reference'] not in paths: problems.append(f"Missing subcomparison reference: {g['id']} {sub['reference']}")
            if not set(sub['files'])<=paths: problems.append('Missing subcomparison variant: '+g['id'])
    return {'coverage_rows':len(rows),'groups':len(groups),'referenced_files':len(seen),'problems':problems}

def verify_repo(repo:Path,root:Path):
    problems=[]
    ledger=load(root/'evidence/baseline-source-hashes.json')
    for rel,expected in ledger['reproduction_source_hashes'].items():
        p=repo/rel
        if not p.is_file(): problems.append('Missing baseline source: '+rel)
        elif sha(p.read_bytes())!=expected: problems.append('Different baseline source: '+rel)
    source=(repo/'src/dsl/syntax.ts').read_text()
    for name,expected in [('ENGINE_PARAMS',ENGINE_KEYS),('ROUTING_PARAMS',ROUTING_KEYS)]:
        body=re.search(r'export const '+name+r'[^=]*=\s*\{(.*?)\n\};',source,re.S)
        got=re.findall(r"^  (?:'([^']+)'|([\w]+)):\s*\{",body.group(1),re.M) if body else []
        got=[a or b for a,b in got]
        if got!=expected: problems.append(name+' registry drift: '+repr(got))
    block=re.search(r'export const ENGINES[^=]*=\s*\[(.*?)\];',source,re.S)
    engines=re.findall(r"'([^']+)'",block.group(1)) if block else []
    if engines!=ENGINES: problems.append('ENGINES registry drift')
    return problems

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--repo',type=Path,help='Exact baseline checkout with frozen pnpm dependencies')
    parser.add_argument('--out',type=Path,default=Path('atlas-run'),help='New output directory, outside the delivered package')
    parser.add_argument('--jobs',type=int,default=3,help='Independent CLI workers (1–8)')
    parser.add_argument('--only',default='',help='Optional source-path substring, e.g. page-drafts/')
    parser.add_argument('--structural-only',action='store_true')
    args=parser.parse_args()
    root=Path(__file__).resolve().parent
    out=args.out.resolve()
    if out==root or root in out.parents:
        parser.error('--out must be outside this delivered artifact directory')
    manifest=load(root/'atlas-manifest.json')
    audit=structural(root,manifest)
    out.mkdir(parents=True,exist_ok=True)
    write(out/'structural.json',audit)
    if audit['problems']:
        print(json.dumps(audit,indent=2));return 1
    if args.structural_only:
        print(json.dumps(audit,indent=2));return 0
    if not args.repo:
        parser.error('--repo is required unless --structural-only is used')
    repo=args.repo.resolve()
    problems=verify_repo(repo,root)
    if problems:
        print('\n'.join(problems),file=sys.stderr);return 1
    pnpm=shutil.which('pnpm');node=shutil.which('node')
    if not pnpm or not node:
        raise RuntimeError('pnpm and Node>=22.21 must be on PATH')
    # The normal launcher performs its own source-newer-than-build check once.
    start=subprocess.run([pnpm,'--silent','draftably','--help'],cwd=repo,capture_output=True,text=True,timeout=120)
    (out/'cli-bootstrap.log').write_text(start.stdout+start.stderr)
    if start.returncode: raise RuntimeError('CLI build failed; inspect cli-bootstrap.log')
    cli=[node,str(repo/'dist-cli/main.js')]
    sources=sorted(p for p in (root/'examples').rglob('*.draft')
                   if not {'repros','editor-probes','expected-diagnostics'} & set(p.parts)
                   and args.only in str(p.relative_to(root)))
    if not sources: raise RuntimeError('No selected positive companions')
    def run(source):
        relative=source.relative_to(root).as_posix()
        name=relative.removesuffix('.draft').replace('/','__')
        result={'source':relative,'source_sha256':sha(source.read_bytes()),'commands':[],'problems':[]}
        for label,tail in [('check',['check',str(source),'--metrics']),('inspect',['inspect',str(source),'--json','--metrics']),('svg',['inspect',str(source),'--svg'])]:
            t=time.monotonic();cmd=cli+tail
            proc=subprocess.run(cmd,cwd=repo,capture_output=True,text=True,timeout=90)
            result['commands'].append({'label':label,'command':cmd,'exit_code':proc.returncode,'seconds':round(time.monotonic()-t,3)})
            log=out/'logs';log.mkdir(exist_ok=True)
            (log/(name+'.'+label+'.stderr.log')).write_text(proc.stderr)
            if proc.returncode:result['problems'].append(label+' exited '+str(proc.returncode))
            if label=='check':
                (log/(name+'.check.log')).write_text(proc.stdout)
                result['check_output']=proc.stdout
            elif label=='inspect':
                try:
                    geo=json.loads(proc.stdout);result['geometry']=geo
                    result['metrics']=geo.get('metrics',{})
                    result['problems']+=geometry_errors(geo)
                    write(out/'geometry'/(name+'.json'),geo)
                except Exception as exc:result['problems'].append('inspect JSON: '+str(exc))
            else:
                p=out/'svg'/(name+'.svg');p.parent.mkdir(exist_ok=True);p.write_text(proc.stdout)
                result['svg']=str(p.relative_to(out));result['svg_sha256']=sha(p.read_bytes())
                try:
                    svg=ET.fromstring(proc.stdout);frame=[float(x) for x in svg.attrib['viewBox'].split()]
                    if len(frame)!=4 or not all(math.isfinite(x) for x in frame) or min(frame[2:])<=0:
                        result['problems'].append('SVG viewBox is invalid')
                    if re.search(r'\b(?:NaN|Infinity)\b',proc.stdout):result['problems'].append('SVG contains nonfinite token')
                except Exception as exc:result['problems'].append('SVG XML: '+str(exc))
        return result
    results=[]
    with ThreadPoolExecutor(max_workers=max(1,min(8,args.jobs))) as executor:
        pending={executor.submit(run,p):p for p in sources}
        for future in as_completed(pending):
            try: row=future.result()
            except Exception as exc: row={'source':str(pending[future].relative_to(root)),'problems':[repr(exc)]}
            results.append(row)
            if row['problems'] or len(results)%25==0 or len(results)==len(sources):
                print(f"[{len(results)}/{len(sources)}] {row['source']}: "+('; '.join(row['problems']) if row['problems'] else 'OK'),flush=True)
    by_source={r['source']:r for r in results}
    frozen=[]
    for g in manifest['groups']:
        if g['id'] not in [f'V-R{i:02}' for i in range(1,13)]:continue
        for sub in g.get('subcomparisons',[]):
            keys=['examples/routing/'+f for f in sub['files']]
            if not all(k in by_source and 'geometry' in by_source[k] for k in keys):continue
            ref=by_source['examples/routing/'+sub['reference']]['geometry']
            same=all(rectangles(by_source[k]['geometry'])==rectangles(ref) for k in keys)
            frozen.append({'group':g['id'],'subcomparison':sub['id'],'rectangles_equal':same,'files':keys})
    failures=[r['source'] for r in results if r['problems']]
    frozen_failures=[r for r in frozen if not r['rectangles_equal']]
    ledger={'baseline':BASELINE,'positive_sources':len(sources),'commands':sum(len(r.get('commands',[])) for r in results),
      'failures':failures,'frozen_geometry_failures':frozen_failures,'frozen_comparisons':frozen,
      'warning_contract':'Warnings are retained; intentional quality warnings do not fail the runner. Inspect counts and check quality notes have distinct scopes.',
      'results':sorted(results,key=lambda r:r['source'])}
    write(out/'results.json',ledger)
    print(json.dumps({k:ledger[k] for k in ['baseline','positive_sources','commands','failures','frozen_geometry_failures']},indent=2))
    return int(bool(failures or frozen_failures))

if __name__=='__main__':
    sys.exit(main())
