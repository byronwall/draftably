import { writeFile } from 'node:fs/promises';
import { renderSvg } from '@draftably/runtime';

const result = await renderSvg(
  `diagram "Checkout" version=1
node web "Web app" color=blue
node api "API" color=teal
node db "Postgres" shape=pill
edge request web -> api "HTTPS"
edge persist api -> db "Store order"
layout root flow direction=right
`,
  { description: 'The web app calls the API, which stores orders in Postgres.' },
);
if (!result.ok) throw new Error(JSON.stringify(result.diagnostics));
await writeFile('checkout.svg', result.value.svg);
console.log(`Wrote checkout.svg (${result.value.width} × ${result.value.height})`);
