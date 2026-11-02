/**
 * Mermaid `sequenceDiagram` -> native source. Participants become nodes and messages become edges
 * in file order. Native sequences have no fragments, so each top-level branch of a block becomes
 * a phase band, and the warning says that the branch logic is gone.
 */
import {
  Ids,
  blankPlan,
  finish,
  type Diagnostic,
  type ImportResult,
  type NativeEdge,
  type NativeNote,
  type NativePhase,
} from './import-core';
import type { SequenceEvent, SequenceSnapshot } from './mermaid-facade';

/** Mermaid's line types that native messages cover; any other type stops the import. */
const LINES: Record<string, Pick<NativeEdge, 'head' | 'tail' | 'dashed'>> = {
  SOLID: {},
  DOTTED: { dashed: true },
  SOLID_OPEN: { head: 'none' },
  DOTTED_OPEN: { head: 'none', dashed: true },
  SOLID_CROSS: { head: 'cross' },
  DOTTED_CROSS: { head: 'cross', dashed: true },
  SOLID_POINT: {},
  DOTTED_POINT: { dashed: true },
  BIDIRECTIONAL_SOLID: { tail: 'arrow' },
  BIDIRECTIONAL_DOTTED: { tail: 'arrow', dashed: true },
};
const OPENS: Record<string, string> = {
  LOOP_START: 'loop',
  ALT_START: 'alt',
  OPT_START: 'opt',
  PAR_START: 'par',
  PAR_OVER_START: 'par',
  CRITICAL_START: 'critical',
  BREAK_START: 'break',
};
const BRANCHES: Record<string, string> = {
  ALT_ELSE: 'else',
  PAR_AND: 'and',
  CRITICAL_OPTION: 'option',
};
const CLOSES = ['LOOP_END', 'ALT_END', 'OPT_END', 'PAR_END', 'CRITICAL_END', 'BREAK_END'];

export function mapMermaidSequence(
  snapshot: SequenceSnapshot,
  plainText: (value: string) => string,
  title: string,
  diagnostics: Diagnostic[],
): ImportResult {
  const plan = blankPlan(snapshot.title ? plainText(snapshot.title) : title),
    ids = new Ids(),
    reported = new Set<string>();
  const warn = (code: string, message: string, impact: Diagnostic['impact'] = 'semantics') => {
    if (reported.has(code)) return;
    reported.add(code);
    diagnostics.push({ code, severity: 'warning', impact, message });
  };

  const boxes = snapshot.boxes.map((b, i) => {
    const id = ids.get('group', 'box_' + (i + 1));
    plan.objects.push({ id, kind: 'group', label: plainText(b.name ?? '') });
    if (b.fill && b.fill !== 'transparent')
      warn('MERMAID_SEQUENCE_BOX_COLOR', 'Box colors are omitted.', 'appearance');
    return id;
  });
  const lanes = new Map<string, string>();
  for (const a of snapshot.actors) {
    const id = ids.get('node', a.id);
    lanes.set(a.id, id);
    plan.objects.push({
      id,
      kind: 'node',
      // `participant p as "Name"` keeps its quotes in the DB.
      label: plainText(a.name).replace(/^"(.*)"$/s, '$1'),
      ...(a.box != null && a.box >= 0 ? { parent: boxes[a.box] } : {}),
    });
    if (a.type !== 'participant')
      warn(
        'MERMAID_SEQUENCE_ACTOR_TYPE',
        'Participant symbols such as actor or database become ordinary boxes.',
        'appearance',
      );
    if (a.links.length)
      warn(
        'MERMAID_LINK_OMITTED',
        'Participant link menus are omitted; native participants have no menu.',
        'security',
      );
  }
  if (snapshot.created.length || snapshot.destroyed.length)
    warn(
      'MERMAID_SEQUENCE_LIFELINE',
      'create and destroy are omitted: native participants span the whole diagram.',
    );
  plan.layouts.push({ scope: 'root', kind: 'sequence' });

  const phases: NativePhase[] = [],
    notes: NativeNote[] = [];
  let depth = 0,
    branch: NativePhase | undefined,
    last: { id: string; ends: string[] } | undefined;
  const open = (word: string, text: string) => {
    const words = plainText(text).trim();
    branch = {
      id: ids.get('phase', String(phases.length + 1), 'phase_' + (phases.length + 1)),
      label: words ? `${word}: ${words}` : word,
      members: [],
    };
    phases.push(branch);
  };
  const addNote = (e: SequenceEvent) => {
    const ends = [e.from, e.to].filter((x): x is string => x != null),
      onLast = last && ends.every(end => last!.ends.includes(end)),
      side = e.placement === 'left' ? 'left' : e.placement === 'right' ? 'right' : undefined;
    notes.push({
      text: plainText(e.text),
      near: onLast ? last!.id : lanes.get(ends[0]),
      side: side ?? (onLast ? 'right' : 'below'),
    });
  };

  for (const [index, e] of snapshot.events.entries()) {
    if (OPENS[e.kind]) {
      depth++;
      if (depth === 1) open(OPENS[e.kind], e.text);
      else
        warn(
          'MERMAID_SEQUENCE_NESTED_BLOCK',
          'A nested block has no band of its own; its messages stay in the outer band.',
        );
      warn(
        'MERMAID_SEQUENCE_BLOCK',
        'Native sequences have no fragments. Each block branch becomes a phase band, so the branch logic is only in its label.',
      );
    } else if (BRANCHES[e.kind]) {
      if (depth === 1) open(BRANCHES[e.kind], e.text);
    } else if (CLOSES.includes(e.kind)) {
      depth--;
      if (!depth) branch = undefined;
    } else if (e.kind === 'NOTE') addNote(e);
    else if (e.kind === 'ACTIVE_START' || e.kind === 'ACTIVE_END')
      warn('MERMAID_SEQUENCE_ACTIVATION', 'Activation bars are omitted.', 'appearance');
    else if (e.kind === 'AUTONUMBER')
      warn('MERMAID_SEQUENCE_AUTONUMBER', 'Message numbers are omitted.', 'appearance');
    else if (e.kind === 'RECT_START' || e.kind === 'RECT_END')
      warn('MERMAID_SEQUENCE_RECT', 'Background rectangles are omitted.', 'appearance');
    else {
      const line = LINES[e.kind],
        from = lanes.get(e.from ?? ''),
        to = lanes.get(e.to ?? '');
      if (!line || !from || !to || e.central) {
        diagnostics.push({
          code: 'MERMAID_SEQUENCE_ARROW_UNSUPPORTED',
          severity: 'error',
          impact: 'semantics',
          message:
            'Message line type is unsupported: ' +
            (e.central ? 'central connection' : e.kind) +
            '. The import is blocked rather than replacing it with an ordinary arrow.',
        });
        continue;
      }
      if (e.kind === 'SOLID_POINT')
        warn(
          'MERMAID_SEQUENCE_ASYNC_ARROW',
          'The open async arrow `-)` becomes an ordinary solid message, because native async draws dashed.',
        );
      const id = ids.get('edge-occurrence', String(index + 1), 'm' + (plan.edges.length + 1));
      plan.edges.push({ id, from, to, label: plainText(e.text), directed: true, ...line });
      branch?.members.push(id);
      last = { id, ends: [e.from!, e.to!] };
    }
  }
  plan.phases = phases.filter(p => p.members.length);
  plan.notes = notes;
  return finish('mermaid', 'sequence', plan, diagnostics, ids);
}
