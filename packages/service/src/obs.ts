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
  rate_limit?: 'anon' | 'key' | 'login';
  mcp_tool?: string;
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

/** Add fields to the current request's event. A no-op outside a request. */
export function note(fields: Partial<Wide>) {
  const ev = store.getStore();
  if (ev) Object.assign(ev, fields);
}

/** Note an error the caller turns into an answer: its code, and a short message. */
export function noteError(code: string, message: string) {
  note({ error_code: code, error: message.slice(0, 300) });
}

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
      s.recordException({ name: e.name, message: e.message, stack: e.stack });
      s.setStatus({ code: 'error', message: e.message.slice(0, 300) });
      throw error;
    }
  });
}

const hex = (buf: ArrayBuffer) =>
  [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');

/** The first 12 hex characters of the IP's SHA-256. */
export const ipHash = async (ip: string) =>
  hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ip))).slice(0, 12);
