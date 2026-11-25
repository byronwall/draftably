/**
 * Paid credits through Stripe Checkout, with plain fetch calls (no SDK). Stripe is the record of
 * payments; D1 stays the record of balances. The webhook adds a pack's credits once per Checkout
 * session, however often Stripe sends it.
 */
export interface StripeEnv {
  DB: D1Database;
  /** Empty until paid credits are switched on; the account page then offers no packs. */
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
}

/** Credit packs. Prices are placeholders until Byron sets them. */
export const PACKS = [
  { id: 'small', credits: 25_000, cents: 500 },
  { id: 'large', credits: 150_000, cents: 2500 },
] as const;

/** A Checkout session for `pack`; returns the URL to send the buyer to. */
export async function checkoutUrl(env: StripeEnv, account: string, packId: string, origin: string) {
  const pack = PACKS.find(p => p.id === packId);
  if (!pack || !env.STRIPE_SECRET_KEY) return null;
  const form = new URLSearchParams({
    mode: 'payment',
    success_url: `${origin}/account?bought=1`,
    cancel_url: `${origin}/account`,
    client_reference_id: account,
    'line_items[0][quantity]': '1',
    'line_items[0][price_data][currency]': 'usd',
    'line_items[0][price_data][unit_amount]': String(pack.cents),
    'line_items[0][price_data][product_data][name]': `${pack.credits.toLocaleString('en-US')} Draftably credits`,
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
      metadata?: { account?: string; credits?: string };
    };
  };
}

/** `POST /stripe/webhook`: add a paid pack's credits once. */
export async function handleWebhook(req: Request, env: StripeEnv) {
  if (!env.STRIPE_WEBHOOK_SECRET) return new Response('Paid credits are off.', { status: 404 });
  const body = await req.text();
  if (
    !(await verifySignature(body, req.headers.get('Stripe-Signature'), env.STRIPE_WEBHOOK_SECRET))
  )
    return new Response('Bad signature.', { status: 400 });
  const event = JSON.parse(body) as CheckoutEvent;
  const s = event.data.object;
  if (event.type !== 'checkout.session.completed' || s.payment_status !== 'paid')
    return new Response('Ignored.');
  const account = s.metadata?.account,
    credits = Number(s.metadata?.credits);
  if (!account || !Number.isInteger(credits) || credits <= 0)
    return new Response('No account or credits on the session.', { status: 400 });
  // The unique index on purchase refs makes a repeated event insert nothing, and then the
  // balance update sees changes() = 0 and skips too.
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO ledger (account_id, delta, reason, ref, created_at) VALUES (?1, ?2, 'purchase', ?3, ?4)
       ON CONFLICT DO NOTHING`,
    ).bind(account, credits, s.id, new Date().toISOString()),
    env.DB.prepare(`UPDATE accounts SET bought = bought + ?1 WHERE id = ?2 AND changes() = 1`).bind(
      credits,
      account,
    ),
  ]);
  return new Response('OK');
}
