"""Emit the routing evaluation promised by the sealed policy; never fit a policy.

The exact positions come from canonical heldout source results or their explicitly
marked completed-layout checkpoints. No candidate receives another candidate's
route history. Source intent remains a gate when only numeric routing changes.
"""
import hashlib
import json
import pathlib

root = pathlib.Path(__file__).resolve().parents[1]
freeze_path = root / 'data/policy-freeze.json'
freeze = json.loads(freeze_path.read_text())
assert freeze['frozen'] is True
manifest = json.loads((root / 'corpus/manifest.json').read_text())
cases = [c for c in manifest['cases'] if c['split'] == 'heldout']
assert len(cases) == 24
routes = freeze['routingProposal']['policies']
layouts = freeze['proposal']['compact']['jointLayoutChoices']
assert len(routes) == len(layouts) == 3

def reference(cid, method):
    parts = method.split(':')
    if parts[0] == 'engine':
        return f'data/geometry/C-heldout-{cid}-{parts[1]}-{parts[2]}.json.gz'
    if parts[0] == 'tuned':
        return f'data/geometry/G-selected-heldout-{cid}-{parts[1]}-{parts[3]}.json.gz'
    raise ValueError(f'Unsupported frozen layout reference: {method}')

current, joint = [], []
for c in cases:
    cid = c['id']
    common = dict(caseId=cid, family=c['family'], split='heldout', kind='route',
                  sourcePath=c['path'], history=False, inheritSourceIntent=True,
                  allowPartialReference=True, timeoutMs=15000)
    current_ref = f'data/geometry/C-heldout-{cid}-current.json.gz'
    for j, route in enumerate(routes, 1):
        policy = route['policy_id']
        current.append(dict(id=f'H-routing-current-{cid}-{policy}',
                            stage='H-routing-current', reference=current_ref,
                            routing=route['routing'], policy=policy,
                            tag={'layoutMethod': 'current', 'routingPolicy': policy},
                            **common))
        for i, layout in enumerate(layouts, 1):
            fallback = not c['engines']
            joint.append(dict(id=f'H-joint-{cid}-layout{i}-route{j}', stage='H-joint',
                              reference=current_ref if fallback else reference(cid, layout['method']),
                              routing=route['routing'], policy=layout['method']+'|routing:'+policy,
                              tag={'layoutMethod': layout['method'], 'routingPolicy': policy,
                                   'effectiveLayoutMethod': 'current-specialist' if fallback else layout['method'],
                                   'specialistFallback': fallback}, **common))

for stem, tasks, expected in [('routing-current-heldout', current, 72), ('joint-heldout', joint, 216)]:
    assert len(tasks) == expected and len({t['id'] for t in tasks}) == expected
    destination = root / 'evaluation/tasks' / (stem + '.json')
    encoded = json.dumps(tasks, indent=2) + '\n'
    if destination.exists() and destination.read_text() != encoded:
        raise SystemExit(f'Refusing to alter previously emitted heldout task definitions: {stem}')
    destination.write_text(encoded)
    print(stem, len(tasks), hashlib.sha256(destination.read_bytes()).hexdigest())

plan = {
    'policyFreezeSha256': hashlib.sha256(freeze_path.read_bytes()).hexdigest(),
    'heldoutOutcomesRead': False, 'fittedAnyPolicy': False,
    'currentSourceTasks': 72, 'jointTasks': 216,
    'routePolicies': [r['policy_id'] for r in routes],
    'layoutMethods': [l['method'] for l in layouts],
    'sourceIntent': 'Preserved from the unchanged source-layout reference; numeric routing does not erase authored constraints.',
    'partialReferences': 'Only completed-layout checkpoints, with referencePartial=true and no invented prior routes.',
    'history': 'Empty for all candidates; this is cold-source routing, not incremental history testing.',
    'specialistFallback': [c['id'] for c in cases if not c['engines']],
    'scoring': 'Stored development rules only. Current-source routing and joint routing use separately declared comparison pools.',
}
(root / 'data/analysis/heldout-routing-task-plan.json').write_text(json.dumps(plan, indent=2)+'\n')
