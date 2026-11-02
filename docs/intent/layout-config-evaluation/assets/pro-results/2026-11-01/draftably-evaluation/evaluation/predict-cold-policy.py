#!/usr/bin/env python3
"""Print a frozen/proposed cold policy prediction without executing layout or routing."""
import argparse
import importlib.util
import json
import pathlib
p=pathlib.Path(__file__).with_name('analyze-portfolio.py')
spec=importlib.util.spec_from_file_location('portfolio',p)
a=importlib.util.module_from_spec(spec);spec.loader.exec_module(a)
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('case_id')
parser.add_argument('--edit',default='base')
parser.add_argument('--policy',choices=['current','single','selector','goal'],default='selector')
parser.add_argument('--goal',choices=a.PROFILES,default='readable')
args=parser.parse_args()
manifest=a.read_json(a.ROOT/'corpus/manifest.json')
case=next((c for c in manifest['cases'] if c['id']==args.case_id),None)
if case is None:raise SystemExit('Unknown corpus case '+args.case_id)
if case['split']=='heldout':
    policy,_=a.frozen_policy();compact=policy['compact']
else:compact=a.read_json(a.ROOT/'data/policy-compact.json')
edit=None if args.edit=='base' else next((e for e in case['edits'] if e['id']==args.edit),None)
if args.edit!='base' and edit is None:raise SystemExit('Unknown edit '+args.edit)
print(json.dumps(a.predict_cold_policy(compact,case,args.policy,edit,args.goal if args.policy=='goal' else None),indent=2))
