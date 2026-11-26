/**
 * Paid credits through Stripe Checkout, with plain fetch calls (no SDK). Stripe is the record of
 * payments; D1 stays the record of balances. The webhook adds a pack's credits once per Checkout
 * session, however often Stripe sends it.
 */
import { note, span } from './obs';

export interface StripeEnv {
  DB: D1Database;
  /** Empty until paid credits are switched on; the account page then offers no packs. */
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
}

/** Paid credits are on only with both secrets: a sale the webhook can't fulfil is never offered. */
export const paidCreditsOn = (env: StripeEnv) =>
  !!(env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET);

/** Marks a Checkout session as a Draftably credit pack; other sessions on the account are ignored. */
const PRODUCT = 'draftably-credits';

/** Credit packs. Prices are placeholders until Byron sets them. */
export const PACKS = [
  { id: 'small', credits: 25_000, cents: 500 },
  { id: 'large', credits: 150_000, cents: 2500 },
] as const;

/** A Checkout session for `pack`; returns the URL to send the buyer to. */
export async function checkoutUrl(env: StripeEnv, account: string, packId: string, origin: string) {
  const pack = PACKS.find(p => p.id === packId);
  if (!pack || !paidCreditsOn(env)) return null;
  const form = new URLSearchParams({
    mode: 'payment',
    success_url: `${origin}/account?bought=1`,
    cancel_url: `${origin}/account`,
    client_reference_id: account,
    'line_items[0][quantity]': '1',
    'line_items[0][price_data][currency]': 'usd',
    'line_items[0][price_data][unit_amount]': String(pack.cents),
    'line_items[0][price_data][product_data][name]': `${pack.credits.toLocaleString('en-US')} Draftably credits`,
    'metadata[product]': PRODUCT,
    'metadata[account]': account,
    'metadata[credits]': String(pack.credits),
  });
  const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` },
    body: form,
  });
  const session = await res.json<{ url?: string; error?: { message: string } }>();
  if (!session.url)
    throw Error(`Stripe refused the checkout: ${session.error?.message ?? res.status}`);
  return session.url;
}

const hex = (buf: ArrayBuffer) =>
  [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');

/** Stripe's signature check: HMAC-SHA256 of `${t}.${body}`, and a timestamp within 5 minutes. */
export async function verifySignature(
  body: string,
  header: string | null,
  secret: string,
  now = Date.now(),
) {
  if (!header) return false;
  const parts = Object.fromEntries(header.split(',').map(p => p.split('=') as [string, string]));
  const sigs = header
    .split(',')
    .filter(p => p.startsWith('v1='))
    .map(p => p.slice(3));
  const t = Number(parts.t);
  if (!t || Math.abs(now / 1000 - t) > 300 || !sigs.length) return false;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const want = hex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${t}.${body}`)));
  return sigs.some(
    s =>
      // Compare every character, so the time taken says nothing about where they differ.
      s.length === want.length &&
      [...s].reduce((d, c, i) => d | (c.charCodeAt(0) ^ want.charCodeAt(i)), 0) === 0,
  );
}

interface CheckoutEvent {
  type: string;
  data: {
    object: {
      id: string;
      payment_status?: string;
      metadata?: { product?: string; account?: string; credits?: string };
    };
  };
}

/** `POST /stripe/webhook`: add a paid pack's credits once. */
/** The body as text, or null past `max` bytes. */
async function readLimited(req: Request, max: number) {
  const reader = req.body?.getReader();
  if (!reader) return '';
  const parts: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > max) {
      await reader.cancel();
      return null;
    }
    parts.push(value);
  }
  const bytes = new Uint8Array(size);
  let at = 0;
  for (const p of parts) {
    bytes.set(p, at);
    at += p.length;
  }
  return new TextDecoder().decode(bytes);
}

export async function handleWebhook(req: Request, env: StripeEnv) {
  const secret = env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    note({ webhook: 'off' });
    return new Response('Paid credits are off.', { status: 404 });
  }
  // Nothing is read until the request looks signed, and then at most 256 KB: the endpoint is
  // public, and a Stripe event is a few KB.
  const badSignature = () => {
    note({ webhook: 'bad_signature' });
    return new Response('Bad signature.', { status: 400 });
  };
  if (!/(?:^|,)t=\d+/.test(req.headers.get('Stripe-Signature') ?? '')) return badSignature();
  const body = await readLimited(req, 256 * 1024);
  if (body === null) {
    note({ webhook: 'too_large' });
    return new Response('Too large.', { status: 413 });
  }
  const signed = await span('stripe.signature', { body_bytes: body.length }, async s => {
    const ok = await verifySignature(body, req.headers.get('Stripe-Signature'), secret);
    s.setAttribute('valid', ok);
    return ok;
  });
  if (!signed) return badSignature();
  const event = JSON.parse(body) as CheckoutEvent;
  note({ stripe_event: event.type });
  const s = event.data.object;
  // A card pays at once (completed, paid); a delayed method such as a bank debit completes unpaid
  // and pays later (async_payment_succeeded). Either way the session ID keeps it to one credit.
  const paidEvents = ['checkout.session.completed', 'checkout.session.async_payment_succeeded'];
  if (!paidEvents.includes(event.type) || s.payment_status !== 'paid') {
    note({ webhook: 'ignored' });
    return new Response('Ignored.');
  }
  const account = s.metadata?.account,
    credits = Number(s.metadata?.credits);
  // A failed delivery is retried for days, so anything that isn't ours, or can't be credited,
  // is acknowledged. A marked purchase for an unknown account is logged with its session ID so it
  // can be matched by hand.
  if (s.metadata?.product !== PRODUCT) {
    note({ webhook: 'not_ours' });
    return new Response('Not a Draftably purchase.');
  }
  const known =
    account && (await env.DB.prepare(`SELECT 1 FROM accounts WHERE id = ?1`).bind(account).first());
  if (!known || !Number.isInteger(credits) || credits <= 0) {
    note({ webhook: 'unmatched' });
    console.error(
      JSON.stringify({
        unmatchedPurchase: s.id,
        account: account ?? null,
        credits: s.metadata?.credits,
      }),
    );
    return new Response('Logged for reconciliation.');
  }
  // The unique index on purchase refs makes a repeated event insert nothing, and then the
  // balance update sees changes() = 0 and skips too.
  const [added] = await span('stripe.fulfil', { credits }, () =>
    env.DB.batch([
      env.DB.prepare(
        `INSERT INTO ledger (account_id, delta, reason, ref, created_at) VALUES (?1, ?2, 'purchase', ?3, ?4)
       ON CONFLICT DO NOTHING`,
      ).bind(account, credits, s.id, new Date().toISOString()),
      env.DB.prepare(
        `UPDATE accounts SET bought = bought + ?1 WHERE id = ?2 AND changes() = 1`,
      ).bind(credits, account),
    ]),
  );
  note({
    webhook: added.meta.changes ? 'fulfilled' : 'duplicate',
    account,
    credits_bought: credits,
  });
  return new Response('OK');
}
