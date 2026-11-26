/**
 * The draftably.dev Worker: it serves the built site (`dist-site`) as static assets and sends
 * www.draftably.dev to the apex with a 301. It runs before the assets (`run_worker_first`), so a
 * www request never gets a page.
 */
interface Env {
  ASSETS: { fetch(req: Request): Promise<Response> };
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    if (url.hostname === 'www.draftably.dev') {
      url.hostname = 'draftably.dev';
      return Response.redirect(url.toString(), 301);
    }
    return env.ASSETS.fetch(req);
  },
};
