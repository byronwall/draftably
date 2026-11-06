import { mkdir, writeFile } from 'node:fs/promises';
import { renderSvg } from '@draftably/runtime';
const source = `diagram "Checkout" version=1
node web "Web app"
node api "API"
node db "Orders"
edge request web -> api "request"
edge query api -> db "query"
`;
const result = await renderSvg(source, { target: 'image', fonts: 'embed' });
if (!result.ok) throw new Error('Could not render static viewer fallback.');
await mkdir(new URL('./public/', import.meta.url), { recursive: true });
await writeFile(new URL('./public/checkout.svg', import.meta.url), result.value.svg);
