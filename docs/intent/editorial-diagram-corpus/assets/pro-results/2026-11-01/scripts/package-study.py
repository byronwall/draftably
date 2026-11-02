#!/usr/bin/env python3
"""Register and package the completed evidence, omitting reproducible working-page caches."""
from pathlib import Path
import argparse
import csv
import hashlib
import json
import subprocess
import sys
import zipfile

def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def eligible(p,root):
    rel=p.relative_to(root)
    return p.is_file() and not any(part in ('working','__pycache__') for part in rel.parts) and p.suffix not in ('.pyc','.zip')
def role(rel):
    name=rel.name
    if rel.parts[0]=='logs':return 'execution evidence'
    if rel.parts[0]=='baseline-audit':return 'historical heuristic audit'
    if 'trials' in rel.parts:return 'retained trial'
    if len(rel.parts)==3 and rel.parts[0]=='corpus' and name.startswith('reference.') :return 'original reference'
    if name=='reference-preview.png':return 'reference preview'
    if rel.suffix=='.draft':return 'editable native attempt'
    if rel.suffix=='.svg':return 'actual native vector render'
    if rel.suffix=='.png':return 'actual screenshot / comparison'
    if rel.parts[0]=='scripts':return 'reproduction / audit helper'
    return 'report / metadata / attribution'

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output',type=Path)
    parser.add_argument('--baseline',type=Path,required=True,help='Unchanged source packet or checkout; verified again immediately before packaging')
    args=parser.parse_args();root=Path(__file__).resolve().parents[1]
    output=args.output or root.parent/'draftably-editorial-corpus-pro.zip'
    subprocess.run([sys.executable,str(root/'scripts/verify-corpus.py'),'--baseline',str(args.baseline.resolve())],check=True)
    verification=json.loads((root/'logs/final-verification.json').read_text())
    if not verification['passed']:raise SystemExit('Corpus verification must pass before packaging.')
    files=sorted(p for p in root.rglob('*') if eligible(p,root) and p.name not in ('file-register.csv','manifest.sha256'))
    with (root/'file-register.csv').open('w',newline='') as f:
        writer=csv.DictWriter(f,fieldnames=['path','role','bytes','sha256']);writer.writeheader()
        for p in files:
            rel=p.relative_to(root);writer.writerow({'path':rel.as_posix(),'role':role(rel),'bytes':p.stat().st_size,'sha256':sha(p)})
    files=sorted(p for p in root.rglob('*') if eligible(p,root) and p.name!='manifest.sha256')
    (root/'manifest.sha256').write_text(''.join(f'{sha(p)}  {p.relative_to(root).as_posix()}\n' for p in files))
    files=sorted(p for p in root.rglob('*') if eligible(p,root))
    with zipfile.ZipFile(output,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6,allowZip64=True) as z:
        for p in files:z.write(p,p.relative_to(root).as_posix())
    with zipfile.ZipFile(output) as z:
        bad=z.testzip()
        if bad:raise SystemExit('ZIP CRC failure: '+bad)
        names=z.namelist()
    result={'file':output.name,'bytes':output.stat().st_size,'sha256':sha(output),'files':len(files),
            'zip_crc_check':'passed','contains_originals':sum(len(Path(n).parts)==3 and Path(n).parts[0]=='corpus' and Path(n).name.startswith('reference.') for n in names),
            'final_native_sources':sum(n.endswith(('/v0.draft','/v1.draft','/v2.draft')) and '/trials/' not in n and n.startswith('corpus/') for n in names)}
    output.with_suffix('.zip.sha256').write_text(f"{result['sha256']}  {output.name}\n")
    output.with_suffix('.package.json').write_text(json.dumps(result,indent=2)+'\n')
    print(json.dumps(result,indent=2))

if __name__=='__main__':main()
