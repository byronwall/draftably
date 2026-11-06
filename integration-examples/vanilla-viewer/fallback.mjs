import { mkdir, writeFile } from 'node:fs/promises';
import { renderSvg } from '@draftably/runtime';

const source = `diagram "Checkout" version=1
node web "Web app"
node api "API"
node db "Orders"
edge request web -> api "request"
edge query api -> db "query"
`;
const result = await renderSvg(source, { title: 'Checkout flow' });
if (!result.ok) throw new Error(JSON.stringify(result.diagnostics));
await mkdir('public', { recursive: true });
await writeFile('public/checkout.svg', result.value.svg);
