import { createResource, For, Show } from 'solid-js';
import { encodeSource } from '../../src/lib/render-url';
import { appUrl } from '../draw';
import { CopyCommand } from './CopyCommand';
import { A } from '@solidjs/router';

export const API = 'https://api.draftably.dev';
export const MCP_ADD = `claude mcp add --transport http draftably ${API}/mcp --header "Authorization: Bearer dft_..."`;

const SAMPLE = `node web "Web app"
node api "API"
node db "Postgres"
node cache "Cache"
edge call web -> api "HTTPS"
edge store api -> db
edge hit api -> cache`;

const MCP_JSON = `{
  "mcpServers": {
    "draftably": {
      "type": "http",
      "url": "${API}/mcp",
      "headers": { "Authorization": "Bearer dft_..." }
    }
  }
}`;

const REST = `curl ${API}/v1/render -H "Authorization: Bearer dft_..." -d '{"code": "node a\\nnode b\\nedge e a -> b", "format": "svg"}'`;

const TOOLS: [string, string][] = [
  ['render_diagram', 'Draws it: an SVG for 1 credit, or a PNG the agent can see for 2.'],
  ['validate_diagram', 'Errors and warnings by line. Free.'],
  ['convert_mermaid', 'Mermaid to Draftably source. Free.'],
  ['image_url', 'An image URL for Markdown or an <img> tag. Free.'],
  ['language_guide', 'The language guide, read before the first diagram. Free.'],
];

const TIERS: [string, string, string][] = [
  ['Image URL, no key', '60 new drawings a minute per address', 'Free'],
  ['Free account', '1,000 credits a month', 'Free'],
  ['Small pack', '25,000 credits, on sale soon', '$5'],
  ['Large pack', '150,000 credits, on sale soon', '$25'],
];

/** The hosted render service: image URLs, MCP and the REST API, and what they cost. */
export function Hosted() {
  // The sample's real URL; the image below it is the live service drawing that URL.
  const [url] = createResource(async () => `${API}/svg/${await encodeSource(SAMPLE)}`);
  return (
    <section class="hosted" id="api">
      <div class="section-head">
        <h2>Or let our server draw it</h2>
        <A href="/docs/hosted-render-urls">Read the API docs</A>
      </div>
      <p class="hosted-lead">
        <code>api.draftably.dev</code> draws the same files from a URL, a REST call or your agent.
        It keeps the images it draws in a cache and stores a hash of each API key, not the key.
      </p>
      <div class="hosted-cols">
        <div>
          <h3>Render anywhere</h3>
          <p class="hosted-tag">Free, no key, rate-limited</p>
          <p>
            The URL holds the source and returns an SVG or PNG. Put it in a README, an{' '}
            <code>&lt;img&gt;</code> tag or an agent's reply. Make one with{' '}
            <code>draftably url plan.draft</code>.
          </p>
          <pre class="hosted-code hosted-url">
            <code>{url() ?? `${API}/svg/…`}</code>
          </pre>
          <div class="hosted-shot">
            <Show when={url()}>
              <img
                src={url()}
                loading="lazy"
                alt="The sample URL's drawing: a web app calls an API, which uses Postgres and a cache"
              />
            </Show>
          </div>
        </div>
        <div>
          <h3>Use it from your agent</h3>
          <p>A remote MCP server, with your API key. Nothing to install. In Claude Code:</p>
          <CopyCommand text={MCP_ADD} />
          <p>Other clients take this JSON:</p>
          <pre class="hosted-code">
            <code>{MCP_JSON}</code>
          </pre>
          <dl class="commands hosted-tools">
            <For each={TOOLS}>
              {([tool, what]) => (
                <>
                  <dt>
                    <code>{tool}</code>
                  </dt>
                  <dd>{what}</dd>
                </>
              )}
            </For>
          </dl>
          <p>
            Or call the REST API, with <code>/v1/validate</code> and <code>/v1/convert</code> beside
            it:
          </p>
          <pre class="hosted-code">
            <code>{REST}</code>
          </pre>
        </div>
      </div>
      <div class="hosted-cols" id="pricing">
        <div>
          <h3>Pricing</h3>
          <table class="switch-table hosted-prices">
            <thead>
              <tr>
                <th scope="col">Plan</th>
                <th scope="col">You get</th>
                <th scope="col">Price</th>
              </tr>
            </thead>
            <tbody>
              <For each={TIERS}>
                {([plan, what, price]) => (
                  <tr>
                    <th scope="row">{plan}</th>
                    <td>{what}</td>
                    <td>{price}</td>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
          <p class="hosted-note">
            An SVG costs 1 credit and a PNG 2. Cache hits, validate and convert are free. Bought
            credits never expire, and the monthly credits are spent first.
          </p>
        </div>
        <div>
          <h3>Open source stays free</h3>
          <p>
            The CLI, the npm packages and the editor run on your machine at no cost, with no
            account. The server is for when you want an image without running anything.
          </p>
          <p>Sign in with your email to make a key and get 1,000 credits a month.</p>
          <div class="hosted-actions">
            <a class="button primary" href={`${API}/account`}>
              Get an API key
            </a>
            <a class="button" href={appUrl()} rel="external">
              Open the editor
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
