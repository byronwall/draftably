import { mkdir, writeFile } from 'node:fs/promises';
import { renderSvg } from '@draftably/runtime';
const result = await renderSvg(
  `diagram "Browser proof" version=1
node api "API"
node store "Store"
edge request api -> store "reads"
`,
  { target: 'image', fonts: 'embed' },
);
if (!result.ok) throw new Error('Could not render static browser fallback.');
await mkdir(new URL('./public/', import.meta.url), { recursive: true });
await writeFile(new URL('./public/checkout.svg', import.meta.url), result.value.svg);
