/**
 * The MCP server at `/mcp`: Streamable HTTP, stateless, one server per request. It needs no
 * Durable Object. Every call needs the same bearer key as the REST API, and `render_diagram`
 * draws through the same `render` (one cache, one price), so the two can't charge differently.
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { validate, runtimeVersion } from '@draftably/runtime';
import { z } from 'zod';
import guide from '../../../skills/draftably/SKILL.md';
import { MAX_SOURCE_BYTES, SourceError } from '../../../src/lib/render-url';
import { ApiError, checkSource, errorJson, requireKey, type ApiEnv } from './api';
import { DEFAULT_FORMAT, drawOptions } from './draw';
import { embedUrl, render, type Payer } from './render';
import { toDraft } from './mermaid';
import { note, noteError, span } from './obs';

const code = z.string().min(1).describe('Diagram source: Draftably DSL or Mermaid.');
const type = z
  .enum(['draftably', 'mermaid'])
  .optional()
  .describe('The source language. Detected when left out.');

const text = (t: string) => ({ content: [{ type: 'text' as const, text: t }] });
const failure = (t: string, code = 'ERR_SOURCE') => {
  noteError(code, t);
  return { ...text(t), isError: true };
};

/** A tool call, in its own span, with its name on the request's event. */
const tool = <R>(name: string, fn: () => Promise<R>) => {
  note({ mcp_tool: name });
  return span(`mcp.${name}`, { tool: name }, fn);
};

function base64(bytes: Uint8Array) {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000)
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

/** The tools, for one caller. */
function server(env: ApiEnv, ctx: ExecutionContext, who: Payer, origin: string) {
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
        scheme: z.enum(['light', 'dark']).optional(),
        scale: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]).optional(),
      },
    },
    async args =>
      tool('render_diagram', async () => {
        try {
          const get = (k: string) => {
            const v = (args as Record<string, unknown>)[k];
            return v === undefined ? null : String(v);
          };
          const source = checkSource(args.code);
          const opts = drawOptions(get);
          // The image content and URL are built before the credits are taken.
          const url = await embedUrl(origin, source, args.format, opts);
          const drawn = await render(
            env,
            ctx,
            origin,
            source,
            args.format,
            opts,
            async body =>
              args.format === 'png'
                ? {
                    type: 'image' as const,
                    data: base64(body as Uint8Array),
                    mimeType: 'image/png',
                  }
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
        } catch (error) {
          if (error instanceof ApiError) return failure(error.message, error.code);
          if (error instanceof SourceError) return failure(error.message);
          throw error;
        }
      }),
  );

  mcp.registerTool(
    'validate_diagram',
    {
      description:
        'Check a diagram without drawing it. Returns errors and warnings with line numbers. Free.',
      inputSchema: { code, type },
    },
    async ({ code, type }) =>
      tool('validate_diagram', async () => {
        try {
          const { draft, warnings } = await toDraft(checkSource(code), type);
          const result = await validate(draft, { limits: { maxSourceBytes: MAX_SOURCE_BYTES } });
          const lines = [
            ...warnings.map(w => `warning: ${w}`),
            ...result.diagnostics.map(
              d =>
                `${d.severity}: ${d.location?.line ? `line ${d.location.line}: ` : ''}${d.message}`,
            ),
          ];
          return text(`${result.ok ? 'valid' : 'invalid'}\n${lines.join('\n')}`.trim());
        } catch (error) {
          if (error instanceof SourceError || error instanceof ApiError) {
            noteError('ERR_SOURCE', error.message);
            return text(`invalid\nerror: ${error.message}`);
          }
          throw error;
        }
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
        try {
          const { draft, warnings } = await toDraft(checkSource(code), 'mermaid');
          return text(
            warnings.length ? `${draft}\n# Warnings:\n# ${warnings.join('\n# ')}` : draft,
          );
        } catch (error) {
          if (error instanceof SourceError || error instanceof ApiError)
            return failure(error.message);
          throw error;
        }
      }),
  );

  mcp.registerTool(
    'image_url',
    {
      description:
        'A public URL that draws the diagram, for Markdown or an <img> tag. Nothing is drawn now; the URL is free to fetch (rate-limited per address). Free.',
      inputSchema: { code, format: z.enum(['png', 'svg']).default('svg') },
    },
    async ({ code, format }) =>
      tool('image_url', async () => {
        try {
          checkSource(code);
        } catch (error) {
          if (error instanceof ApiError) return failure(error.message);
          throw error;
        }
        const url = await embedUrl(
          origin,
          code,
          format,
          drawOptions(() => null),
        );
        return url
          ? text(url)
          : failure('The source is too long for a URL. Use render_diagram instead.');
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

/** `/mcp`. Returns null for other paths. */
export async function handleMcp(req: Request, env: ApiEnv, ctx: ExecutionContext, url: URL) {
  if (url.pathname !== '/mcp') return null;
  // Stateless: no session to stream to or close, so only POST means anything.
  if (req.method !== 'POST')
    return new Response('Method not allowed', { status: 405, headers: { Allow: 'POST' } });
  let who: Payer;
  try {
    who = await requireKey(req, env, ctx);
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;
    noteError(error.code, error.message);
    return errorJson(error);
  }
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  await server(env, ctx, who, url.origin).connect(transport);
  return transport.handleRequest(req);
}
