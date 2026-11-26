/**
 * The MCP server at `/mcp`: Streamable HTTP, stateless, one server per request. It needs no
 * Durable Object. The OAuth layer (oauth.ts) lets a call in with an API key or an OAuth access
 * token, both naming an account, and `render_diagram` draws through the same `render` (one cache,
 * one price), so REST, keys and apps can't charge differently.
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { runtimeVersion } from '@draftably/runtime';
import { z } from 'zod';
import guide from '../../../skills/draftably/SKILL.md';
import { ApiError, checkDiagram, errorJson } from './api';
import { DEFAULT_FORMAT } from './draw';
import { embedUrl, render, type Payer } from './render';
import { toDraft } from './mermaid';
import { bump, currentEvent, note, noteError, span } from './obs';
import { readJson, readRequest, refusal } from './request';
import { createShare, links, shareText, type ShareEnv } from './share';

// The source is checked by readRequest, as on every route, so an empty one gets the same error.
const code = z.string().describe('Diagram source: Draftably DSL or Mermaid.');
const scheme = z.enum(['light', 'dark']).optional();
const type = z
  .enum(['draftably', 'mermaid'])
  .optional()
  .describe('The source language. Detected when left out.');

const text = (t: string) => ({ content: [{ type: 'text' as const, text: t }] });
/** A refusal as a tool error, with the code REST and image URLs give in `_meta`. */
const failure = (e: ApiError) => {
  noteError(e.code, e.diagnostic);
  return { ...text(e.message), isError: true, _meta: { 'draftably/error': e.code } };
};

/** Run a tool; a refusal becomes a tool error, anything else is thrown on. */
const tool = <R>(name: string, fn: () => Promise<R>) =>
  span(`mcp.${name}`, { tool: name }, async () => {
    try {
      return await fn();
    } catch (error) {
      const e = refusal(error);
      if (!e) throw error;
      return failure(e);
    }
  });

const TOOLS = new Set([
  'render_diagram',
  'validate_diagram',
  'convert_mermaid',
  'image_url',
  'share_diagram',
  'language_guide',
]);

interface RpcMessage {
  method?: string;
  params?: { name?: unknown };
  result?: { isError?: boolean; content?: { text?: string }[] };
  error?: { message?: string };
}

/**
 * Put each tool call and each error answer on the request's event, at the SDK's own boundary:
 * the messages it has already parsed and accepted, and the ones it sends back. A call the SDK
 * refuses for bad arguments is counted too.
 */
function watch(transport: WebStandardStreamableHTTPServerTransport) {
  const onmessage = transport.onmessage;
  transport.onmessage = (msg, extra) => {
    const m = msg as RpcMessage;
    // A notification (no id) runs nothing, so it is not a call.
    if (m.method === 'tools/call' && 'id' in msg) {
      const name = typeof m.params?.name === 'string' && TOOLS.has(m.params.name);
      const tool = name ? (m.params!.name as string) : 'unknown';
      bump('mcp_calls');
      const ev = currentEvent();
      if (ev) ev.mcp_tool = ev.mcp_tool ? `${ev.mcp_tool},${tool}` : tool;
    }
    onmessage?.(msg, extra);
  };
  const send = transport.send.bind(transport);
  transport.send = (msg, opts) => {
    const m = msg as RpcMessage;
    const failed = m.error?.message ?? (m.result?.isError && m.result.content?.[0]?.text);
    if (failed) noteError('ERR_TOOL', undefined, true);
    return send(msg, opts);
  };
}

function base64(bytes: Uint8Array) {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000)
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

/** The tools, for one caller. */
function server(req: Request, env: ShareEnv, ctx: ExecutionContext, who: Payer, origin: string) {
  const mcp = new McpServer({ name: 'draftably', version: runtimeVersion });

  mcp.registerTool(
    'render_diagram',
    {
      description:
        'Draw a diagram and return the image, plus a public URL that draws it again with no key. ' +
        'PNG comes back as an image you can see; SVG comes back as text. Costs 2 credits for PNG, 1 for SVG. ' +
        'Call language_guide first if you have not written Draftably before.',
      inputSchema: {
        code,
        type,
        format: z.enum(['png', 'svg']).default(DEFAULT_FORMAT),
        scheme,
        scale: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]).optional(),
      },
    },
    async args =>
      tool('render_diagram', async () => {
        const r = readRequest(args);
        // The image content and URL are built before the credits are taken.
        const url = await embedUrl(origin, r);
        const drawn = await render(
          env,
          ctx,
          origin,
          r,
          async body =>
            r.format === 'png'
              ? { type: 'image' as const, data: base64(body as Uint8Array), mimeType: 'image/png' }
              : { type: 'text' as const, text: body as string },
          who,
        );
        const summary = [
          url ? `URL: ${url}` : 'No URL: the source is too long for one.',
          drawn.hit
            ? 'From the cache: no credits spent.'
            : `Credits left: ${drawn.left!.grant + drawn.left!.bought}`,
        ].join('\n');
        return { content: [drawn.out, { type: 'text' as const, text: summary }] };
      }),
  );

  mcp.registerTool(
    'validate_diagram',
    {
      description:
        'Check a diagram without drawing it. Returns errors and warnings with line numbers. Free.',
      inputSchema: { code, type },
    },
    async args =>
      tool('validate_diagram', async () => {
        const checked = await checkDiagram(readRequest(args));
        const lines = checked.diagnostics.map(
          d => `${d.severity}: ${d.line ? `line ${d.line}: ` : ''}${d.message}`,
        );
        return text(`${checked.valid ? 'valid' : 'invalid'}\n${lines.join('\n')}`.trim());
      }),
  );

  mcp.registerTool(
    'convert_mermaid',
    {
      description:
        'Convert a Mermaid flowchart, sequence, gantt or timeline to Draftably source. Free.',
      inputSchema: { code },
    },
    async ({ code }) =>
      tool('convert_mermaid', async () => {
        const r = readRequest({ code, type: 'mermaid' });
        const { draft, warnings } = await toDraft(r.source, 'mermaid');
        return text(warnings.length ? `${draft}\n# Warnings:\n# ${warnings.join('\n# ')}` : draft);
      }),
  );

  mcp.registerTool(
    'image_url',
    {
      description:
        'A long public URL that holds the whole source and draws the diagram, for Markdown or an <img> tag. Nothing is stored; share_diagram gives a short link instead. The URL is free to fetch (rate-limited per address). Free.',
      inputSchema: { code, type, format: z.enum(['png', 'svg']).default('svg'), scheme },
    },
    async args =>
      tool('image_url', async () => {
        const url = await embedUrl(origin, readRequest(args));
        if (!url)
          throw new ApiError(
            400,
            'ERR_SOURCE',
            'The source is too long for a URL. Use render_diagram instead.',
          );
        return text(url);
      }),
  );

  mcp.registerTool(
    'share_diagram',
    {
      description:
        'Store the diagram and return short public links: png, svg and an edit link that opens it on draftably.dev. ' +
        'The same source always gets the same link. Use it instead of image_url for links people will read. Free.',
      inputSchema: { code, type, scheme },
    },
    async args =>
      tool('share_diagram', async () => {
        const r = readRequest({ ...args, format: 'svg' });
        const share = await createShare(req, env, r, who.account);
        return text(shareText(links(origin, share, r.opts)));
      }),
  );

  mcp.registerTool(
    'language_guide',
    {
      description:
        'The Draftably language guide: syntax, layout, styling and worked examples. Read it before writing a diagram. Free.',
      inputSchema: {},
    },
    async () => tool('language_guide', async () => text(guide)),
  );

  return mcp;
}

/** `/mcp`, for a caller the OAuth layer has already let in. */
export async function handleMcp(req: Request, env: ShareEnv, ctx: ExecutionContext, who: Payer) {
  const url = new URL(req.url);
  if (url.pathname !== '/mcp') return new Response('Not found', { status: 404 });
  // Stateless: no session to stream to or close, so only POST means anything.
  if (req.method !== 'POST')
    return new Response('Method not allowed', { status: 405, headers: { Allow: 'POST' } });
  // A guard against a runaway agent loop: per API key, or per account for an app.
  if (!(await env.KEY_LIMIT.limit({ key: who.key ?? `account:${who.account}` })).success) {
    note({ rate_limit: who.key ? 'key' : 'account' });
    const error = new ApiError(429, 'ERR_LIMIT_BURST', 'Too many calls this minute.');
    noteError(error.code);
    return errorJson(error);
  }
  // Read here with the limit every route has, so the SDK never buffers more.
  let parsedBody: unknown;
  try {
    parsedBody = await readJson(req);
  } catch (error) {
    const e = refusal(error);
    if (!e) throw error;
    noteError(e.code);
    return errorJson(e);
  }
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  await server(req, env, ctx, who, url.origin).connect(transport);
  watch(transport);
  return transport.handleRequest(req, { parsedBody });
}
