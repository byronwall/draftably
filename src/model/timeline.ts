/**
 * A timeline drawing as one display list. The compiler lays it out once (`dsl/timeline.ts`) and
 * both renderers, the editor canvas and the SVG export, draw the same marks, so they cannot drift.
 * Colors stay semantic until drawing time, so a dark color scheme repaints without a recompile.
 */
import { mixColors, swatchFor, type ResolvedAppearance } from './appearance';
import type { Rect } from './types';

/** What a mark is painted with: a theme role, or a color family at a strong or soft step. */
export type TimelineInk =
  | 'text'
  | 'muted'
  | 'grid'
  | 'rule'
  | 'shade'
  | 'canvas'
  | { family: string; tone?: 'strong' | 'ink' | 'soft' };

export type TimelineFont = 'name' | 'detail' | 'key' | 'band' | 'small' | 'label' | 'caps';

export type TimelineMark =
  | {
      k: 'line';
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      ink: TimelineInk;
      w: number;
      dash?: string;
      round?: boolean;
    }
  | { k: 'rect'; x: number; y: number; w: number; h: number; ink: TimelineInk; r?: number }
  | { k: 'dot'; x: number; y: number; r: number; ink: TimelineInk }
  | { k: 'path'; d: string; ink: TimelineInk; stroke?: number }
  | {
      k: 'text';
      x: number;
      y: number;
      text: string;
      ink: TimelineInk;
      font: TimelineFont;
      anchor?: 'start' | 'middle' | 'end';
      /** The full text when this one was cut to fit. */
      full?: string;
    };

/** A timeline as the diagram holds it: its scope, where its plan's origin sits, and its rows. */
export interface PlacedTimeline extends TimelinePlan {
  /** The group the timeline lays out, or `root`. */
  scope: string;
  /** Where the plan's origin sits as compiled. */
  x: number;
  y: number;
  /** The origin's offset from the scope group's box, so the marks follow the group when it moves. */
  dx: number;
  dy: number;
  /** Every node the timeline draws: its rows and milestones. */
  ids: string[];
  /** Lines between two of its rows, drawn as dependency arrows on the chart, not routed. */
  edges: string[];
}

export interface TimelinePlan {
  /** The area every mark covers, in world units. */
  bounds: Rect;
  /** Drawn under the rows (grid, shading, rules) and over them (bars, labels). */
  under: TimelineMark[];
  over: TimelineMark[];
}

/**
 * The type a timeline font role uses. Each role is one of the theme's bundled faces (the bold
 * title face, the regular detail face, the annotation face) at its own size, so measurement,
 * export and the viewer's font loading all use the same face. Only sizes change here.
 */
export function timelineFont(look: ResolvedAppearance, font: TimelineFont) {
  switch (font) {
    case 'name':
      return { ...look.detail, size: look.title.size, lineHeight: look.title.lineHeight };
    case 'key':
      return look.title;
    case 'band':
      return { ...look.title, size: look.title.size + 3 };
    case 'detail':
      return { ...look.annotation, size: look.annotation.size + 0.5 };
    case 'label':
      return { ...look.detail, size: look.annotation.size + 1 };
    case 'caps':
      return { ...look.title, size: look.annotation.size - 0.5 };
    case 'small':
      return look.annotation;
  }
}

/** A concrete color for an ink in this appearance. */
export function timelineColor(look: ResolvedAppearance, ink: TimelineInk): string {
  if (typeof ink === 'object') {
    const tone = ink.tone ?? 'strong',
      shade =
        tone === 'soft'
          ? look.dark
            ? 900
            : 100
          : tone === 'ink'
            ? look.dark
              ? 300
              : 700
            : look.dark
              ? 400
              : 600;
    // A file's own family may define other shades only: take the nearest one it has.
    const have = [...(look.families.get(ink.family)?.keys() ?? [])];
    const near = have.length
      ? have.reduce((a, b) => (Math.abs(b - shade) < Math.abs(a - shade) ? b : a))
      : shade;
    return swatchFor(look, ink.family, near as typeof shade).fill;
  }
  switch (ink) {
    case 'text':
      return look.text;
    case 'muted':
      return look.muted;
    case 'grid':
      return mixColors(look.canvas, look.text, look.dark ? 0.12 : 0.07);
    case 'rule':
      return mixColors(look.canvas, look.text, look.dark ? 0.45 : 0.38);
    case 'shade':
      return mixColors(look.canvas, look.text, look.dark ? 0.1 : 0.05);
    case 'canvas':
      return look.canvas;
  }
}

const escText = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const num = (v: unknown) => typeof v === 'number' && Number.isFinite(v);
const INKS = ['text', 'muted', 'grid', 'rule', 'shade', 'canvas'];
const FONTS = ['name', 'detail', 'key', 'band', 'small', 'label', 'caps'];

/** Whether stored data is a mark this module draws, with safe values in every string field. */
export function validMark(m: unknown): m is TimelineMark {
  if (!m || typeof m !== 'object') return false;
  const v = m as Record<string, unknown>,
    ink = v.ink as { family?: unknown; tone?: unknown } | string;
  const inkOk =
    typeof ink === 'string'
      ? INKS.includes(ink)
      : !!ink &&
        typeof ink === 'object' &&
        typeof ink.family === 'string' &&
        /^[\w-]+$/.test(ink.family) &&
        (ink.tone === undefined || ['strong', 'ink', 'soft'].includes(ink.tone as string));
  if (!inkOk) return false;
  switch (v.k) {
    case 'line':
      return (
        ['x1', 'y1', 'x2', 'y2', 'w'].every(k => num(v[k])) &&
        (v.dash === undefined || (typeof v.dash === 'string' && /^[\d. ]+$/.test(v.dash)))
      );
    case 'rect':
      return ['x', 'y', 'w', 'h'].every(k => num(v[k])) && (v.r === undefined || num(v.r));
    case 'dot':
      return ['x', 'y', 'r'].every(k => num(v[k])) && v.hollow === undefined;
    case 'path':
      return (
        typeof v.d === 'string' &&
        /^[MLQZ\d.,\s-]+$/.test(v.d) &&
        (v.stroke === undefined || num(v.stroke))
      );
    case 'text':
      return (
        num(v.x) &&
        num(v.y) &&
        typeof v.text === 'string' &&
        FONTS.includes(v.font as string) &&
        (v.anchor === undefined || ['start', 'middle', 'end'].includes(v.anchor as string)) &&
        (v.full === undefined || typeof v.full === 'string')
      );
  }
  return false;
}

/** Where a timeline's marks sit now: beside its group's current box, or as compiled for root. */
export function timelineOrigin(t: PlacedTimeline, scopeRect: Rect | undefined) {
  return scopeRect ? { x: scopeRect.x + t.dx, y: scopeRect.y + t.dy } : { x: t.x, y: t.y };
}

/** One mark as SVG markup, for the string renderer. */
export function markSvg(look: ResolvedAppearance, m: TimelineMark): string {
  const c = timelineColor(look, m.ink);
  switch (m.k) {
    case 'line':
      return `<line x1="${m.x1}" y1="${m.y1}" x2="${m.x2}" y2="${m.y2}" stroke="${c}" stroke-width="${m.w}"${m.dash ? ` stroke-dasharray="${m.dash}"` : ''}${m.round ? ' stroke-linecap="round"' : ''}/>`;
    case 'rect':
      return `<rect x="${m.x}" y="${m.y}" width="${m.w}" height="${m.h}"${m.r ? ` rx="${m.r}"` : ''} fill="${c}"/>`;
    case 'dot':
      return `<circle cx="${m.x}" cy="${m.y}" r="${m.r}" fill="${c}"/>`;
    case 'path':
      return m.stroke
        ? `<path d="${m.d}" fill="none" stroke="${c}" stroke-width="${m.stroke}" stroke-linecap="round" stroke-linejoin="round"/>`
        : `<path d="${m.d}" fill="${c}"/>`;
    case 'text': {
      const f = timelineFont(look, m.font);
      return `<text x="${m.x}" y="${m.y}" dominant-baseline="central"${m.anchor && m.anchor !== 'start' ? ` text-anchor="${m.anchor}"` : ''} font-family="${escText(f.family)}" font-size="${f.size}" font-weight="${f.weight}" fill="${c}">${m.full ? `<title>${escText(m.full)}</title>` : ''}${escText(m.text)}</text>`;
    }
  }
}

/**
 * The whole timeline as SVG, with a transparent hit area over each row last, so a click anywhere
 * on a row (its title, its bar) reaches that row. `hit` wraps each area, for example in a link.
 */
export function timelineSvg(
  look: ResolvedAppearance,
  plan: TimelinePlan,
  rows: Array<{ id: string; rect: Rect }>,
  hit: (id: string, markup: string) => string = (_id, markup) => markup,
): string {
  return [
    '<g class="timeline">',
    ...plan.under.map(m => markSvg(look, m)),
    ...plan.over.map(m => markSvg(look, m)),
    ...rows.map(({ id, rect: r }) =>
      hit(
        id,
        `<rect data-id="${escText(id)}" x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="transparent"/>`,
      ),
    ),
    '</g>',
  ].join('\n');
}
