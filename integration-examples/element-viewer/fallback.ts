import { mkdir, writeFile } from 'node:fs/promises';
import { renderSvg } from '@draftably/runtime';
import { source } from './diagram.ts';

const result = await renderSvg(source);
if (!result.ok) throw new Error(JSON.stringify(result.diagnostics));
await mkdir('public', { recursive: true });
await writeFile('public/checkout.svg', result.value.svg);
