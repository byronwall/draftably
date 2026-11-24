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
