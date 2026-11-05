import type { DraftViewerInitV1 } from './core.js';

export const MAX_INIT_BYTES = 1_000_000;
export const MAX_SOURCE_BYTES = 1_000_000;

function hasControls(value: string): boolean {
  for (const character of value) {
    const code = character.charCodeAt(0);
    if (code < 0x20 || code === 0x7f) return true;
  }
  return false;
}

export function sameOriginInitUrl(value: string, origin: string, baseUrl: string): URL {
  if (!value || hasControls(value)) throw new Error('Invalid initialization URL.');
  const url = new URL(value, baseUrl);
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.origin !== origin ||
    url.username ||
    url.password
  )
    throw new Error('Initialization URL must be same-origin.');
  return url;
}

export function parseInitJson(
  text: string,
  expectedKey: string,
  expectedPolicy: string,
): DraftViewerInitV1 {
  const bytes = new TextEncoder().encode(text).byteLength;
  if (bytes > MAX_INIT_BYTES) throw new Error('Initialization data exceeds the size limit.');
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error('Initialization data is not valid JSON.');
  }
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Initialization data has an invalid shape.');
  const data = value as Record<string, unknown>;
  const keys = Object.keys(data).sort();
  if (keys.join(',') !== 'key,label,policyId,source,state,version')
    throw new Error('Initialization data has unknown or missing fields.');
  if (data.version !== 1 || data.key !== expectedKey || !/^draft-[0-9a-f]{24}$/.test(expectedKey))
    throw new Error('Initialization identity is invalid.');
  if (data.policyId !== expectedPolicy || typeof data.policyId !== 'string')
    throw new Error('Initialization policy does not match.');
  if (
    typeof data.source !== 'string' ||
    new TextEncoder().encode(data.source).byteLength > MAX_SOURCE_BYTES
  )
    throw new Error('Diagram source is invalid or too large.');
  if (typeof data.label !== 'string' || data.label.length > 2_000)
    throw new Error('Diagram label is invalid.');
  if (data.state !== null && typeof data.state !== 'string')
    throw new Error('Diagram state is invalid.');
  return data as unknown as DraftViewerInitV1;
}
