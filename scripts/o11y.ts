/**
 * `pnpm o11y`: a brief on the live render service (`draftably-api`) from Cloudflare's Workers
 * Observability API. It compares the last window (24 hours by default) with the week before it,
 * lists the open Issues with evidence, and ends with at most three actions, worst first.
 *
 *   pnpm o11y                 the last 24 hours against the 7 windows before them
 *   pnpm o11y --hours 6       a shorter window
 *   pnpm o11y --json          the raw numbers, for an agent
 *   pnpm o11y --keys          the field names Cloudflare has indexed (to debug a query)
 *
 * Each run also writes `tmp/o11y/<UTC time>.json`, so the history outlives Cloudflare's 7-day
 * retention. Field names: `packages/service/docs/observability.md`.
 *
 * Auth: a Cloudflare API token with Account → "Workers Observability: Edit" (the query endpoint
 * asks for write, even for reads) in `CF_O11Y_TOKEN`, or in `~/.config/draftably/o11y-token`.
 * Wrangler's own login has no observability scope.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ACCOUNT = process.env.CF_ACCOUNT_ID ?? '711e96a3534ceef4677e610cb54c12b9';
const SERVICE = 'draftably-api';
const API = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/workers/observability`;

const arg = (name: string) => {
  const at = process.argv.indexOf(`--${name}`);
  return at > 0 ? (process.argv[at + 1] ?? '') : undefined;
};
const HOURS = Number(arg('hours') ?? 24);
if (!(HOURS > 0 && HOURS <= 168)) {
  console.error('--hours must be between 1 and 168: Cloudflare keeps 7 days.');
  process.exit(2);
}
/** Cloudflare keeps 7 days; the baseline is as many earlier windows as fit, up to 7. */
const BASELINE = Math.max(0, Math.min(7, Math.floor((7 * 24 - HOURS) / HOURS)));

function token() {
  if (process.env.CF_O11Y_TOKEN) return process.env.CF_O11Y_TOKEN.trim();
  const file = path.join(os.homedir(), '.config/draftably/o11y-token');
  if (fs.existsSync(file)) return fs.readFileSync(file, 'utf8').trim();
  console.error(
    'No token. Make a Cloudflare API token with Account > Workers Observability: Edit, then\n' +
      '  mkdir -p ~/.config/draftably && pbpaste > ~/.config/draftably/o11y-token\n' +
      'or set CF_O11Y_TOKEN.',
  );
  process.exit(2);
}
const TOKEN = token();

async function cf<T>(method: string, url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    result?: T;
    errors?: { message: string }[];
  };
  if (!res.ok || json.success === false)
    throw Error(
      `${method} ${url.replace(API, '')}: ${res.status} ${json.errors?.map(e => e.message).join('; ') ?? ''}`,
    );
  return json.result as T;
}

// --- Telemetry queries ---------------------------------------------------------------------

type Filter =
  | { key: string; operation: string; type: 'string' | 'number'; value?: string | number }
  | { kind: 'group'; filterCombination: 'or' | 'and'; filters: Filter[] };
const eq = (key: string, value: string | number): Filter => ({
  key,
  operation: 'eq',
  type: typeof value === 'number' ? 'number' : 'string',
  value,
});
/** Fields Cloudflare indexes as numbers; every other field is a string. */
const NUMERIC = new Set([
  '$workers.event.response.status',
  'status',
  'credits_spent',
  'credits_left',
  'mcp_calls',
  '$workers.wallTimeMs',
  '$workers.cpuTimeMs',
]);
const typeOf = (key: string) => (NUMERIC.has(key) ? 'number' : 'string');
const has = (key: string): Filter => ({ key, operation: 'exists', type: typeOf(key) });
/** POSTs to one path, such as `/v1/render`. */
const post = (path: string): Filter[] => [
  eq('$workers.event.request.method', 'POST'),
  {
    key: '$workers.event.request.url',
    operation: 'regex',
    type: 'string',
    value: `^https?://[^/]+${path}$`,
  },
];
/** A GET image URL of one format, in either path form. */
const imageGet = (format: string): Filter[] => [
  eq('$workers.event.request.method', 'GET'),
  {
    key: '$workers.event.request.url',
    operation: 'regex',
    type: 'string',
    // Exactly one source segment, as the image router takes; Cloudflare shows it as REDACTED.
    value: `^https?://[^/]+/(draftably/)?${format}/[^/]+$`,
  },
];
const gte = (key: string, value: number): Filter => ({
  key,
  operation: 'gte',
  type: 'number',
  value,
});

const SCRIPT = eq('$workers.scriptName', SERVICE);
/** The Worker's own wide event, one per request. */
const WIDE = [SCRIPT, eq('event', 'request')];

interface Calc {
  operator: string;
  key?: string;
  keyType?: 'number';
}

/** One row per group: the group's values and each calculation's value, by alias. */
type Row = Record<string, string | number>;

const now = Date.now();
const window = { from: now - HOURS * 3600e3, to: now };
// With no full earlier window in retention (`--hours` over 84), there is no baseline.
const baseline = { from: window.from - Math.max(1, BASELINE) * HOURS * 3600e3, to: window.from };

let queries = 0;
async function calc(
  timeframe: { from: number; to: number },
  filters: Filter[],
  groupBy: string[],
  calcs: Calc[] = [{ operator: 'count' }],
  limit = 20,
): Promise<Row[]> {
  const aliases = calcs.map(c => (c.key ? `${c.operator}_${c.key}` : c.operator));
  const result = await cf<{
    calculations?: {
      alias?: string;
      calculation: string;
      aggregates: {
        value: number;
        count: number;
        groups?: { key: string; value: string | number }[];
      }[];
    }[];
  }>('POST', `${API}/telemetry/query`, {
    queryId: `o11y-${++queries}`,
    timeframe,
    view: 'calculations',
    dry: true,
    limit,
    parameters: {
      datasets: [],
      filters,
      filterCombination: 'and',
      groupBys: groupBy.map(value => ({ value, type: typeOf(value) })),
      calculations: calcs.map((c, i) => ({ ...c, alias: aliases[i] })),
      orderBy: { value: aliases[0], order: 'desc' },
      limit,
    },
  });
  const rows = new Map<string, Row>();
  for (const [i, c] of (result.calculations ?? []).entries()) {
    const alias = c.alias ?? aliases[i];
    for (const a of c.aggregates) {
      const groups = Object.fromEntries((a.groups ?? []).map(g => [g.key, g.value]));
      const id = JSON.stringify(groupBy.map(g => groups[g] ?? ''));
      const row = rows.get(id) ?? { ...groups };
      row[alias] = a.value;
      rows.set(id, row);
    }
  }
  return [...rows.values()];
}

const total = (rows: Row[], alias = 'count') => rows.reduce((n, r) => n + Number(r[alias] ?? 0), 0);

// --- Issues --------------------------------------------------------------------------------

interface Issue {
  id: string;
  title: string;
  status: string;
  count: number;
  service: string;
  /** Epoch ms in the API's answer; an ISO string is read too. */
  firstObserved: number | string;
  lastObserved: number | string;
}
interface Occurrence {
  timestamp: number;
  error: { name?: string; message?: string; stack?: string; mechanism?: string };
  invocation?: { traceId?: string; id?: string; path?: string; statusCode?: number };
  worker?: { scriptVersion?: { id?: string } };
}

/** The Worker version that logged the newest request event: the one live now. */
async function currentBuild() {
  const result = await cf<{
    events?: { events?: { $workers?: { scriptVersion?: { id?: string } } }[] };
  }>('POST', `${API}/telemetry/query`, {
    queryId: `o11y-${++queries}`,
    timeframe: window,
    view: 'events',
    dry: true,
    limit: 1,
    // The newest invocation, so a request cut off before its wide event still counts.
    parameters: { filters: [SCRIPT, has('$workers.outcome')] },
  });
  return result.events?.events?.[0]?.$workers?.scriptVersion?.id;
}

const ms = (t: number | string) => (typeof t === 'number' ? t : Date.parse(t));

async function issues() {
  const list = await cf<Issue[]>(
    'GET',
    `${API}/issues?status=active&service=${SERVICE}&orderBy=lastObserved&order=desc&perPage=50`,
  );
  const recent = list.filter(i => ms(i.lastObserved) >= window.from);
  return Promise.all(
    recent.map(async issue => {
      const occ = await cf<Occurrence[]>(
        'GET',
        `${API}/issues/${issue.id}/occurrences?per_page=100`,
      );
      const inWindow = occ.filter(o => o.timestamp >= window.from);
      const last = inWindow[0] ?? occ[0];
      return {
        id: issue.id,
        title: issue.title,
        isNew: ms(issue.firstObserved) >= window.from,
        total: issue.count,
        // At most the 100 newest occurrences are read, so this is a floor.
        inWindow: inWindow.length,
        versions: [...new Set(inWindow.map(o => o.worker?.scriptVersion?.id).filter(Boolean))],
        // An occurrence with no version could be on any build.
        unknownVersion: inWindow.some(o => !o.worker?.scriptVersion?.id),
        mechanism: last?.error.mechanism,
        frame: last?.error.stack
          ?.split('\n')
          .find(l => /^\s+at /.test(l))
          ?.trim(),
        traceId: last?.invocation?.traceId,
        path: last?.invocation?.path?.replace(/[^/]{41,}/g, '…'),
      };
    }),
  );
}

// --- The brief -----------------------------------------------------------------------------

async function main() {
  if (process.argv.includes('--keys')) {
    const keys = await cf<{ key: string; type: string }[]>('POST', `${API}/telemetry/keys`, {
      timeframe: window,
      datasets: [],
      filters: [SCRIPT],
      limit: 1000,
    });
    for (const k of keys) console.log(`${k.key}\t${k.type}`);
    return;
  }

  const [
    byRoute,
    errors,
    baseErrors,
    errorsByBuild,
    cache,
    latency,
    png,
    svg,
    rest,
    mcp,
    limits,
    logins,
    hooks,
    tools,
    spenders,
    broke,
    scanners,
    issueList,
    current,
    totals,
  ] = await Promise.all([
    calc(window, WIDE, ['route', 'status']),
    calc(
      window,
      [...WIDE, has('error_code')],
      ['error_code', 'diagnostic', 'error_name'],
      [{ operator: 'count' }],
      15,
    ),
    calc(baseline, [...WIDE, has('error_code')], ['error_code'], [{ operator: 'count' }], 50),
    calc(window, [...WIDE, has('error_code')], ['error_code', 'build']),
    calc(window, [...WIDE, has('cache')], ['format', 'cache']),
    // Latency comes from Cloudflare's measure on the invocation log, not the event's `ms`.
    calc(window, [SCRIPT, has('$workers.wallTimeMs')], [], latencyCalcs()),
    calc(window, [SCRIPT, ...imageGet('png')], [], latencyCalcs()),
    calc(window, [SCRIPT, ...imageGet('svg')], [], latencyCalcs()),
    calc(window, [SCRIPT, ...post('/v1/render')], [], latencyCalcs()),
    calc(window, [SCRIPT, ...post('/mcp')], [], latencyCalcs()),
    calc(window, [...WIDE, has('rate_limit')], ['rate_limit']),
    calc(window, [...WIDE, has('login')], ['login']),
    calc(window, [...WIDE, has('webhook')], ['webhook', 'stripe_event']),
    calc(window, [...WIDE, has('mcp_tool')], ['mcp_tool', 'status']),
    calc(
      window,
      [...WIDE, has('account')],
      ['account'],
      // Ranked by credits spent, the first calculation.
      [{ operator: 'sum', key: 'credits_spent', keyType: 'number' }, { operator: 'count' }],
      10,
    ),
    // An MCP call that runs out answers 200 with an error, so match the code, not the status.
    calc(window, [...WIDE, eq('error_code', 'ERR_LIMIT_BALANCE')], ['account']),
    calc(window, [...WIDE, gte('status', 400), has('ip')], ['ip'], [{ operator: 'count' }], 5),
    issues(),
    currentBuild(),
    // Headline counts, ungrouped, so a rare route or status is never cut by a group limit.
    Promise.all(
      [window, baseline].flatMap(t => [
        // From the invocation log, so a request Cloudflare cut off (CPU limit) still counts.
        calc(t, [SCRIPT, has('$workers.outcome')], []),
        // Failed: cut off or threw (outcome), or answered 5xx. One count per invocation.
        calc(
          t,
          [
            SCRIPT,
            has('$workers.outcome'),
            {
              kind: 'group',
              filterCombination: 'or',
              filters: [
                { key: '$workers.outcome', operation: 'neq', type: 'string', value: 'ok' },
                gte('$workers.event.response.status', 500),
              ],
            },
          ],
          [],
        ),
      ]),
    ),
  ]);

  const [requests, fivexx, baseAll, base5] = totals.map(rows => total(rows));
  const per = BASELINE || NaN;
  const baseRequests = baseAll / per;
  const baseFivexx = base5 / per;
  const rate = (n: number, d: number) => (Number.isNaN(d) ? NaN : d ? n / d : 0);
  const pct = (x: number) => (Number.isNaN(x) ? 'n/a' : `${(x * 100).toFixed(2)}%`);
  const baseByCode = new Map(baseErrors.map(r => [r.error_code, Number(r.count) / per]));

  const snapshot = {
    at: new Date(now).toISOString(),
    hours: HOURS,
    requests,
    fivexx,
    baseline: { requests: baseRequests, fivexx: baseFivexx },
    byRoute,
    errors,
    errorsByBuild,
    cache,
    latency: { all: latency[0], png: png[0], svg: svg[0], rest: rest[0], mcp: mcp[0] },
    limits,
    logins,
    hooks,
    tools,
    spenders,
    broke,
    scanners,
    issues: issueList,
  };
  const dir = path.join('tmp', 'o11y');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${snapshot.at.replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(file, JSON.stringify(snapshot, null, 2));
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(snapshot, null, 2));
    return;
  }

  // Cloudflare flags scanner probes (/.env, /wp-login.php) as Issues too; nothing to fix there.
  const scan = (i: { title: string }) => /vulnerability scan/i.test(i.title);
  // An issue with no occurrence on the newest build seen is likely fixed.
  // Unknown when the newest build or an occurrence's version is missing: then never "fixed".
  const live = (i: { versions: unknown[]; unknownVersion: boolean }) =>
    !current || i.unknownVersion || i.versions.includes(current);
  const status = (i: (typeof issueList)[number]) =>
    scan(i) ? 'scanner' : live(i) ? (i.isNew ? 'new' : 'open') : 'not on newest build';

  // Actions: new or growing failures on the newest build first, worst first, at most three.
  const actions: string[] = [];
  for (const i of issueList
    .filter(i => !scan(i) && live(i) && i.inWindow > 0)
    .sort((a, b) => Number(b.isNew) - Number(a.isNew) || b.inWindow - a.inWindow))
    actions.push(
      `${i.isNew ? 'New' : 'Open'} issue "${i.title}" (${i.inWindow}× in window): ${i.frame ?? i.mechanism ?? ''}` +
        `${i.path ? ` on ${i.path}` : ''}. Open trace ${i.traceId ?? '(none)'} in Observability → Traces, reproduce, fix, deploy, then rerun this and check the issue stops on the new build.`,
    );
  const stale = issueList.filter(i => !scan(i) && !live(i));
  if (stale.length)
    actions.push(
      `${stale.length} open issue(s) not seen on the newest build seen, ${current}: ${stale.map(i => `"${i.title.slice(0, 60)}"`).join(', ')}. Check that build is the one deployed (\`wrangler deployments list\` in packages/service). If it is and the route had traffic since, resolve them in Observability → Issues; with little traffic, wait.`,
    );
  if (rate(fivexx, requests) > 0.01 && fivexx > 3)
    actions.push(
      `5xx rate is ${pct(rate(fivexx, requests))} (${fivexx} of ${requests}); baseline ${pct(rate(baseFivexx, baseRequests))}. See errors by build below.`,
    );
  // Growth needs a baseline.
  for (const e of BASELINE ? errors : []) {
    const code = String(e.error_code);
    // Only the service's own failures; a rise in bad diagrams, bad keys or limits is the
    // callers', and shows in the tables.
    if (!/^(ERR_INTERNAL|ERR_EMAIL|HTTP_5)/.test(code)) continue;
    const was = baseByCode.get(code) ?? 0;
    if (Number(e.count) >= 3 && Number(e.count) > 2 * was)
      actions.push(
        `${code} grew to ${e.count} from ${was.toFixed(1)} a window (${e.error_name ?? e.diagnostic ?? 'no detail'}). Find its cause in the code that throws ${code}.`,
      );
  }
  const p95 = Number(latency[0]?.['p95_$workers.wallTimeMs'] ?? 0);
  if (p95 > 1000)
    actions.push(
      `p95 wall time is ${p95.toFixed(0)} ms, over the 1 s budget. Open the slowest traces and read which span is long.`,
    );

  const table = (rows: Row[], cols: string[]) =>
    rows.length
      ? [
          `| ${cols.join(' | ')} |`,
          `| ${cols.map(() => '---').join(' | ')} |`,
          ...rows.map(
            r =>
              `| ${cols
                .map(c =>
                  String(r[c] ?? '')
                    .replace(/\s*\n\s*/g, ' ')
                    .replace(/\|/g, '\\|')
                    .slice(0, 120),
                )
                .join(' | ')} |`,
          ),
        ].join('\n')
      : '_none_';
  const lat = (r?: Row) =>
    r
      ? `p50 ${fmt(r, 'median')} ms, p95 ${fmt(r, 'p95')} ms wall; CPU p50 ${fmt(r, 'median', 'cpuTimeMs')}, p95 ${fmt(r, 'p95', 'cpuTimeMs')} ms (${r.count ?? '?'} requests)`
      : '_no data_';

  console.log(`# ${SERVICE}: the last ${HOURS} h, to ${snapshot.at}

**Requests** ${requests} (baseline ${BASELINE ? baseRequests.toFixed(0) + ' a window' : 'n/a: no full earlier window in 7 days'}) · **failed** (5xx, thrown or cut off) ${fivexx}, ${pct(rate(fivexx, requests))} (baseline ${pct(rate(baseFivexx, baseRequests))}) · **open issues seen** ${issueList.length}

## Actions
${
  actions.length
    ? actions
        .slice(0, 3)
        .map((a, i) => `${i + 1}. ${a}`)
        .join('\n')
    : 'Nothing needs action.'
}

## Issues
Newest build seen: ${current ?? 'unknown'}

${table(issueList.map(i => ({ ...i, status: status(i), versions: i.versions.join(' ') })) as unknown as Row[], ['status', 'title', 'inWindow', 'total', 'frame', 'versions', 'traceId'])}

## Errors (code, diagnostic or error class)
${table(errors, ['error_code', 'diagnostic', 'error_name', 'count'])}

By build (does a fix hold?):
${table(errorsByBuild, ['error_code', 'build', 'count'])}

## Traffic by route and status
${table(byRoute, ['route', 'status', 'count'])}

## Latency
Cloudflare's measure on the invocation log; spans can't time CPU work. Only GET image URLs carry
the format in the URL, so REST and MCP are one row each.

- All requests: ${lat(latency[0])}
- GET /png/ URLs: ${lat(png[0])}
- GET /svg/ URLs: ${lat(svg[0])}
- POST /v1/render: ${lat(rest[0])}
- POST /mcp (every call, not only renders): ${lat(mcp[0])}

## Cache
${table(cache, ['format', 'cache', 'count'])}

## Usage
Top accounts:
${table(spenders, ['account', 'count', 'sum_credits_spent'])}

Out of credits (ERR_LIMIT_BALANCE: 402 over GET and REST, an error result over MCP):
${table(broke, ['account', 'count'])}

MCP tools:
${table(tools, ['mcp_tool', 'status', 'count'])}

## Limits and noise
${table(limits, ['rate_limit', 'count'])}

Most 4xx by address hash:
${table(scanners, ['ip', 'count'])}

## Sign-in and Stripe
${table(logins, ['login', 'count'])}

${table(hooks, ['webhook', 'stripe_event', 'count'])}

Snapshot: ${file}`);
}

function latencyCalcs(): Calc[] {
  return [
    { operator: 'count' },
    { operator: 'median', key: '$workers.wallTimeMs', keyType: 'number' },
    { operator: 'p95', key: '$workers.wallTimeMs', keyType: 'number' },
    { operator: 'median', key: '$workers.cpuTimeMs', keyType: 'number' },
    { operator: 'p95', key: '$workers.cpuTimeMs', keyType: 'number' },
  ];
}

function fmt(r: Row, op: string, key = 'wallTimeMs') {
  const v = r[`${op}_$workers.${key}`];
  return v == null ? '?' : Number(v).toFixed(0);
}

await main();
