/**
 * Observability: one wide log line per request, and trace spans on the steps where time goes or
 * things fail. `docs/observability.md` lists the dashboard queries that read them.
 *
 * Any code that handles a request adds fields to that request's event with `note()`. The `fetch`
 * entry in `index.ts` starts the event and logs it once, when the response is ready. The event
 * never holds an email, a key secret, a token, or a raw IP.
 */
import { AsyncLocalStorage } from 'node:async_hooks';
import { tracing } from 'cloudflare:workers';

/** The fields of one request's log line. Docs: `docs/observability.md`. */
export interface Wide {
  event: 'request';
  route: 'image' | 'rest' | 'mcp' | 'account' | 'login' | 'webhook' | 'health' | 'other';
  method: string;
  /** Only for routes whose path holds no diagram source. */
  path?: string;
  status?: number;
  ms?: number;
  version: string;
  build: string;
  /** Short SHA-256 of the client IP: groups one address's requests, never shows it. */
  ip?: string;
  country?: string;
  payer: 'anonymous' | 'key' | 'session';
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
  rate_limit?: 'anon' | 'key' | 'login' | 'login_email';
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
  error?: string;
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
  text
    .replace(/[^\s@<>"'(),;:/]+@[^\s@<>"'(),;:/]+/g, '<email>')
    .replace(/dft_[\w.-]+/g, '<key>')
    .replace(/\b\d{1,3}(?:\.\d{1,3}){3}\b/g, '<ip>')
    .replace(/\b[0-9a-f]{0,4}(?::[0-9a-f]{0,4}){2,7}\b/gi, m =>
      /[0-9a-f]{1,4}:/i.test(m) ? '<ip>' : m,
    )
    .replace(/[\w+/=-]{24,}/g, '<token>')
    .slice(0, 300);

/**
 * Note an error the caller turns into an answer: its code, and a scrubbed message. With `keep`,
 * an error noted earlier in the request stays.
 */
export function noteError(code: string, message: string, keep = false) {
  if (keep && store.getStore()?.error_code) return;
  note({ error_code: code, error: scrub(message) });
}

/** The size of a body in bytes. */
export const byteSize = (body: string | Uint8Array) =>
  typeof body === 'string' ? new TextEncoder().encode(body).length : body.byteLength;

type Attrs = Record<string, string | number | boolean | undefined>;
type Span = Parameters<Parameters<typeof tracing.enterSpan>[1]>[0];

/**
 * Run `fn` in a trace span named `name`. The span ends when `fn` settles. A throw is recorded on
 * the span, marks it as an error, and goes on to the caller.
 */
export function span<T>(name: string, attrs: Attrs, fn: (s: Span) => Promise<T> | T): Promise<T> {
  return tracing.enterSpan(name, async s => {
    s.setAttributes(attrs);
    try {
      return await fn(s);
    } catch (error) {
      const e = error instanceof Error ? error : new Error(String(error));
      const message = scrub(e.message);
      // The stack's first line repeats the message.
      const stack = e.stack?.replace(e.message, () => message);
      s.recordException({ name: e.name, message, stack });
      s.setStatus({ code: 'error', message: scrub(e.message) });
      throw error;
    }
  });
}

const hex = (buf: ArrayBuffer) =>
  [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');

/** The first 12 hex characters of the IP's SHA-256. */
export const ipHash = async (ip: string) =>
  hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ip))).slice(0, 12);
