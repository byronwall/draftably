/**
 * Icons in boxes, from Iconify icon sets. A bare name (`database`) is a Lucide icon; `prefix:name`
 * (`logos:aws-lambda`) names any other set. Lucide ships with draftably. The CLI also reads any
 * `@iconify-json/<prefix>` package installed in the project; nothing is fetched from the network.
 *
 * The compiler loads the sets a file names and puts the used icons' data on the scene, so every
 * renderer draws from the diagram alone and an export carries only the icons it uses.
 */

/** One icon, ready to draw: its body markup on its own `left top width height` view box. */
export interface IconData {
  body: string;
  left: number;
  top: number;
  width: number;
  height: number;
  /** A one-color icon (it uses `currentColor`): drawn in the text color of the box it sits in. */
  mono: boolean;
}

type RawIcon =
  string | { body: string; width?: number; height?: number; left?: number; top?: number };

/** An Iconify set: the `@iconify-json` file, or the short form `scripts/vendor-icons.mjs` writes. */
export interface IconSet {
  prefix: string;
  width?: number;
  height?: number;
  icons: Record<string, RawIcon>;
  aliases?: Record<string, string | { parent: string }>;
}

/** The set a bare name belongs to. */
export const DEFAULT_SET = 'lucide';

/** Where sets beyond Lucide come from: the CLI reads installed `@iconify-json` packages. */
export interface IconSource {
  load(prefix: string): Promise<IconSet | undefined> | IconSet | undefined;
  /** Prefixes this source can load, for search and suggestions. */
  list?(): string[];
}

let source: IconSource | undefined;
const sets = new Map<string, IconSet | null>();
const loading = new Map<string, Promise<IconSet | null>>();

/** Read sets beyond Lucide from `s`. The CLI calls this at start-up. */
export function setIconSource(s: IconSource | undefined) {
  source = s;
}

/** A name as written: lower-case words joined by `-`, after an optional `prefix:`. */
export const ICON_NAME = /^(?:[a-z0-9]+(?:-[a-z0-9]+)*:)?[a-z0-9]+(?:[-_][a-z0-9]+)*$/;

/** The set and the icon of a name; a bare name is in Lucide. */
export function splitIcon(name: string) {
  const cut = name.indexOf(':');
  return cut < 0
    ? { prefix: DEFAULT_SET, icon: name }
    : { prefix: name.slice(0, cut), icon: name.slice(cut + 1) };
}

/** The name as a file writes it: Lucide icons without their prefix. */
export const iconLabel = (prefix: string, icon: string) =>
  prefix === DEFAULT_SET ? icon : `${prefix}:${icon}`;

/** Load a set once; null when no source has it. */
export function loadIconSet(prefix: string): Promise<IconSet | null> {
  if (sets.has(prefix)) return Promise.resolve(sets.get(prefix)!);
  let p = loading.get(prefix);
  if (!p) {
    p = (async () => {
      let set: IconSet | null;
      try {
        set =
          prefix === DEFAULT_SET
            ? ((await import('../assets/icons/lucide.json')).default as IconSet)
            : ((await source?.load(prefix)) ?? null);
      } catch {
        set = null;
      }
      sets.set(prefix, set);
      loading.delete(prefix);
      return set;
    })();
    loading.set(prefix, p);
  }
  return p;
}

/** Every set a source can load, plus Lucide. */
export const knownSets = () => [...new Set([DEFAULT_SET, ...(source?.list?.() ?? [])])];

/** Load every known set: for search and suggestions. */
export const loadAllIconSets = () => Promise.all(knownSets().map(loadIconSet));

/** The loaded sets. */
const loaded = () => [...sets.values()].filter((s): s is IconSet => !!s);

/** An icon from a loaded set; undefined when its set is not loaded or has no such icon. */
export function iconData(name: string): IconData | undefined {
  const { prefix, icon } = splitIcon(name),
    set = sets.get(prefix);
  if (!set) return;
  let key = icon;
  for (let hops = 0; !set.icons[key] && set.aliases?.[key] && hops < 4; hops++) {
    const a = set.aliases[key];
    key = typeof a === 'string' ? a : a.parent;
  }
  const raw = set.icons[key];
  if (!raw) return;
  const i = typeof raw === 'string' ? { body: raw } : raw;
  return {
    body: i.body,
    left: i.left ?? 0,
    top: i.top ?? 0,
    width: i.width ?? set.width ?? 16,
    height: i.height ?? set.height ?? 16,
    mono: i.body.includes('currentColor'),
  };
}

/** Load the sets `names` use, and return the data of each icon found. */
export async function loadIcons(names: Iterable<string>) {
  const all = [...new Set(names)];
  await Promise.all([...new Set(all.map(n => splitIcon(n).prefix))].map(loadIconSet));
  const out: Record<string, IconData> = {};
  for (const n of all) {
    const d = iconData(n);
    if (d) out[n] = d;
  }
  return out;
}

/** Every name in the loaded sets, as a file writes it, aliases included. */
export function iconNames(prefix?: string): string[] {
  return loaded()
    .filter(s => !prefix || s.prefix === prefix)
    .flatMap(s =>
      [...Object.keys(s.icons), ...Object.keys(s.aliases ?? {})].map(i => iconLabel(s.prefix, i)),
    );
}

/** Common words for things in architecture diagrams that no Lucide name says. */
const WORDS: Record<string, string[]> = {
  postgres: ['database'],
  postgresql: ['database'],
  mysql: ['database'],
  sql: ['database'],
  db: ['database'],
  table: ['table', 'database'],
  queue: ['inbox', 'list-ordered'],
  topic: ['radio-tower', 'inbox'],
  kafka: ['inbox'],
  stream: ['waves'],
  cache: ['database-zap'],
  redis: ['database-zap'],
  bucket: ['archive'],
  s3: ['archive'],
  blob: ['archive'],
  storage: ['hard-drive'],
  disk: ['hard-drive'],
  lambda: ['zap'],
  function: ['zap', 'square-function'],
  serverless: ['zap'],
  vm: ['server'],
  host: ['server'],
  k8s: ['container'],
  kubernetes: ['container'],
  docker: ['container'],
  pod: ['box'],
  api: ['webhook', 'plug'],
  gateway: ['door-open', 'network'],
  proxy: ['shuffle', 'network'],
  balancer: ['scale', 'network'],
  cdn: ['globe'],
  dns: ['globe'],
  web: ['globe', 'monitor'],
  browser: ['app-window', 'globe'],
  email: ['mail'],
  phone: ['smartphone'],
  mobile: ['smartphone'],
  person: ['user'],
  customer: ['user'],
  people: ['users'],
  team: ['users'],
  auth: ['lock', 'key-round'],
  login: ['log-in'],
  secret: ['key-round'],
  payment: ['credit-card'],
  billing: ['receipt'],
  invoice: ['receipt'],
  log: ['scroll-text'],
  logs: ['scroll-text'],
  metrics: ['chart-line'],
  monitoring: ['activity'],
  alert: ['bell'],
  search: ['search'],
  ai: ['bot', 'sparkles'],
  llm: ['bot', 'brain'],
  model: ['brain'],
  job: ['briefcase', 'timer'],
  cron: ['clock'],
  scheduler: ['calendar-clock'],
  worker: ['cog'],
  service: ['server'],
  config: ['settings'],
  file: ['file'],
  document: ['file-text'],
};

/** Edit distance, for near misses such as `databse`. */
function distance(a: string, b: string) {
  if (Math.abs(a.length - b.length) > 3) return 99;
  let row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const next = [i];
    for (let j = 1; j <= b.length; j++)
      next[j] = Math.min(row[j] + 1, next[j - 1] + 1, row[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    row = next;
  }
  return row[b.length];
}

/**
 * Names in the loaded sets that match `query`, best first: exact names, then names that start
 * with it, then names with it as a word, then names that hold it, then common words for it.
 */
export function searchIcons(query: string, limit = 20, prefix?: string): string[] {
  const q = query.trim().toLowerCase().replace(/\s+/g, '-');
  const names = iconNames(prefix);
  if (!q) return names.slice(0, limit);
  const scored: Array<[string, number]> = [];
  for (const n of names) {
    const bare = splitIcon(n).icon,
      rank =
        n === q || bare === q
          ? 0
          : bare.startsWith(q)
            ? 1
            : bare.split('-').includes(q)
              ? 2
              : n.includes(q)
                ? 3
                : -1;
    if (rank >= 0) scored.push([n, rank * 1000 + n.length]);
  }
  scored.sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]));
  const out = scored.map(s => s[0]);
  for (const w of WORDS[q] ?? []) if (!out.includes(w) && iconData(w)) out.push(w);
  return out.slice(0, limit);
}

/** Icons architecture diagrams use most, for a search with nothing typed yet. */
const COMMON = [
  'database',
  'server',
  'cloud',
  'globe',
  'monitor',
  'smartphone',
  'user',
  'users',
  'lock',
  'key-round',
  'shield',
  'mail',
  'inbox',
  'zap',
  'cpu',
  'container',
  'box',
  'layers',
  'bot',
  'hard-drive',
  'network',
  'webhook',
  'credit-card',
  'receipt',
  'file-text',
  'folder',
  'settings',
  'bell',
  'chart-line',
  'activity',
  'clock',
  'search',
  'git-branch',
  'workflow',
  'message-square',
  'building-2',
  'store',
  'shopping-cart',
  'truck',
  'package',
];

/**
 * Icons to offer for a box before anything is typed: names its label's words match, then the
 * common architecture icons.
 */
export function starterIcons(label: string, limit = 48): string[] {
  const out: string[] = [];
  for (const word of label.toLowerCase().split(/[^a-z0-9]+/))
    if (word.length > 2) for (const n of searchIcons(word, 3)) if (!out.includes(n)) out.push(n);
  for (const n of COMMON) if (!out.includes(n) && iconData(n)) out.push(n);
  return out.slice(0, limit);
}

/**
 * Up to `max` names close to an unknown one: a name that holds it (`postgres` →
 * `logos:postgresql`), a common word for it (`postgres` → `database`), or a near spelling.
 */
export function suggestIcons(name: string, max = 2): string[] {
  const { prefix, icon } = splitIcon(name),
    q = icon.toLowerCase(),
    names = iconNames(),
    out: string[] = [];
  const add = (n: string | undefined) => {
    if (n && !out.includes(n) && out.length < max) out.push(n);
  };
  // The same icon in another set, then a name that holds it.
  for (const n of names) if (splitIcon(n).icon === q && n !== name) add(n);
  add(names.filter(n => splitIcon(n).icon.startsWith(q)).sort((a, b) => a.length - b.length)[0]);
  for (const w of WORDS[q] ?? []) if (iconData(w)) add(w);
  // A near spelling in the set it names.
  let best: string | undefined,
    least = q.length > 4 ? 3 : 2;
  for (const n of iconNames(prefix)) {
    const d = distance(q, splitIcon(n).icon);
    if (d < least) [best, least] = [n, d];
  }
  add(best);
  return out;
}

const round = (n: number) => Math.round(n * 100) / 100;

/**
 * An icon drawn in a `size` square at (x, y), as SVG markup. A one-color icon takes `ink`; a color
 * icon keeps its colors, with its ids made unique by `uid` so two icons never share a gradient.
 * The markup is plain shapes in a `<g transform>`, which the canvas, resvg and PDFKit all draw.
 */
export function iconMarkup(d: IconData, x: number, y: number, size: number, ink: string, uid = '') {
  const s = size / Math.max(d.width, d.height),
    dx = x + (size - d.width * s) / 2 - d.left * s,
    dy = y + (size - d.height * s) / 2 - d.top * s;
  const body = d.mono
    ? d.body.replace(/currentColor/g, ink)
    : uid
      ? d.body
          .replace(/\bid="([^"]+)"/g, `id="${uid}-$1"`)
          .replace(/url\(#([^)]+)\)/g, `url(#${uid}-$1)`)
          .replace(/href="#([^"]+)"/g, `href="#${uid}-$1"`)
      : d.body;
  return `<g class="icon" pointer-events="none" transform="translate(${round(dx)} ${round(dy)}) scale(${round(s * 1000) / 1000})">${body}</g>`;
}

/** The mark for an icon no set has: a dashed square, so the box shows what is missing. */
export const missingIconMarkup = (x: number, y: number, size: number, ink: string) =>
  `<rect class="icon missing" pointer-events="none" x="${round(x + 1)}" y="${round(y + 1)}" width="${size - 2}" height="${size - 2}" rx="3" fill="none" stroke="${ink}" stroke-opacity="0.5" stroke-dasharray="3 2"/>`;

/** Name's icon from `icons` in a `size` square at (x, y), or the missing mark when it has none. */
export const iconAt = (
  icons: Record<string, IconData> | undefined,
  name: string,
  x: number,
  y: number,
  size: number,
  ink: string,
  uid: string,
) => {
  const d = icons?.[name];
  return d ? iconMarkup(d, x, y, size, ink, uid) : missingIconMarkup(x, y, size, ink);
};
