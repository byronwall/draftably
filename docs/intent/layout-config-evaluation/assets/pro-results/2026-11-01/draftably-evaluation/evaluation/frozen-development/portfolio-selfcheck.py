#!/usr/bin/env python3
"""Analytical checks for reporting and selection logic; zero product executions."""
import importlib.util
import json
import pathlib
p=pathlib.Path(__file__).with_name('analyze-portfolio.py')
spec=importlib.util.spec_from_file_location('portfolio',p)
a=importlib.util.module_from_spec(spec);spec.loader.exec_module(a)
result=a.selfcheck()
cases=[];rows=[];features={}
for i in range(12):
    c={'id':f'analytical{i}','family':f'f{i//4}','common':i<8,'engines':a.ENGINES,'protectedRecipes':[],'split':'development','job':{'targetFormat':'free'}};cases.append(c)
    features[c['id']]={k:0 for k in a.FEATURES};features[c['id']]['nodeCount']=i+4;features[c['id']]['targetAspect']=1.6
    for eindex,e in enumerate(a.ENGINES):
        for direction in ['RIGHT','DOWN']:
            method=f'engine:{e}:{direction}';q=abs((i%3)-(eindex%3))+(direction=='DOWN')
            rows.append({'id':c['id']+method,'caseId':c['id'],'status':'ok','method':method,'valid':True,'metrics':{'hardValid':True,'requiredIntentFailures':0,'area':100,'routeLength':100,'aspect':1.6,'weightingScores':{'balanced':q,'direct':q,'traceable':q}}})
    rows.append({**rows[-1],'id':c['id']+'current','method':'current'})
screen=a.Screen(cases,rows);rs,best=a.subset_sweep(screen);assert len(rs)==1023*2*4
proposal=a.proposal_from_results(screen,best,features)
def walk(t,depth=0):
    assert depth<=3
    if t['type']=='leaf':assert t['trainingBases']>=4
    else:walk(t['left'],depth+1);walk(t['right'],depth+1)
for option in proposal['options']:
    walk(option['selectorTree'])
    for t in option['goalTrees'].values():walk(t)
result.update(analyticalPortfolioRows=len(rs),fittedAnalyticalPolicies=len(proposal['options']),treeChecks='depth<=3 and min4 bases verified for all analytic policy/goal trees',productionCalls=0)
out=p.parents[1]/'data/calibration/portfolio-selfcheck.json';a.dump(out,result)
print(json.dumps(result))
