"""Predeclared edit design. Source recompiles and actual warm inputs stay separate.

The two learned cold policies are appended by --policies after development selection.
All heldout tasks remain locked by run.mjs until policy-freeze.json exists.
"""
import argparse, datetime, json, pathlib, copy

root = pathlib.Path(__file__).resolve().parents[1]
manifest = json.loads((root/'corpus/manifest.json').read_text())
parser = argparse.ArgumentParser()
parser.add_argument('--policies', action='store_true')
args = parser.parse_args()

def write(name, tasks):
    for t in tasks:
        t.setdefault('timeoutMs', 15000)
        t.setdefault('allowPartialReference', True)
    (root/'evaluation/tasks'/f'{name}.json').write_text(json.dumps(tasks, indent=2)+'\n')
    print(name, len(tasks))

def coldref(split, cid):
    return f'data/geometry/C-{split}-{cid}-current.json.gz'

for split in ['development', 'heldout']:
    cases = [c for c in manifest['cases'] if c['split']==split and c.get('edits')]
    current, states, warm = [], [], []
    for c in cases:
        cid = c['id']; ws = c['warmState']
        common = dict(caseId=cid, family=c['family'], split=split)
        # Collapse is an input view state, not an inferred consequence of an edit.
        # Authored cases keep the distant group collapsed while the selected local group stays open.
        collapsed = [ws['collapsedGroup']] if c['family'] in ['containers','authored'] and ws['collapsedGroup'] else []
        states.append(dict(id=f'E-state-{cid}', stage='E-warm-state', kind='route',
                           reference=coldref(split,cid), history=True,
                           patchDoc={'manual':ws['manualIDs'], 'collapsed':collapsed},
                           policy='shared-prior-state', **common))
        for edit in c['edits']:
            eid = edit['id']
            current_id = f'E-cold-{cid}-{eid}-current'
            current.append(dict(id=current_id, stage='E-cold', kind='source', sourcePath=edit['path'],
                                compareReference=coldref(split,cid), localIds=edit['targets'],
                                requestedGlobalReflow=edit['requestedGlobalMovement'],
                                policy='current-source', editId=eid, editOperation=edit.get('operation'), **common))
            for policy in ['current-tidy','separate-only','group-aware']:
                algorithm = 'tidy' if policy=='current-tidy' else 'separate' if policy=='separate-only' else ('boundary-align' if c['groupCount'] else 'tidy')
                options = dict(algorithm=algorithm, mode='pass', maxMove=48, stability=65,
                               iterations=32, respectManual=True, growContainers=False, scope='all')
                if eid=='local':
                    if ws['selectedScope']!='root':
                        options.update(scope='container', containerId=ws['selectedScope'], selected=[ws['selectedScope']])
                    else:
                        options.update(scope='neighbourhood', selected=edit['targets'])
                if edit.get('operation')=='change-direction':
                    options['direction'] = edit['direction'].upper()
                patch = dict(manual=ws['manualIDs'], collapsed=collapsed)
                if edit.get('operation')=='local-nudge':
                    patch['move'] = {id:{'dx':0,'dy':56} for id in edit['targets']}
                action = 'retain' if eid=='color_control' else 'compile-recipe' if not c['engines'] else 'repair'
                warm.append(dict(id=f'E-warm-{cid}-{eid}-{policy}', stage='E-warm', kind='warm-edit',
                                 reference=f'data/geometry/E-state-{cid}.json.gz',
                                 editedReference=f'data/geometry/{current_id}.json.gz', history=True,
                                 options=options, patchDoc=patch, action=action,
                                 localIds=edit['targets'], requestedGlobalReflow=edit['requestedGlobalMovement'],
                                 policy=policy, editId=eid, editOperation=edit.get('operation'), **common))
    write('edits-current-'+split,current)
    write('edits-states-'+split,states)
    write('edits-warm-'+split,warm)

if args.policies:
    # Prediction file contains the frozen candidate selection, including explicit user direction overrides.
    prediction_path = root/'data/edit-policy-predictions.json'
    predictions = json.loads(prediction_path.read_text())
    if isinstance(predictions,dict): predictions=predictions.get('predictions',predictions.get('rows',[]))
    for split in ['development','heldout']:
        tasks=[]
        for p in predictions:
            if p['split']!=split:continue
            if p.get('editId')=='base':continue
            c=next(c for c in manifest['cases'] if c['id']==p['caseId'])
            # Nonapplicable specialist recipes use their dedicated compiler path.
            for edit in c['edits']:
                if p.get('editId') and p['editId']!=edit['id']:continue
                layout=copy.deepcopy(p.get('layout'))
                if layout and edit.get('operation')=='change-direction':layout['direction']=edit['direction'].upper()
                tid=f'E-cold-{c["id"]}-{edit["id"]}-{p["policy"]}'
                tasks.append(dict(id=tid,stage='E-cold',caseId=c['id'],family=c['family'],split=split,
                                  kind='source',sourcePath=edit['path'],layout=layout,
                                  compareReference=p['reference'],localIds=edit['targets'],
                                  requestedGlobalReflow=edit['requestedGlobalMovement'],
                                  policy=p['policy'],editId=edit['id'],editOperation=edit.get('operation'),
                                  guardProfile='cold-hard-validity-guard' if p.get('proposedValidityGuard') else None,
                                  prediction=p))
        write('edits-policies-'+split,tasks)

freeze=root/'data/edit-design-freeze.json'
if not freeze.exists():
    freeze.write_text(json.dumps({
        'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),
        'bases':24,'families':12,'developmentBases':12,'heldoutBases':12,
        'editsPerBase':4,'negativeControlsPerBase':1,
        'sourcePolicies':['current-source','best-single','feature-selector'],
        'warmPolicies':['current-tidy','separate-only','group-aware'],
        'sharedState':'Every warm policy receives the same current-source positions and prior port sides; no chaining.',
        'protections':'Same input pins/manual flags and scope for each warm policy; respectManual=true is an explicit job requirement, not the shipped false default.',
        'localMove':'Reapply the authored 56px local nudge to prior positions before repair.',
        'structuralEscape':'Sequence/lanes use current compiled recipe geometry; marked compile-recipe, not credited as a raw warm-engine run.',
        'colorControl':'Cold: normal compile. Warm: retain positions and reroute; no unsolicited layout pass.',
        'partialReference':'If source routing timed out, completed layout checkpoint can supply geometry; unavailable prior route history and churn are marked, never fabricated.',
        'requestedGlobalReflow':'Record movement but do not penalize it as an unintended stability failure.',
        'sourceDirection':'A requested change-direction overrides a policy default or predicted direction.',
    },indent=2)+'\n')
