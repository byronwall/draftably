import { describe, expect, it } from 'vitest';
import { renderSvg } from '../src/cli/svg';
import { checkSource } from '../src/dsl/compile';
import { projectScene } from '../src/dsl/project';
import { formatSource, parseModel } from '../src/dsl/syntax';
import { normalize } from '../src/model/document';
import { usedStatuses } from '../src/model/status';

const SOURCE = `node api "API"
~node orders "Orders service" was="Orders"
+node refunds "Refunds"
-node hook "Webhook"
.node audit "Audit"
+edge refund orders -> refunds
-edge notify api -> hook
`;

describe('change marks', () => {
  it('reads +, -, ~ and . as statuses, and keeps them through formatting and JSON', () => {
    const m = parseModel(SOURCE);
    expect(m.objects.map(o => o.status)).toEqual([
      undefined,
      'changed',
      'added',
      'removed',
      'context',
    ]);
    expect(m.objects[1].was).toBe('Orders');
    expect(formatSource(SOURCE)).toBe(SOURCE);
    const doc = normalize(JSON.parse(JSON.stringify(projectScene(checkSource(SOURCE)))));
    expect(usedStatuses(doc)).toEqual(['added', 'changed', 'removed', 'context']);
    const svg = renderSvg(doc);
    expect(svg).toContain('Unchanged, for context');
    expect(svg).toContain('line-through');
  });

  it('rejects marks and was= where they mean nothing', () => {
    expect(() => parseModel('+layout root flow\n')).toThrow(/Only node, group and edge/);
    expect(() => parseModel('node a "A" was="B"\n')).toThrow(/changed/);
  });

  it('never moves anything', () => {
    const plain = SOURCE.replace(/^[+~.-]/gm, '').replace(/ was="Orders"/, '');
    const at = (s: string) => checkSource(s).objects.map(o => [o.id, o.x, o.y]);
    expect(at(SOURCE)).toEqual(at(plain));
  });
});
