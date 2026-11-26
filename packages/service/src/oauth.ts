/**
 * OAuth 2.1 for `/mcp`, so ChatGPT and claude.ai connectors can sign in. The library
 * (@cloudflare/workers-oauth-provider) owns the metadata, client registration (DCR and CIMD), the
 * token endpoint, PKCE, refresh and revocation, and keeps grants and tokens in KV. This file owns
 * `/authorize`: the emailed sign-in link, then a consent page. An app's token names the same
 * account an API key does, and API keys keep working on `/mcp` as external tokens.
 */
import {
  AuthorizationError,
  CimdFetchError,
  type OAuthHelpers,
  type OAuthProviderOptions,
} from '@cloudflare/workers-oauth-provider';
import { checkKey, sessionAccount, touchKey, type AuthEnv } from './auth';
import { esc, page } from './html';
import { handleMcp } from './mcp';
import type { ApiEnv } from './api';
import type { Payer } from './render';

export interface OAuthEnv {
  OAUTH_KV: KVNamespace;
  /** Set by the provider on requests it hands to the default handler. */
  OAUTH_PROVIDER: OAuthHelpers;
}

/** The one thing an app may do: draw, spending the account's credits. */
const SCOPE = 'draw';
const DAY = 86400;

/** What a grant keeps for the account page. */
export interface GrantMeta {
  client: string;
  domain?: string;
}

/** The provider's options for one origin: `/mcp` there is the resource its tokens are for. */
export function oauthOptions<E extends ApiEnv & OAuthEnv>(
  origin: string,
  app: ExportedHandler<E>,
): OAuthProviderOptions<E> {
  const resource = `${origin}/mcp`;
  return {
    apiRoute: '/mcp',
    apiHandler: {
      fetch: (req, env, ctx) => {
        const who = (ctx as ExecutionContext & { props: Payer }).props;
        if (who.key) ctx.waitUntil(touchKey(env.DB, who.key));
        return handleMcp(req, env, ctx, who);
      },
    },
    defaultHandler: app,
    authorizeEndpoint: '/authorize',
    tokenEndpoint: '/oauth/token',
    clientRegistrationEndpoint: '/oauth/register',
    // ChatGPT names itself with a Client ID Metadata Document; others register.
    clientIdMetadataDocumentEnabled: true,
    scopesSupported: [SCOPE],
    requiredScopes: [SCOPE],
    resourceMetadata: { resource, resource_name: 'Draftably' },
    // A connected app stays signed in while it is used at least once a month.
    refreshTokenTTL: 30 * DAY,
    refreshTokenIdleTTL: 30 * DAY,
    // An API key (`dft_…`) is a bearer token too, for clients that send a header.
    resolveExternalToken: async ({ token, env }) => {
      const who = await checkKey(env.DB, token);
      return who ? { props: who satisfies Payer, audience: resource } : null;
    },
  };
}

/** Where a sign-in link may send the browser afterwards: only back into an authorization. */
export const authorizeNext = (next: unknown) =>
  typeof next === 'string' && next.startsWith('/authorize?') && next.length <= 4096 ? next : null;

const problem = (title: string, message: string, status = 400) =>
  page(
    title,
    `<div class="col narrow"><h1>${esc(title)}</h1><p class="lead">${esc(message)}</p></div>`,
    { status, current: 'account' },
  );

/** Copy the library's headers (its binding cookie, no-framing) onto our page or redirect. */
function withHeaders(res: Response, from: Headers) {
  from.forEach((v, k) => k.toLowerCase() !== 'set-cookie' && res.headers.set(k, v));
  for (const c of from.getSetCookie()) res.headers.append('Set-Cookie', c);
  return res;
}

const redirect = (to: string, headers = new Headers()) =>
  withHeaders(new Response(null, { status: 302, headers: { Location: to } }), headers);

function consentPage(
  d: Awaited<ReturnType<OAuthHelpers['describeConsent']>>,
  handle: string,
  email: string,
) {
  const name = esc(d.clientName);
  return page(
    `Connect ${d.clientName}`,
    `<div class="col narrow"><h1>Connect ${name}</h1>
<p class="lead">Allow <b>${name}</b> to use your Draftably account? It can render diagrams, spending your credits.</p>
<dl class="facts"><dt>Account</dt><dd>${esc(email)}</dd>
<dt>Sends access to</dt><dd><b>${esc(d.redirectHost)}</b></dd>
<dt>App</dt><dd>${d.clientDomain ? `Published by <b>${esc(d.clientDomain)}</b>` : 'The app named itself; Draftably did not check the name.'}</dd></dl>
${d.redirectIsLoopback ? '<p class="note error"><b>This sends access to an app on your computer.</b> Allow it only if you just started connecting from that app.</p>' : ''}
<form method="post" action="/authorize" class="actions"><input type="hidden" name="handle" value="${esc(handle)}">
<button class="button primary" name="decision" value="allow">Allow</button><button class="button" name="decision" value="deny">Deny</button></form>
<p class="hint" style="margin-top:20px">Disconnect it at any time on your <a href="/account">account page</a>.</p></div>`,
    { current: 'account' },
  );
}

function signInPage(client: string, next: string) {
  return page(
    'Sign in',
    `<div class="col narrow"><h1>Sign in to connect ${esc(client)}</h1>
<p class="lead">We email you a link. Open it in this browser to sign in, then allow ${esc(client)} to use your account. A new address gets a new account with 1,000 free credits a month.</p>
<form method="post" action="/login" class="row form"><input type="hidden" name="next" value="${esc(next)}"><input class="input" type="email" name="email" autofocus required maxlength="254" placeholder="you@example.com" autocomplete="email" aria-label="Email"><button class="button primary">Email me a link</button></form></div>`,
    { current: 'account' },
  );
}

/** An error the library found in the request: back to the app when that is safe, else a page. */
function authError(error: unknown) {
  if (error instanceof AuthorizationError && error.redirectTo) return redirect(error.redirectTo);
  if (error instanceof AuthorizationError)
    return problem('Cannot connect', `${error.description} Start again from the app.`);
  if (error instanceof CimdFetchError)
    return problem('Cannot connect', 'Draftably could not check this app. Try again later.', 502);
  throw error;
}

/** `/authorize`. Null for other paths. */
export async function handleAuthorize(req: Request, env: AuthEnv & OAuthEnv, url: URL) {
  if (url.pathname !== '/authorize') return null;
  const oauth = env.OAUTH_PROVIDER;
  if (req.method === 'GET') {
    try {
      const request = await oauth.parseAuthRequest(req);
      const details = await oauth.describeConsent(request);
      const account = await sessionAccount(req, env.DB);
      if (!account) return signInPage(details.clientName, url.pathname + url.search);
      const consent = await oauth.beginConsent(request);
      return withHeaders(consentPage(details, consent.handle, account.email), consent.headers);
    } catch (error) {
      return authError(error);
    }
  }
  if (req.method !== 'POST')
    return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET, POST' } });
  if (req.headers.get('Origin') !== url.origin)
    return new Response('This form must be sent from this site.', { status: 403 });
  const account = await sessionAccount(req, env.DB);
  if (!account) return problem('Signed out', 'Your session ended. Start again from the app.');
  const form = await req.formData();
  const handle = String(form.get('handle') ?? '');
  try {
    if (form.get('decision') !== 'allow') {
      const denied = await oauth.denyConsent(req, handle);
      return redirect(denied.redirectTo, denied.headers);
    }
    const approved = await oauth.approveConsent(req, handle, { scope: [SCOPE] });
    const client = await oauth.lookupClient(approved.request.clientId);
    const meta: GrantMeta = { client: client?.clientName || approved.request.clientId };
    if (/^https:\/\/[^/]+\/./.test(approved.request.clientId))
      meta.domain = new URL(approved.request.clientId).hostname;
    const { redirectTo } = await oauth.completeAuthorization({
      request: approved.request,
      userId: account.id,
      metadata: meta,
      scope: [SCOPE],
      props: { account: account.id } satisfies Payer,
    });
    return redirect(redirectTo, approved.headers);
  } catch (error) {
    if (error instanceof AuthorizationError && !error.redirectTo)
      return problem(
        'This page expired',
        'It was used already, opened in another browser, or left too long. Start again from the app.',
      );
    return authError(error);
  }
}
