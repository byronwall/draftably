#!/usr/bin/env python3
"""Exact engine+recipe subset coverage with source-level engine dependencies.

Uses existing measured outcomes only. Development fitting; heldout applies frozen
engine subsets only and never selects a new subset. No compiler/router executions.
"""
from __future__ import annotations
import argparse, importlib.util, itertools, json, math, pathlib, shlex
import numpy as np
p=pathlib.Path(__file__).with_name('analyze-portfolio.py')
spec=importlib.util.spec_from_file_location('portfolio',p)
a=importlib.util.module_from_spec(spec);spec.loader.exec_module(a)
ROOT=a.ROOT


def source_dependencies(case):
    declared={}
    for line in (ROOT/case['path']).read_text().splitlines():
        t=shlex.split(line,comments=True)
        if len(t)<2 or t[0]!='layout':continue
        attrs={x.split('=',1)[0]:x.split('=',1)[1] for x in t[2:] if '=' in x}
        if 'engine' in attrs:declared[t[1]]='layered' if attrs['engine']=='compact' else attrs['engine']
    return {'declaredByScope':declared,'all':sorted(set(declared.values())),'nested':sorted({e for s,e in declared.items() if s!='root'})}


def method_dependencies(row,case,declared):
    method=row['method']
    if method=='current':return set(declared['all'])
    deps=set(declared['nested'])
    if method.startswith(('engine:','tuned:')):deps.add(method.split(':')[1])
    elif method=='documented-default':deps.add(row.get('_task',{}).get('layout',{}).get('engine') or ('compound-flow' if case['groupCount'] else 'layered'))
    return deps


def matrices(screen,mode,scenario,depmap):
    methods=screen.methods;nj=len(screen.jobs);nm=len(methods)
    dep=np.full((nj,nm),1<<10,dtype=np.int32);valid=np.zeros((nj,nm),bool);acc=np.zeros((nj,nm),bool);scores=np.full((nj,nm),math.inf)
    for ji,j in enumerate(screen.jobs):
        c=j['case']
        for mi,m in enumerate(methods):
            r=j['rows'].get(m)
            if r is None:continue
            isengine=m.startswith('engine:');istuned=m.startswith('tuned:')
            if mode=='defaults' and istuned:continue
            if mode=='selected-presets' and isengine:continue
            deps=method_dependencies(r,c,depmap[c['id']])
            if m=='current' and scenario=='recipe-baselines-safe' and deps:continue
            if scenario=='current-ui-fallback':
                if m=='current' or m.startswith('recipe:'):deps=set()
                elif isengine or istuned:deps={m.split(':')[1]}
                elif m=='documented-default':deps={r.get('_task',{}).get('layout',{}).get('engine') or ('compound-flow' if c['groupCount'] else 'layered')}
            unknown=deps-set(a.ENGINES)
            if unknown:raise ValueError('Unknown dependency '+str(unknown))
            dep[ji,mi]=sum(1<<a.ENGINES.index(e) for e in deps)
            valid[ji,mi]=r['valid'];acc[ji,mi]=j['acceptable'].get(m,False);scores[ji,mi]=j['scores'].get(m,math.inf)
    return dep,valid,acc,scores


def summarize(screen,ok,accepted,scores,weighting):
    w=screen.weights(weighting)
    def rate(arr,mask):
        den=w[mask].sum();return float(w[arr&mask].sum()/den) if den else None
    commonprofiles={p:screen.common&np.array([j['profile']==p for j in screen.jobs]) for p in a.PROFILES}
    rel={p:rate(accepted,mask&screen.feasible) for p,mask in commonprofiles.items()}
    absolute={p:rate(accepted,mask) for p,mask in commonprofiles.items()}
    current=np.array([j['rows'].get('current',{}).get('valid',False) for j in screen.jobs])
    regret=np.array([max(0,s-j['oracleScore']) if math.isfinite(s) and j['oracle'] else 0 for s,j in zip(scores,screen.jobs)]);finite=np.isfinite(scores)&screen.feasible
    families={f:rate(accepted,mask&screen.feasible) for f,mask in screen.family_masks.items()}
    hardloss={j['case']['id'] for j,b in zip(screen.jobs,current&~ok) if b}
    specialistloss={j['case']['id'] for j,b in zip(screen.jobs,current&~ok) if b and j['case'].get('protectedRecipes')}
    worstrel=min((x for x in rel.values() if x is not None),default=0);worstabs=min((x for x in absolute.values() if x is not None),default=0)
    return {'hardValidCoverage':float(w[ok].sum()/w.sum()),'acceptableCoverage':rate(accepted,screen.feasible),'absoluteAcceptableCoverage':float(w[accepted].sum()/w.sum()),'commonAcceptableCoverage':rate(accepted,screen.common&screen.feasible),'absoluteCommonAcceptableCoverage':rate(accepted,screen.common),'commonFeasibleProfileCoverage':rel,'commonAbsoluteProfileCoverage':absolute,'worstProfileCommonFeasibleCoverage':worstrel,'worstProfileCommonAbsoluteCoverage':worstabs,'worstFamilyCoverage':min((v for v in families.values() if v is not None),default=None),'familyCoverage':families,'currentValidHardRegressionCases':len(hardloss),'currentValidHardRegressionCaseIDs':sorted(hardloss),'specialistCurrentValidLossCases':len(specialistloss),'meanFiniteRegret':float(np.average(regret[finite],weights=w[finite])) if finite.any() else None,'contractRelativePerProfile95Pass':worstrel>=.95 and not hardloss and not specialistloss,'conservativeAbsolutePerProfile95Pass':worstabs>=.95 and not hardloss and not specialistloss,'commonProfileCounts':{p:{'acceptable':int((accepted&mask).sum()),'all':int(mask.sum()),'feasiblePool':int((mask&screen.feasible).sum())} for p,mask in commonprofiles.items()}}


def evaluate_subset(screen,mode,scenario,portfolio,depmap,weighting='equal-family'):
    dep,valid,acc,scores=matrices(screen,mode,scenario,depmap);mask=sum(1<<a.ENGINES.index(e) for e in portfolio)
    eligible=(dep&mask)==dep;ok=(eligible&valid).any(axis=1);accepted=(eligible&acc).any(axis=1);bestscore=np.where(eligible&valid,scores,math.inf).min(axis=1)
    return summarize(screen,ok,accepted,bestscore,weighting)


def sweep(screen,mode,scenario,depmap):
    dep,valid,acc,scores=matrices(screen,mode,scenario,depmap);results=[];best={};qualified={}
    for size in range(0,11):
        for ids in itertools.combinations(range(10),size):
            engines=[a.ENGINES[i] for i in ids];mask=sum(1<<i for i in ids)
            eligible=(dep&mask)==dep;ok=(eligible&valid).any(axis=1);accepted=(eligible&acc).any(axis=1);bestscore=np.where(eligible&valid,scores,math.inf).min(axis=1)
            for wname in a.WEIGHTINGS:
                s=summarize(screen,ok,accepted,bestscore,wname)
                row={'mode':mode,'scenario':scenario,'size':size,'portfolio':engines,'weighting':wname,**s};results.append(row)
                objective=(s['hardValidCoverage'],s['worstFamilyCoverage'] if wname=='worst-family' else s['acceptableCoverage'] or 0,s['worstProfileCommonFeasibleCoverage'],-(s['meanFiniteRegret'] or 0),tuple(-i for i in ids))
                key=f'{mode}|{scenario}|{wname}|k={size}'
                if key not in best or objective>best[key]['_objective']:best[key]={**row,'_objective':objective}
                if s['contractRelativePerProfile95Pass'] and (key not in qualified or objective>qualified[key]['_objective']):qualified[key]={**row,'_objective':objective}
    for r in list(best.values())+list(qualified.values()):r.pop('_objective',None)
    return results,best,qualified


def selection_witnesses(screen,mode,scenario,portfolio,depmap):
    dep,valid,acc,scores=matrices(screen,mode,scenario,depmap);mask=sum(1<<a.ENGINES.index(e) for e in portfolio);rows=[]
    for ji,j in enumerate(screen.jobs):
        allowed=[mi for mi,m in enumerate(screen.methods) if (dep[ji,mi]&mask)==dep[ji,mi] and valid[ji,mi]]
        mi=min(allowed,key=lambda i:(not acc[ji,i],scores[ji,i],j['rows'][screen.methods[i]]['metrics'].get('area',0),screen.methods[i])) if allowed else None
        r=j['rows'].get(screen.methods[mi]) if mi is not None else None
        rows.append({'caseId':j['case']['id'],'family':j['case']['family'],'profile':j['profile'],'common':j['case']['common'],'method':r['method'] if r else None,'trial':r['id'] if r else None,'dependencies':sorted(method_dependencies(r,j['case'],depmap[j['case']['id']])) if r else [],'acceptable':bool(mi is not None and acc[ji,mi]),'hardValid':r is not None,'fullPoolOracle':j['oracle']['id'] if j['oracle'] else None,'profileRegret':max(0,scores[ji,mi]-j['oracleScore']) if mi is not None and j['oracle'] else None})
    return rows


def minimize_configurations(screen,portfolio,depmap):
    """Exact set cover over measured default/selected global configs for this engine set."""
    engine_set=set(portfolio);labels=[m for m in screen.methods if m.startswith(('engine:','tuned:')) and m.split(':')[1] in engine_set]
    base_acc=0;base_valid=0;accs={m:0 for m in labels};valids={m:0 for m in labels};profile_masks={p:0 for p in a.PROFILES};current_valid=0
    for ji,j in enumerate(screen.jobs):
        bit=1<<ji
        if j['case']['common'] and j['oracle']:profile_masks[j['profile']]|=bit
        if j['rows'].get('current',{}).get('valid',False):current_valid|=bit
        for m,r in j['rows'].items():
            if not method_dependencies(r,j['case'],depmap[j['case']['id']])<=engine_set:continue
            if m in labels:
                if r['valid']:valids[m]|=bit
                if j['acceptable'].get(m):accs[m]|=bit
            elif not m.startswith(('engine:','tuned:')):
                if r['valid']:base_valid|=bit
                if j['acceptable'].get(m):base_acc|=bit
    targets={p:math.ceil(mask.bit_count()*.95-1e-9) for p,mask in profile_masks.items()}
    def passes(acc,valid):return current_valid&~valid==0 and all((acc&mask).bit_count()>=targets[p] for p,mask in profile_masks.items())
    best=None;examined=0;qualified=0
    for k in range(len(labels)+1):
        for inds in itertools.combinations(range(len(labels)),k):
            examined+=1;acc=base_acc;valid=base_valid
            for i in inds:acc|=accs[labels[i]];valid|=valids[labels[i]]
            if not passes(acc,valid):continue
            qualified+=1;obj=(acc.bit_count(),valid.bit_count(),tuple(-i for i in inds))
            if best is None or obj>best[0]:best=(obj,[labels[i] for i in inds])
        if best is not None:break
    methods=best[1] if best else []
    policy={'fixedEngineSet':portfolio,'minimumExtraGlobalConfigurations':len(methods) if best else None,'globalMethods':methods,'candidateGlobalConfigurations':len(labels),'subsetsExamined':examined,'qualifiedAtMinimumSize':qualified,'nativeRecipeAvailability':'All six structural recipes, implicit baseline, and authored current source whose engine dependencies are retained; this is separate from the counted global configurations.','objective':'Smallest configuration count meeting relative95% separately under all common profiles with no new current-valid hard case; ties maximize accepted jobs then valid jobs. Engine set was chosen first; this is not joint exhaustive optimization over every engine/configuration set.','oracleOnly':True}
    if best:
        choices=[]
        for j in screen.jobs:
            allowed=[m for m,r in j['rows'].items() if method_dependencies(r,j['case'],depmap[j['case']['id']])<=engine_set and (m in methods or not m.startswith(('engine:','tuned:')))]
            choices.append(screen.choose(j,allowed))
        policy['developmentSummary']=screen.evaluate(choices)
    return policy


def apply_configuration_policy(screen,policy,depmap):
    engines=set(policy['fixedEngineSet']);methods=set(policy['globalMethods']);chosen=[]
    for j in screen.jobs:
        allowed=[m for m,r in j['rows'].items() if method_dependencies(r,j['case'],depmap[j['case']['id']])<=engines and (m in methods or not m.startswith(('engine:','tuned:')))]
        chosen.append(screen.choose(j,allowed))
    return chosen


def load_screen(split,args,policy):
    cases=[c for c in a.read_json(ROOT/'corpus/manifest.json')['cases'] if c['split']==split]
    rows,info=a.load_trials('screen-'+split,True,split=split);extra,ei=a.load_trials('documented-default-'+split,True,split=split);rows+=extra
    inputs=[info,ei]
    if policy.get('tunedProposal'):
        tuned,ti,_=a.selected_tuned_rows(cases,rows,{'selected':policy['tunedProposal']['selection']},args,split=split);rows+=tuned;inputs+=ti
    return a.Screen(cases,rows),inputs


def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--split',choices=['development','heldout'],default='development');args=parser.parse_args();args.allow_partial=False
    if args.split=='heldout':policy,freeze=a.frozen_policy()
    else:policy=a.read_json(ROOT/'data/policy-proposal.json')
    screen,inputs=load_screen(args.split,args,policy);depmap={c['id']:source_dependencies(c) for c in screen.cases};out=ROOT/'data/analysis'/args.split
    scenarios=['recipe-baselines-safe','recipes-and-authored-safe','current-ui-fallback'];modes=['defaults','selected-presets','combined'] if policy.get('tunedProposal') else ['defaults']
    if args.split=='development':
        allrows=[];best={};qualified={};minima=[]
        for mode in modes:
            for scenario in scenarios:
                rs,bs,qs=sweep(screen,mode,scenario,depmap);allrows+=rs;best.update(bs);qualified.update(qs)
                for w in a.WEIGHTINGS:
                    candidates=[qs.get(f'{mode}|{scenario}|{w}|k={k}') for k in range(0,11)];found=next((r for r in candidates if r),None)
                    minima.append({'mode':mode,'scenario':scenario,'weighting':w,'minimumContractSize':found['size'] if found else None,'portfolio':found['portfolio'] if found else None,'summary':found,'fullTen':bs[f'{mode}|{scenario}|{w}|k=10']})
        a.write_csv(out/'engine-recipe-subsets-all.csv',allrows);a.dump(out/'engine-recipe-subsets-best.json',best);a.dump(out/'engine-recipe-subsets-qualified.json',qualified)
        curve=[]
        for mode in modes:
            for scenario in scenarios:
                previous=None
                for k in range(11):
                    r=best[f'{mode}|{scenario}|equal-family|k={k}']
                    curve.append({**r,'incrementalAbsoluteCoverage':None if previous is None else r['absoluteAcceptableCoverage']-previous['absoluteAcceptableCoverage'],'incrementalWorstProfileRelativeCommon':None if previous is None else r['worstProfileCommonFeasibleCoverage']-previous['worstProfileCommonFeasibleCoverage']})
                    previous=r
        a.write_csv(out/'engine-recipe-size-curve.csv',curve)
        result={'analysisVersion':'engine-recipe-dependencies-1','dependencyAnalysisCodeSha256':a.sha(__file__),'parentAnalysisCodeSha256':a.sha(a.__file__),'frozen':False,'fittedOnHeldout':False,'allNonemptySubsetsEachScenario':1023,'additionalZeroEngineRecipeBaseline':True,'inputs':inputs,'sourceDependencies':depmap,'scenarioDefinitions':{'recipe-baselines-safe':'Engine choices + all measured recipe baselines + authored source only when it names no engines. Every nested named engine and chosen root engine must be retained.','recipes-and-authored-safe':'Also allows exact current authored source if all its named engine dependencies are retained. This is a theoretical implementation-availability oracle, not a deployed selector.','current-ui-fallback':'Current authored source and recipes remain available despite hidden engine dependencies; this supports UI hiding only, never implementation deletion.'},'modeDefinitions':{'defaults':'RIGHT/DOWN default engine configurations plus measured documented-default/current/recipe anchors','selected-presets':'one selected global RIGHT preset per engine plus measured documented-default/current/recipe anchors','combined':'default RIGHT/DOWN and selected global RIGHT presets for each retained engine, plus measured anchors; theoretical configuration oracle'},'sourceFacts':['compile.ts engineArrangement filters layouts with explicit engine declarations; built-in row/column/flow/lanes/sequence/cells recipes do not automatically invoke a named LayoutLab engine.','Nested explicit engine declarations survive sourceFor root replacement and recipe baselines. Dependency-safe availability requires those engine IDs too.','This is outcome-preservation evidence, not a code-deletion build or source-migration test. Shared library dependencies, exported IDs, stored documents, warm actions, and compatibility must be addressed before implementation deletion.'],'minima':minima}
        a.dump(out/'engine-recipe-dependency-diagnostic.json',result)
        preferred=next(x for x in minima if x['mode']=='combined' and x['scenario']=='recipes-and-authored-safe' and x['weighting']=='equal-family') if 'combined' in modes else minima[0]
        if preferred['portfolio'] is not None:
            result['minimumConfigurationPolicy']=minimize_configurations(screen,preferred['portfolio'],depmap)
            a.dump(out/'engine-recipe-dependency-diagnostic.json',result)
            witness=selection_witnesses(screen,preferred['mode'],preferred['scenario'],preferred['portfolio'],depmap)
            a.write_csv(out/'engine-recipe-minimum-selections.csv',witness)
            marginal=[];with_map={(r['caseId'],r['profile']):r for r in witness}
            for engine in preferred['portfolio']:
                without=[e for e in preferred['portfolio'] if e!=engine]
                q=evaluate_subset(screen,preferred['mode'],preferred['scenario'],without,depmap)
                after=selection_witnesses(screen,preferred['mode'],preferred['scenario'],without,depmap)
                losses=[{**r,'withTrial':with_map[(r['caseId'],r['profile'])]['trial'],'withoutTrial':r['trial'],'withMethod':with_map[(r['caseId'],r['profile'])]['method'],'hardLoss':not r['hardValid']} for r in after if with_map[(r['caseId'],r['profile'])]['acceptable'] and not r['acceptable']]
                marginal.append({'removedEngine':engine,'remaining':without,'summary':q,'newPracticalLossJobs':len(losses),'newPracticalLossCases':len({r['caseId'] for r in losses}),'witnesses':losses,'alreadyUncoveredBeforeRemoval':[{'caseId':r['caseId'],'profile':r['profile']} for r in witness if not r['acceptable']]})
            a.dump(out/'engine-recipe-minimum-removal-witnesses.json',marginal)
        print(json.dumps({'split':'development','candidateRows':len(allrows),'minima':[{'mode':m['mode'],'scenario':m['scenario'],'minimumContractSize':m['minimumContractSize'],'portfolio':m['portfolio']} for m in minima if m['weighting']=='equal-family'],'output':str(out/'engine-recipe-dependency-diagnostic.json')}))
    else:
        # Exact engine sets must be embedded in the root policy freeze. Merely reading
        # a mutable development diagnostic after heldout begins is not sufficient.
        frozen_diag=policy.get('engineRecipeDiagnostic')
        if not frozen_diag:raise ValueError('Frozen policy lacks engineRecipeDiagnostic; refuse to select/read mutable development minima')
        results=[]
        for m in frozen_diag['minima']:
            if m['portfolio'] is None:continue
            for w in a.WEIGHTINGS:
                s=evaluate_subset(screen,m['mode'],m['scenario'],m['portfolio'],depmap,w)
                results.append({'mode':m['mode'],'scenario':m['scenario'],'selectedUnderWeighting':m['weighting'],'evaluationWeighting':w,'frozenPortfolio':m['portfolio'],'frozenSize':m['minimumContractSize'],**s})
        a.dump(out/'engine-recipe-frozen-subsets.json',{'fittedOnHeldout':False,'inputs':inputs,'sourceDependencies':depmap,'results':results})
        if frozen_diag.get('minimumConfigurationPolicy'):
            cp=frozen_diag['minimumConfigurationPolicy'];choices=apply_configuration_policy(screen,cp,depmap)
            a.dump(out/'minimum-configuration-frozen-policy.json',{'fittedOnHeldout':False,'policy':cp,'heldoutSummary':screen.evaluate(choices)})
            sels=screen.selection_rows(choices,'frozen-minimum-configuration-oracle')+screen.selection_rows([j['rows'].get('current') for j in screen.jobs],'current-authored')
            a.write_csv(out/'minimum-configuration-frozen-selections.csv',sels)
            a.dump(out/'minimum-configuration-paired-bootstrap.json',a.bootstrap_paired(sels,'frozen-minimum-configuration-oracle'))
        a.write_csv(out/'engine-recipe-frozen-subsets.csv',results)
        print(json.dumps({'split':'heldout','fittedOnHeldout':False,'evaluations':len(results)}))

if __name__=='__main__':main()
