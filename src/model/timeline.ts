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
  | { k: 'dot'; x: number; y: number; r: number; ink: TimelineInk; hollow?: boolean }
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
  x: number;
  y: number;
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

/** The type a timeline font role uses, from the diagram's own profiles. */
export function timelineFont(look: ResolvedAppearance, font: TimelineFont) {
  switch (font) {
    case 'name':
      return { ...look.title, weight: 500 };
    case 'key':
      return { ...look.title, weight: 700 };
    case 'band':
      return { ...look.groupTitle, size: look.groupTitle.size + 3, weight: 700 };
    case 'detail':
      return { ...look.annotation, size: look.annotation.size + 0.5 };
    case 'label':
      return { ...look.annotation, size: look.annotation.size + 1, weight: 500 };
    case 'caps':
      return { ...look.annotation, size: look.annotation.size - 0.5, weight: 700 };
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
    return swatchFor(look, ink.family, shade).fill;
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

/** One mark as SVG markup, for the string renderer. */
export function markSvg(look: ResolvedAppearance, m: TimelineMark): string {
  const c = timelineColor(look, m.ink);
  switch (m.k) {
    case 'line':
      return `<line x1="${m.x1}" y1="${m.y1}" x2="${m.x2}" y2="${m.y2}" stroke="${c}" stroke-width="${m.w}"${m.dash ? ` stroke-dasharray="${m.dash}"` : ''}${m.round ? ' stroke-linecap="round"' : ''}/>`;
    case 'rect':
      return `<rect x="${m.x}" y="${m.y}" width="${m.w}" height="${m.h}"${m.r ? ` rx="${m.r}"` : ''} fill="${c}"/>`;
    case 'dot':
      return m.hollow
        ? `<circle cx="${m.x}" cy="${m.y}" r="${m.r}" fill="${look.canvas}" stroke="${c}" stroke-width="2"/>`
        : `<circle cx="${m.x}" cy="${m.y}" r="${m.r}" fill="${c}"/>`;
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

/** The whole timeline as SVG: marks under the rows, a hit area per row, marks over the rows. */
export function timelineSvg(
  look: ResolvedAppearance,
  plan: TimelinePlan,
  rows: Array<{ id: string; rect: Rect }>,
): string {
  return [
    '<g class="timeline">',
    ...plan.under.map(m => markSvg(look, m)),
    ...rows.map(
      ({ id, rect: r }) =>
        `<rect data-id="${escText(id)}" x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="transparent"/>`,
    ),
    ...plan.over.map(m => markSvg(look, m)),
    '</g>',
  ].join('\n');
}
