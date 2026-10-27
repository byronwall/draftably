/**
 * Diagram appearance: five preset themes, color families with numeric shades, and the overrides a
 * file can set. `resolveAppearance` turns a saved appearance into the concrete colors, spacing and
 * type that sizing, the canvas and both SVG exports read, so all of them agree.
 *
 * Diagram appearance is separate from the editor's light or dark mode.
 */
import type { FileConfig } from './link';
import { typeProfile, type FontRole, type TypeProfile } from './fonts';

export type ThemeId = 'graphite' | 'fieldnotes' | 'signal' | 'mulberry' | 'midnight';
export const THEME_IDS: ThemeId[] = ['graphite', 'fieldnotes', 'signal', 'mulberry', 'midnight'];
export const DEFAULT_THEME: ThemeId = 'graphite';

/** Shade stops. Lower numbers are lighter and higher numbers darker, in every theme. */
export const SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;
export type Shade = (typeof SHADES)[number];
export const isShade = (n: unknown): n is Shade => SHADES.includes(n as Shade);
/** Shade of a node that names a color without a shade. */
export const NODE_SHADE: Shade = 500;
/**
 * Shade of a group that names a color without a shade. Groups are quiet surfaces behind nodes, so
 * this is a pale shade in light themes and a deep one in dark themes; the scale itself never flips.
 */
export const groupShadeFor = (theme: ThemeId): Shade => (PRESETS[theme]?.dark ? 900 : 100);

/** Built-in color families, available in every theme. `primary` and `secondary` follow the theme. */
export const BUILT_IN_FAMILIES = [
  'primary',
  'secondary',
  'slate',
  'stone',
  'blue',
  'sky',
  'teal',
  'mint',
  'green',
  'amber',
  'orange',
  'red',
  'rose',
  'violet',
] as const;
export const isBuiltInFamily = (name: string) =>
  (BUILT_IN_FAMILIES as readonly string[]).includes(name);

export interface Swatch {
  fill: string;
  stroke: string;
  ink: string;
}

/** A file's color declaration: one shade of a family. Built-in shades may set some fields only. */
export interface ColorDefinition {
  family: string;
  shade: Shade;
  fill?: string;
  stroke?: string;
  ink?: string;
}

export interface AppearanceOverrides {
  paddingX?: number;
  paddingY?: number;
  radius?: number;
  titleFont?: FontRole;
  annotationFont?: FontRole;
  canvas?: string;
  text?: string;
  connection?: string;
}

export interface DiagramAppearance {
  theme: ThemeId;
  overrides: AppearanceOverrides;
  colors: ColorDefinition[];
  /** What the colors mean, from `legend` statements, drawn as a key beside the diagram. */
  legend?: LegendEntry[];
  /** Title and subtitle drawn above exported images, from `diagram` and `subtitle` statements. */
  heading?: Heading;
  /** Panel labels from a `compare` statement: draw the old and new versions side by side. */
  compare?: {
    before: string;
    after: string;
    /** `right` sets the panels side by side, `down` stacks them; chosen by `aspect` when unset. */
    direction?: 'right' | 'down';
    /** Width over height the whole image should come closest to; 1.6 when unset. */
    aspect?: number;
  };
  /** File settings from `config` statements. */
  config?: FileConfig;
}

export interface Heading {
  title?: string;
  subtitle?: string;
}

export interface LegendEntry {
  family: string;
  /** Shade of the swatch; nodes' default when omitted. */
  shade?: Shade;
  label: string;
}

export const defaultAppearance = (): DiagramAppearance => ({
  theme: DEFAULT_THEME,
  overrides: {},
  colors: [],
});

/** Limits for numeric overrides, shared by the file parser and JSON validation. */
export const OVERRIDE_LIMITS = {
  paddingX: { min: 4, max: 48 },
  paddingY: { min: 4, max: 48 },
  radius: { min: 0, max: 24 },
} as const;

export const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

// --- Presets -----------------------------------------------------------------------------------

interface Preset {
  label: string;
  description: string;
  dark: boolean;
  canvas: string;
  text: string;
  muted: string;
  connection: string;
  node: Swatch;
  group: Swatch;
  paddingX: number;
  paddingY: number;
  radius: number;
  shadow: boolean;
  titleFont: FontRole;
  annotationFont: FontRole;
  titleSize: number;
  titleLine: number;
  annotationSize: number;
  /** Chroma multiplier for the built-in families: how saturated this theme's colors are. */
  chroma: number;
  /** Anchor colors for `primary` and `secondary`, at the shade they appear as. */
  primary: [string, Shade];
  secondary: [string, Shade];
}

export const PRESETS: Record<ThemeId, Preset> = {
  graphite: {
    label: 'Graphite',
    description: 'Compact and neutral, with deep green and ochre',
    dark: false,
    canvas: '#F5F5F2',
    text: '#24292B',
    muted: '#5D6664',
    connection: '#4B5553',
    node: { fill: '#FFFFFF', stroke: '#C5CBC8', ink: '#24292B' },
    group: { fill: '#ECEDE9', stroke: '#D3D7D2', ink: '#3E4745' },
    paddingX: 12,
    paddingY: 20,
    radius: 4,
    shadow: false,
    titleFont: 'sans',
    annotationFont: 'sans',
    titleSize: 13,
    titleLine: 16,
    annotationSize: 11,
    chroma: 0.8,
    primary: ['#334C49', 800],
    secondary: ['#E8C879', 300],
  },
  fieldnotes: {
    label: 'Fieldnotes',
    description: 'Editorial serif titles on warm paper, forest and clay',
    dark: false,
    canvas: '#F7F2E8',
    text: '#302E28',
    muted: '#6B6559',
    connection: '#5A554A',
    node: { fill: '#FFFCF5', stroke: '#CFC5B2', ink: '#302E28' },
    group: { fill: '#EFE8DA', stroke: '#D9CFBC', ink: '#4A4539' },
    paddingX: 18,
    paddingY: 22,
    radius: 3,
    shadow: false,
    titleFont: 'serif',
    annotationFont: 'sans',
    titleSize: 15,
    titleLine: 19,
    annotationSize: 11,
    chroma: 0.7,
    primary: ['#405D48', 700],
    secondary: ['#AC543A', 600],
  },
  signal: {
    label: 'Signal',
    description: 'Crisp cobalt on white, with monospace annotations',
    dark: false,
    canvas: '#FFFFFF',
    text: '#172B4D',
    muted: '#53627C',
    connection: '#42526E',
    node: { fill: '#F1F4F8', stroke: '#C1CAD8', ink: '#172B4D' },
    group: { fill: '#F7F9FC', stroke: '#D5DCE6', ink: '#2C3E5D' },
    paddingX: 16,
    paddingY: 20,
    radius: 6,
    shadow: false,
    titleFont: 'sans',
    annotationFont: 'mono',
    titleSize: 13,
    titleLine: 16,
    annotationSize: 10.5,
    chroma: 1.05,
    primary: ['#234BCD', 600],
    secondary: ['#F1BC75', 300],
  },
  mulberry: {
    label: 'Mulberry',
    description: 'Generous berry and lilac for presentations',
    dark: false,
    canvas: '#F7F3F6',
    text: '#352A35',
    muted: '#6E5F6D',
    connection: '#5E4E5D',
    node: { fill: '#FFFCFE', stroke: '#DCCFD9', ink: '#352A35' },
    group: { fill: '#F0E8EE', stroke: '#E0D3DD', ink: '#4E3D4C' },
    paddingX: 22,
    paddingY: 26,
    radius: 8,
    shadow: true,
    titleFont: 'sans',
    annotationFont: 'sans',
    titleSize: 14,
    titleLine: 19,
    annotationSize: 11.5,
    chroma: 0.85,
    primary: ['#713E61', 700],
    secondary: ['#D6C5DF', 200],
  },
  midnight: {
    label: 'Midnight',
    description: 'Dark ink with teal and coral, monospace titles',
    dark: true,
    canvas: '#172428',
    text: '#EDF3EF',
    muted: '#A9BAB6',
    connection: '#9DB1AC',
    node: { fill: '#24363B', stroke: '#3D555B', ink: '#EDF3EF' },
    group: { fill: '#1D2E33', stroke: '#33494F', ink: '#C9D8D4' },
    paddingX: 16,
    paddingY: 20,
    radius: 5,
    shadow: false,
    titleFont: 'mono',
    annotationFont: 'sans',
    titleSize: 12.5,
    titleLine: 17,
    annotationSize: 11,
    chroma: 0.85,
    primary: ['#8BC5B7', 300],
    secondary: ['#DF9C82', 300],
  },
};

// --- Color math (OKLCH) ------------------------------------------------------------------------

type Lch = [number, number, number];

const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const fromLinear = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.length === 4 ? hex.replace(/[0-9a-f]/gi, c => c + c) : hex;
  return [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255) as [number, number, number];
}

function hexToLch(hex: string): Lch {
  const [r, g, b] = hexToRgb(hex).map(toLinear);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b),
    m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b),
    s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return [L, Math.hypot(A, B), ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360];
}

function lchToLinear([L, C, H]: Lch): [number, number, number] {
  const a = C * Math.cos((H * Math.PI) / 180),
    b = C * Math.sin((H * Math.PI) / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3,
    m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3,
    s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

/** OKLCH to hex, lowering chroma until the color is inside sRGB. */
function lchToHex([L, C, H]: Lch): string {
  let c = C,
    rgb = lchToLinear([L, c, H]);
  while (c > 0 && rgb.some(v => v < -0.0005 || v > 1.0005)) {
    c = Math.max(0, c - 0.004);
    rgb = lchToLinear([L, c, H]);
  }
  return (
    '#' +
    rgb
      .map(v =>
        Math.round(Math.min(1, Math.max(0, fromLinear(Math.min(1, Math.max(0, v))))) * 255)
          .toString(16)
          .padStart(2, '0'),
      )
      .join('')
      .toUpperCase()
  );
}

/** WCAG relative luminance and contrast ratio. */
function luminance(hex: string) {
  const [r, g, b] = hexToRgb(hex).map(toLinear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export function contrast(a: string, b: string) {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

/**
 * Lightness of each shade, light to dark. Shades fall in two bands with no mid-tones between
 * them: 50–300 are pale fills with dark text, 400–950 are fills dark enough for white text.
 * Mid-tone fills read poorly with either ink, so the scale steps over them.
 */
const LIGHTNESS: Record<Shade, number> = {
  50: 0.975,
  100: 0.945,
  200: 0.9,
  300: 0.84,
  400: 0.62,
  500: 0.56,
  600: 0.5,
  700: 0.44,
  800: 0.38,
  900: 0.32,
  950: 0.26,
};
const isPale = (s: Shade) => s <= 300;

/** Contrast targets (WCAG ratios) every generated color meets. */
export const CONTRAST = {
  /** Dark title text on a pale fill. */
  paleInk: 7,
  /** White title text on a dark fill. */
  darkInk: 4.5,
  /** A shape's outline against the canvas when its fill alone does not separate it. */
  outline: 3,
  /** Connection lines and connection label text against the canvas. */
  connection: 4.5,
  /** A group's frame against the canvas. */
  frame: 2,
} as const;

/** How much of a family's chroma a shade carries: pale and very dark shades are quieter. */
const chromaAt = (L: number) => Math.max(0.18, 1 - ((L - 0.6) / 0.42) ** 2);

/** Hue and chroma of the built-in families. */
const FAMILY_HUES: Record<string, [number, number]> = {
  slate: [255, 0.035],
  stone: [70, 0.022],
  blue: [258, 0.15],
  sky: [232, 0.11],
  teal: [192, 0.09],
  mint: [165, 0.1],
  green: [145, 0.12],
  amber: [78, 0.13],
  orange: [52, 0.15],
  red: [27, 0.17],
  rose: [2, 0.13],
  violet: [295, 0.15],
};

const DARK_INK = (h: number): string => lchToHex([0.24, 0.035, h]);
const LIGHT_INK = '#FFFFFF';

/**
 * Move a color's lightness away from `against` until it reaches `min` contrast with it. Colors
 * that already meet the target are returned unchanged.
 */
export function ensureContrast(color: string, against: string, min: number): string {
  if (contrast(color, against) >= min) return color;
  const [L, C, H] = hexToLch(color),
    step = luminance(against) > 0.18 ? -0.01 : 0.01;
  let out = color;
  for (let l = L; l > 0 && l < 1 && contrast(out, against) < min; l += step)
    out = lchToHex([l, C, H]);
  return out;
}

/**
 * One shade starting at lightness `L`: a fill that meets its ink target, and an outline visible on
 * the canvas. Returns the lightness the fill ended at.
 */
function swatchAt(
  shade: Shade,
  start: number,
  C: number,
  H: number,
  canvas: string,
  dark: boolean,
  fixed?: string,
): { swatch: Swatch; L: number } {
  const pale = isPale(shade),
    ink = pale ? DARK_INK(H) : LIGHT_INK,
    target = pale ? CONTRAST.paleInk : CONTRAST.darkInk;
  let L = fixed ? hexToLch(fixed)[0] : start,
    fill = fixed ?? lchToHex([L, C * chromaAt(L), H]);
  while (contrast(fill, ink) < target && L > 0.05 && L < 0.995) {
    L += pale ? 0.005 : -0.01;
    fill = lchToHex([L, C * chromaAt(L), H]);
  }
  const edge = pale ? L - 0.2 : dark ? L + 0.14 : L - 0.08;
  let stroke = lchToHex([edge, C * chromaAt(edge) * 1.1, H]);
  if (contrast(fill, canvas) < CONTRAST.outline)
    stroke = ensureContrast(stroke, canvas, CONTRAST.outline);
  return { swatch: { fill, stroke, ink }, L };
}

/** Lightness step between neighboring dark shades, so every stop stays distinct. */
const DARK_STEP = 0.055;

/** A family's shades in order; each fill is darker than the one before. */
function ramp(H: number, C: number, canvas: string, dark: boolean, anchor?: [string, Shade]) {
  const out = new Map<Shade, Swatch>();
  let previous = 1;
  for (const shade of SHADES) {
    const start = isPale(shade)
      ? LIGHTNESS[shade]
      : Math.min(LIGHTNESS[shade], previous - DARK_STEP);
    let next = swatchAt(
      shade,
      start,
      C,
      H,
      canvas,
      dark,
      anchor?.[1] === shade ? anchor[0] : undefined,
    );
    // An anchor that would break the order gives way to the generated shade.
    if (next.L >= previous - 0.01) next = swatchAt(shade, start, C, H, canvas, dark);
    previous = next.L;
    out.set(shade, next.swatch);
  }
  return out;
}

/** A ramp through a theme's anchor color, which sits at its shade when it meets the targets. */
function anchoredRamp([color, at]: [string, Shade], canvas: string, dark: boolean) {
  const [L, C, H] = hexToLch(color);
  return ramp(H, C / chromaAt(L), canvas, dark, [color.toUpperCase(), at]);
}

const presetFamilies = new Map<string, Map<string, Map<Shade, Swatch>>>();

/** The built-in families of a preset on a canvas color, generated once. */
export function builtInFamilies(
  theme: ThemeId,
  canvas = PRESETS[theme].canvas,
): Map<string, Map<Shade, Swatch>> {
  const key = theme + canvas;
  let families = presetFamilies.get(key);
  if (!families) {
    const p = PRESETS[theme];
    families = new Map([
      ['primary', anchoredRamp(p.primary, canvas, p.dark)],
      ['secondary', anchoredRamp(p.secondary, canvas, p.dark)],
    ]);
    for (const [name, [h, c]] of Object.entries(FAMILY_HUES))
      families.set(name, ramp(h, c * p.chroma, canvas, p.dark));
    presetFamilies.set(key, families);
  }
  return families;
}

// --- Resolution --------------------------------------------------------------------------------

export interface ResolvedAppearance {
  theme: ThemeId;
  dark: boolean;
  canvas: string;
  text: string;
  muted: string;
  connection: string;
  /** Default node and group colors when nothing names a family. */
  node: Swatch;
  group: Swatch;
  paddingX: number;
  paddingY: number;
  radius: number;
  shadow: boolean;
  title: TypeProfile;
  groupTitle: TypeProfile;
  annotation: TypeProfile;
  /** Space above a group's content; the group title sits in it. */
  groupHeader: number;
  /** Every family and the shades it defines: built-in ones plus the file's own. */
  families: Map<string, Map<Shade, Swatch>>;
  custom: Set<string>;
}

/** Height of a group's title band, derived from the title's line height. */
export const groupHeaderFor = (lineHeight: number) => Math.round(lineHeight + 32);

const cache = new Map<string, ResolvedAppearance>();

/** Preset values, then file overrides. Omitted fields inherit from the preset. */
export function resolveAppearance(appearance?: DiagramAppearance): ResolvedAppearance {
  const a = appearance ?? defaultAppearance();
  const key = JSON.stringify(a);
  const known = cache.get(key);
  if (known) return known;
  const p = PRESETS[a.theme] ?? PRESETS[DEFAULT_THEME],
    o = a.overrides;
  const titleFont = o.titleFont ?? p.titleFont,
    annotationFont = o.annotationFont ?? p.annotationFont;
  const canvas = o.canvas ?? p.canvas;
  const families = new Map(
    [...builtInFamilies(a.theme, canvas)].map(([name, shades]) => [name, new Map(shades)]),
  );
  const custom = new Set<string>();
  for (const c of a.colors) {
    if (!families.has(c.family)) {
      families.set(c.family, new Map());
      custom.add(c.family);
    }
    const shades = families.get(c.family)!,
      base = shades.get(c.shade);
    if (base || (c.fill && c.stroke && c.ink))
      shades.set(c.shade, {
        fill: c.fill ?? base!.fill,
        stroke: c.stroke ?? base!.stroke,
        ink: c.ink ?? base!.ink,
      });
  }
  const title = typeProfile(titleFont, true, p.titleSize, p.titleLine);
  const resolved: ResolvedAppearance = {
    theme: a.theme,
    dark: p.dark,
    // Preset colors are held to the contrast targets against the actual canvas; colors the file
    // sets explicitly are used exactly as written.
    canvas,
    text: o.text ?? ensureContrast(p.text, canvas, 7),
    muted: ensureContrast(p.muted, canvas, CONTRAST.connection),
    connection: o.connection ?? ensureContrast(p.connection, canvas, CONTRAST.connection),
    node: {
      fill: p.node.fill,
      stroke: ensureContrast(p.node.stroke, canvas, CONTRAST.outline),
      ink: o.text ?? ensureContrast(p.node.ink, p.node.fill, CONTRAST.paleInk),
    },
    group: {
      fill: p.group.fill,
      stroke: ensureContrast(p.group.stroke, canvas, CONTRAST.frame),
      ink: ensureContrast(p.group.ink, p.group.fill, CONTRAST.paleInk),
    },
    paddingX: o.paddingX ?? p.paddingX,
    paddingY: o.paddingY ?? p.paddingY,
    radius: o.radius ?? p.radius,
    shadow: p.shadow,
    title,
    groupTitle: title,
    annotation: typeProfile(
      annotationFont,
      false,
      p.annotationSize,
      Math.round(p.annotationSize * 1.4),
    ),
    groupHeader: groupHeaderFor(title.lineHeight),
    families,
    custom,
  };
  if (cache.size > 50) cache.clear();
  cache.set(key, resolved);
  return resolved;
}

/**
 * Colors for an object. `family` is a family name, or `auto` for the theme's default surface; an
 * omitted shade is 500 for nodes and 100 for groups. Unknown families or shades fall back to the
 * default surface; the file parser reports them before they get here.
 */
export function swatchFor(
  r: ResolvedAppearance,
  family: string | undefined,
  shade: Shade | undefined,
  kind: 'node' | 'group' = 'node',
): Swatch {
  const surface = kind === 'group' ? r.group : r.node;
  if (!family || family === 'auto') {
    if (shade === undefined) return surface;
    family = 'slate';
  }
  return (
    r.families
      .get(family)
      ?.get(shade ?? (kind === 'group' ? groupShadeFor(r.theme) : NODE_SHADE)) ?? surface
  );
}

/** Shades a family defines, in numeric order. */
export const shadesOf = (r: ResolvedAppearance, family: string): Shade[] =>
  SHADES.filter(s => r.families.get(family)?.has(s));
