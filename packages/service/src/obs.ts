/**
 * Observability: one wide log line per request, and trace spans on the steps where time goes or
 * things fail. `docs/observability.md` lists the dashboard queries that read them.
 *
 * Any code that handles a request adds fields to that request's event with `note()`. The `fetch`
 * entry in `index.ts` starts the event and logs it once, when the response is ready.
 *
 * Every field is a number, a hash, an id or a word from a fixed set. No field holds text the
 * caller sent: no diagram source, no error message (a diagnostic can quote the source), no email,
 * key secret, token or raw IP. An error is its code, and for a diagram that does not draw, the
 * runtime's diagnostic code.
 */
import { AsyncLocalStorage } from 'node:async_hooks';
import { tracing } from 'cloudflare:workers';
import { SourceError } from '../../../src/lib/render-url';
import { ApiError } from './errors';

/** The fields of one request's log line. Docs: `docs/observability.md`. */
export interface Wide {
  event: 'request';
  route:
    | 'image'
    | 'share'
    | 'rest'
    | 'mcp'
    | 'oauth'
    | 'account'
    | 'login'
    | 'webhook'
    | 'health'
    | 'other';
  method: string;
  /** Only for routes whose path holds no diagram source. */
  path?: string;
  status?: number;
  version: string;
  build: string;
  /** Short SHA-256 of the client IP: groups one address's requests, never shows it. */
  ip?: string;
  country?: string;
  payer: 'anonymous' | 'key' | 'session' | 'app';
  account?: string;
  key?: string;
  cache?: 'hit' | 'miss';
  format?: string;
  source_type?: string;
  source_bytes?: number;
  out_bytes?: number;
  scale?: number;
  scheme?: string;
  pixels?: number;
  credits_spent?: number;
  credits_left?: number;
  /** A fulfilled or repeated Stripe purchase. */
  credits_bought?: number;
  /** `login_email` is the cap on links one address may hold. */
  rate_limit?: 'anon' | 'key' | 'account' | 'login' | 'login_email';
  /** The tools called, joined with commas when one request batches several. */
  mcp_tool?: string;
  mcp_calls?: number;
  login?:
    | 'form'
    | 'bad_email'
    | 'capped'
    | 'sent'
    | 'send_failed'
    | 'link_shown'
    | 'link_dead'
    | 'signed_in';
  webhook?:
    | 'off'
    | 'bad_signature'
    | 'too_large'
    | 'ignored'
    | 'not_ours'
    | 'unmatched'
    | 'fulfilled'
    | 'duplicate';
  stripe_event?: string;
  error_code?: string;
  /** The runtime's or the Mermaid importer's code for why a diagram did not draw. */
  diagnostic?: string;
  /** For an uncaught error: its class name, such as `TypeError`. */
  error_name?: string;
}

const store = new AsyncLocalStorage<Wide>();

/** Run `fn` with `ev` as the current request's event. */
export const withEvent = <T>(ev: Wide, fn: () => T) => store.run(ev, fn);

/** The current request's event, if any. */
export const currentEvent = () => store.getStore();

/** Add fields to the current request's event. A no-op outside a request. */
export function note(fields: Partial<Wide>) {
  const ev = store.getStore();
  if (ev) Object.assign(ev, fields);
}

/** Add `n` to a counter on the current request's event. */
export function bump(field: 'credits_spent' | 'mcp_calls', n = 1) {
  const ev = store.getStore();
  if (ev) ev[field] = (ev[field] ?? 0) + n;
}

/**
 * Text that may echo what the caller sent, made safe to log: email addresses, API keys, IP
 * addresses and long token-like runs are masked, and it is cut to 300 characters. A diagnostic
 * keeps its words, so the log still says why a diagram failed.
 */
export const scrub = (text: string) =>
  // Cut first: the patterns below are slow on a long run of text with no match.
  text
    .slice(0, 400)
    // A source error quotes the diagram's line after "> " for the error image; keep it out.
    .replace(/\n> [\s\S]*/, '')
    // Credentials in a URL, before the email pattern can take their @.
    .replace(/\/\/[^/\s]*@/g, '//<secret>@')
    // A percent-encoded @ is still an address.
    .replace(/%(?:25)*40/gi, '@')
    .replace(/[^\s<>(),;:/]{1,64}@[^\s<>()"',;:/@]+(?:\.[^\s<>()"',;:/@]+)+/g, '<email>')
    .replace(/dft_[\w.-]+/g, '<key>')
    .replace(/\b(\w*(?:pass(?:word)?|secret|token|key|auth)\w*)(?:=|:(?!\s))\S+/gi, '$1=<secret>')
    .replace(/(?<!\d)\d{1,3}(?:\.\d{1,3}){3}(?!\d)/g, '<ip>')
    .replace(/(?<![0-9a-f:])[0-9a-f]{0,4}(?::[0-9a-f]{0,4}){2,7}(?![0-9a-f:])/gi, m =>
      /[0-9a-f]/i.test(m) ? '<ip>' : m,
    )
    .replace(/[\w+/=-]{24,}/g, '<token>')
    .slice(0, 300);

/** A diagnostic code as logged: a short word, never free text. */
const diagnosticCode = (code: string | undefined) =>
  code === undefined ? undefined : /^[a-z][\w.-]{0,47}$/i.test(code) ? code : 'other';

/**
 * Note an error the caller turns into an answer: its code and, for a diagram, the diagnostic's
 * code. With `keep`, an error noted earlier in the request stays.
 */
export function noteError(code: string, diagnostic?: string, keep = false) {
  if (keep && store.getStore()?.error_code) return;
  note({ error_code: code, diagnostic: diagnosticCode(diagnostic) });
}

/** The size of a body in bytes. */
export const byteSize = (body: string | Uint8Array) =>
  typeof body === 'string' ? new TextEncoder().encode(body).length : body.byteLength;

type Attrs = Record<string, string | number | boolean | undefined>;
type Span = Parameters<Parameters<typeof tracing.enterSpan>[1]>[0];

/**
 * Run `fn` in a trace span named `name`. The span ends when `fn` settles. A throw goes on to the
 * caller. An unexpected one is recorded on the span as an exception, which Workers Issues groups.
 * An expected one (a bad diagram, a refused key, a limit) is only an attribute, so a user's
 * mistake never opens an Issue.
 */
export function span<T>(name: string, attrs: Attrs, fn: (s: Span) => Promise<T> | T): Promise<T> {
  return tracing.enterSpan(name, async s => {
    s.setAttributes(attrs);
    try {
      return await fn(s);
    } catch (error) {
      const e = error instanceof Error ? error : new Error(String(error));
      if (error instanceof SourceError || error instanceof ApiError) {
        s.setAttribute('refused', error instanceof ApiError ? error.code : 'ERR_SOURCE');
        throw error;
      }
      // Only the class and the code frames: the message can quote what the caller sent, and the
      // stack's first line repeats it.
      const stack = e.stack
        ?.split('\n')
        .filter(l => /^\s+at /.test(l))
        .join('\n');
      s.recordException({ name: e.name, message: e.name, stack });
      s.setStatus({ code: 'error', message: e.name });
      throw error;
    }
  });
}

const hex = (buf: ArrayBuffer) =>
  [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');

/** The first 12 hex characters of the IP's SHA-256. */
export const ipHash = async (ip: string) =>
  hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ip))).slice(0, 12);
