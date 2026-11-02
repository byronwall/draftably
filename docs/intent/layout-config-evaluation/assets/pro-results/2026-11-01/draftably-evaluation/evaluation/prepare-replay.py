"""Create a fresh measured run without overwriting this delivered experiment's results."""
import argparse,datetime,json,pathlib,shutil
root=pathlib.Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('destination',type=pathlib.Path);args=p.parse_args();target=args.destination.resolve()
if target.exists() and any(target.iterdir()):raise SystemExit('Use an empty destination.')
target.mkdir(parents=True,exist_ok=True)
for name in ['evaluation','corpus','baseline-packet']:
    shutil.copytree(root/name,target/name,dirs_exist_ok=True,ignore=shutil.ignore_patterns('__pycache__','*.pyc'))
(target/'data/analysis/development').mkdir(parents=True,exist_ok=True)
configs=['baseline-manifest.json','protocol-freeze.json','policy-freeze.json','policy-freeze.sha256','policy-compact.json','policy-proposal.json','edit-design-freeze.json','joint-design-freeze.json','layout-control-ablation-freeze.json','warm-targeted-freeze.json','timing-sample-freeze.json','edit-policy-predictions.json','edit-policy-predictions-development.json','edit-policy-predictions-heldout.json']
for name in configs:
    if(root/'data'/name).exists():shutil.copy2(root/'data'/name,target/'data'/name)
for name in ['tuning-selection.json']:
    if(root/'data/analysis/development'/name).exists():shutil.copy2(root/'data/analysis/development'/name,target/'data/analysis/development'/name)
for name in ['routing-policy-proposal.json']:
    if(root/'data/analysis'/name).exists():shutil.copy2(root/'data/analysis'/name,target/'data/analysis'/name)
for file in (root/'data').glob('visual-pairs-*.json'):
    shutil.copy2(file,target/'data'/file.name)
# Pair identities are reproducible render requests. Original judgments are not
# copied into a fresh measurement directory as though they judged new renders.
protocol=json.loads((target/'data/protocol-freeze.json').read_text())
protocol['replayOfAssignmentStarted']=protocol['assignmentStarted']
protocol['assignmentStarted']=datetime.datetime.now(datetime.timezone.utc).isoformat()
protocol['replayNote']='A new, separately clocked reproduction using the delivered frozen corpus, metrics, settings and policies. Original measurements are not overwritten.'
(target/'data/protocol-freeze.json').write_text(json.dumps(protocol,indent=2)+'\n')
print(json.dumps({'replayDirectory':str(target),'next':'Read evaluation/README.md; unpack the immutable baseline beside the replay and install its locked dependencies; run evaluation/replay-all.sh.'}))
