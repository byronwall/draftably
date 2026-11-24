import type { Rect } from '../model/types';

export type Tone = 'ink' | 'muted' | 'grid' | 'accent' | 'release' | 'shade' | 'paper';
interface MarkBase {
  x: number;
  y: number;
  tone?: Tone;
  id?: string;
  title?: string;
}
export type TimelineMark = MarkBase &
  (
    | {
        kind: 'text';
        text: string;
        size?: number;
        weight?: number;
        anchor?: 'start' | 'middle' | 'end';
      }
    | { kind: 'line'; x2: number; y2: number; dash?: boolean; strokeWidth?: number }
    | { kind: 'rect'; w: number; h: number; radius?: number }
    | { kind: 'dot'; r: number; hollow?: boolean }
  );
export interface TimelinePlan {
  width: number;
  height: number;
  marks: TimelineMark[];
  boxes: Record<string, Rect>;
}
export interface PlacedTimeline extends TimelinePlan {
  x: number;
  y: number;
}

/** JSON imports carry the rendered layout, just as they carry sequence geometry. */
export function validTimeline(value: PlacedTimeline): boolean {
  if (
    ![value.x, value.y, value.width, value.height].every(Number.isFinite) ||
    !Array.isArray(value.marks) ||
    !value.boxes ||
    typeof value.boxes !== 'object'
  )
    return false;
  const tones = ['ink', 'muted', 'grid', 'accent', 'release', 'shade', 'paper'];
  return (
    Object.values(value.boxes).every(b => b && [b.x, b.y, b.w, b.h].every(Number.isFinite)) &&
    value.marks.every(m => {
      if (
        !m ||
        ![m.x, m.y].every(Number.isFinite) ||
        (m.tone && !tones.includes(m.tone)) ||
        (m.id !== undefined && typeof m.id !== 'string') ||
        (m.title !== undefined && typeof m.title !== 'string')
      )
        return false;
      switch (m.kind) {
        case 'text':
          return (
            typeof m.text === 'string' &&
            [m.size ?? 14, m.weight ?? 400].every(Number.isFinite) &&
            ['start', 'end', 'middle'].includes(m.anchor ?? 'start')
          );
        case 'dot':
          return Number.isFinite(m.r);
        case 'rect':
          return [m.w, m.h, m.radius ?? 0].every(Number.isFinite);
        case 'line':
          return [m.x2, m.y2, m.strokeWidth ?? 1].every(Number.isFinite);
        default:
          return false;
      }
    })
  );
}
