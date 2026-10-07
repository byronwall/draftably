import type { ColorKey, NodeStyle, ShapeKind, Theme } from './types';

export interface ColorSwatch {
  fill: string;
  stroke: string;
  ink: string;
}

export const PALETTE: Record<ColorKey, ColorSwatch & { dark: ColorSwatch }> = {
  violet: {
    fill: '#f2eefc',
    stroke: '#d2c6ee',
    ink: '#7454b8',
    dark: { fill: '#332a48', stroke: '#655081', ink: '#c4a6f7' },
  },
  blue: {
    fill: '#edf4fd',
    stroke: '#bed3ef',
    ink: '#477eb6',
    dark: { fill: '#24364c', stroke: '#40618a', ink: '#99c4f3' },
  },
  mint: {
    fill: '#eaf6f0',
    stroke: '#b6decd',
    ink: '#318568',
    dark: { fill: '#233b35', stroke: '#426c5e', ink: '#91d4b9' },
  },
  amber: {
    fill: '#fff6e8',
    stroke: '#e9d3a7',
    ink: '#a97925',
    dark: { fill: '#403629', stroke: '#77603c', ink: '#e9c78c' },
  },
  rose: {
    fill: '#fbedf1',
    stroke: '#e8c1ce',
    ink: '#b36380',
    dark: { fill: '#422a36', stroke: '#805065', ink: '#efaac3' },
  },
  slate: {
    fill: '#f4f5f8',
    stroke: '#ccd1de',
    ink: '#62708a',
    dark: { fill: '#303643', stroke: '#596377', ink: '#b2bfd5' },
  },
};

export const COLOR_KEYS = Object.keys(PALETTE) as ColorKey[];

export function colorTokens(key: ColorKey | undefined, theme: Theme): ColorSwatch {
  const swatch = PALETTE[key ?? 'slate'] ?? PALETTE.slate;
  return theme === 'dark' ? swatch.dark : swatch;
}

export const SHAPES: ShapeKind[] = ['box', 'pill', 'circle', 'diamond', 'text', 'icon', 'image'];

export const SHAPE_LABELS: Record<ShapeKind, string> = {
  box: 'Rectangle',
  pill: 'Pill',
  circle: 'Ellipse',
  diamond: 'Diamond',
  text: 'Text',
  icon: 'Icon',
  image: 'Image',
};

/** Icons offered in the inspector for a shape. */
export const NODE_ICONS = [
  'user',
  'browser',
  'server',
  'database',
  'key',
  'cloud',
  'bolt',
  'check',
  'file',
  'folder',
  'mail',
  'globe',
  'terminal',
  'cube',
  'chart',
  'truck',
];

/** Styles for version 1 node types, used only when migrating old files. */
export const LEGACY_TYPE_STYLE: Record<string, NodeStyle> = {
  actor: { shape: 'icon', color: 'slate', icon: 'user' },
  input: { shape: 'box', color: 'amber', icon: 'file' },
  process: { shape: 'box', color: 'violet', icon: 'bolt' },
  decision: { shape: 'diamond', color: 'amber', icon: '' },
  handoff: { shape: 'pill', color: 'blue', icon: 'arrow' },
  deliverable: { shape: 'box', color: 'mint', icon: 'check' },
  storage: { shape: 'box', color: 'blue', icon: 'database' },
  annotation: { shape: 'text', color: 'slate', icon: '' },
};

export const DEFAULT_STYLE: NodeStyle = { shape: 'box', color: 'blue', icon: '' };

/** Default size for a new shape of the given kind. */
export function defaultShapeSize(shape: ShapeKind): { w: number; h: number } {
  if (shape === 'circle' || shape === 'icon') return { w: 80, h: 80 };
  if (shape === 'diamond') return { w: 132, h: 100 };
  if (shape === 'text') return { w: 164, h: 38 };
  return { w: 164, h: 56 };
}
