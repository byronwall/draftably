/**
 * The draftably.dev Worker: it serves the built site (`dist-site`) as static assets and sends
 * www.draftably.dev to the apex with a 301. It runs before the assets (`run_worker_first`), so a
 * www request never gets a page.
 *
 * The render service (`packages/service`, the draftably-api Worker) shares this domain. Its paths
 * go to it through the `API` service binding with the request unchanged, so it sees draftably.dev
 * as its origin: `/api/*` (images, short links, REST), `/mcp`, the OAuth paths and the account
 * pages.
 *
 * `/d/{id}` is a short share link from the render service: it reads the source from the API and
 * opens it in the playground, with the source in the hash like any shared playground link.
 */
import { encodeSource } from '../src/lib/source-hash';

interface Env {
  ASSETS: { fetch(req: Request): Promise<Response> };
  API: { fetch(req: Request): Promise<Response> };
}

/** The render service's paths on this domain. */
const API_PATH =
  /^\/(api(\/|$)|mcp$|authorize$|oauth\/|\.well-known\/oauth-|login$|logout$|auth\/|account(\/|$))/;

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    if (url.hostname === 'www.draftably.dev') {
      url.hostname = 'draftably.dev';
      return Response.redirect(url.toString(), 301);
    }
    if (API_PATH.test(url.pathname)) return env.API.fetch(req);
    const share = /^\/d\/([a-z2-7]{12})\/?$/.exec(url.pathname);
    if (share) {
      // An unknown id gets the site's 404; an API that is down gets a 502, not "no such diagram".
      const source = await env.API.fetch(new Request(`${url.origin}/api/d/${share[1]}.draft`))
        .then(res => (res.ok ? res.text() : res.status === 404 ? null : Promise.reject()))
        .catch(() => undefined);
      if (source === undefined)
        return new Response('The diagram service did not answer. Try again soon.', { status: 502 });
      if (source !== null)
        return Response.redirect(`${url.origin}/play#${await encodeSource(source)}`, 302);
    }
    return env.ASSETS.fetch(req);
  },
};
