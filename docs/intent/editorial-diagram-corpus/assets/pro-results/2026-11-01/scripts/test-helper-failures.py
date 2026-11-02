#!/usr/bin/env python3
"""Fault-test orchestration failure propagation in an isolated temporary copy.

Synthetic helper tests only: fake pnpm exits 7. No native diagram is rendered,
no application code is changed, and the real corpus is never modified.
"""
from pathlib import Path
import datetime as dt
import hashlib
import json
import os
import shutil
import subprocess
import sys
import tempfile

root=Path(__file__).resolve().parents[1]
records=[]
with tempfile.TemporaryDirectory(prefix='draftably-helper-faults-') as td:
    temp=Path(td);study=temp/'study';scripts=study/'scripts';case=study/'corpus'/'fixture';baseline=temp/'baseline';bin_dir=temp/'bin'
    for p in [scripts,case,baseline,bin_dir]:p.mkdir(parents=True,exist_ok=True)
    for name in ['run-trials.py','run-sheets.py','run-details.py']:
        shutil.copyfile(root/'scripts'/name,scripts/name)
    fake=bin_dir/'pnpm';fake.write_text('#!/bin/sh\nexit 7\n');fake.chmod(0o755)
    env=os.environ.copy();env['PATH']=str(bin_dir)+os.pathsep+env['PATH']
    (case/'v0.draft').write_text('node a "A"\n')
    (case/'item.json').write_text('{"id":"TEST"}\n')
    # Existing real image bytes stand in as disposable source files; no substitute renderer.
    for name in ['reference-preview.png','v0.png','v2.png']:
        shutil.copyfile(root/'corpus/cloudflare-tls-handshake'/name,case/name)
    (case/'detail-selection.json').write_text(json.dumps({'focus':'Synthetic helper exit propagation only','crops':{s:[0,0,1,1] for s in ['reference','v0','v2']}}))
    def call(name,argv,extra_check=None):
        p=subprocess.run(argv,capture_output=True,text=True,env=env,cwd=temp)
        passed=p.returncode!=0 and (extra_check() if extra_check else True)
        records.append({'test':name,'expected':'nonzero wrapper exit','actual_exit':p.returncode,'passed':passed,'stdout':p.stdout.replace(td,'<temporary-test-root>'),'stderr':p.stderr.replace(td,'<temporary-test-root>')})
    call('child failures propagate and do not freeze an unsuccessful v0',
         [sys.executable,str(scripts/'run-trials.py'),str(case),'--baseline',str(baseline),'--stages','v0'],
         lambda:not(case/'v0-frozen.json').exists() and all(x['exit_code']==7 for x in json.loads((case/'v0.validation.json').read_text())['commands'].values()))
    call('missing requested stage is unsuccessful',
         [sys.executable,str(scripts/'run-trials.py'),str(case),'--baseline',str(baseline),'--stages','v1'])
    (case/'v0-frozen.json').write_text(json.dumps({'sha256':hashlib.sha256(b'different source').hexdigest()}))
    call('changed frozen v0 is refused',
         [sys.executable,str(scripts/'run-trials.py'),str(case),'--baseline',str(baseline),'--stages','v0'])
    call('comparison child failure propagates',
         [sys.executable,str(scripts/'run-sheets.py'),'--baseline',str(baseline),'--workers','1'])
    call('detail crop child failure propagates',
         [sys.executable,str(scripts/'run-details.py'),'--baseline',str(baseline),'--workers','1'])
result={'checked_utc':dt.datetime.now(dt.timezone.utc).isoformat(),
        'scope':'Synthetic isolated orchestration tests with a fake pnpm exit 7; not native case execution or application regression tests.',
        'passed':all(r['passed'] for r in records),'records':records}
(root/'logs/helper-failure-tests.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({'passed':result['passed'],'tests':len(records)},indent=2))
if not result['passed']:raise SystemExit(1)
