/**
 * `/edit/{encoded}` opens an image URL's source in the Playground: change `/svg/` or `/png/` to
 * `/edit/`. The source rides in the editor link's hash, so it never reaches the site's server.
 */
import { encodeSource as editorHash } from '../../../src/lib/source-hash';
import { toDraft } from './mermaid';
import { readRequest, refusal } from './request';
import { SITE, urlSource } from './share';

const CORS = { 'Access-Control-Allow-Origin': '*' };

/** The editor link for Draftably source. */
export const editUrl = async (draft: string) => `${SITE}/play#${await editorHash(draft)}`;

/** `GET /edit/{encoded}` or `GET /edit?code=`: the image URL's source, opened in the editor. */
export async function handleEdit(
  url: URL,
  segment: string | undefined,
  limit: () => Promise<void>,
) {
  try {
    // The image route's own reading: a bad option or source size is refused as it refuses them.
    const q = url.searchParams;
    const r = readRequest({
      code: await urlSource(url, segment, 'the Playground'),
      type: q.get('type'),
      scheme: q.get('scheme'),
      scale: q.get('scale'),
      format: 'svg',
    });
    await limit();
    // A source that doesn't read still opens, so the editor shows the error next to the line.
    const draft = await toDraft(r.source, r.opts.type).then(
      d => d.draft,
      () => r.source,
    );
    return Response.redirect(await editUrl(draft), 302);
  } catch (error) {
    const e = refusal(error);
    if (!e) throw error;
    return new Response(e.message, { status: e.status, headers: CORS });
  }
}
