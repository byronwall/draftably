export interface FenceOptions {
  id?: string;
  alt?: string;
  caption?: string;
  src?: string;
  mode?: string;
  state?: string;
}

function isControl(character: string): boolean {
  const code = character.charCodeAt(0);
  return code < 0x20 || code === 0x7f;
}

export function parseFenceOptions(info: string): FenceOptions {
  const match = /^draft(?:\s+\{([\s\S]*)\})?$/.exec(info.trim());
  if (!match)
    throw new Error('Expected the canonical draft fence, optionally followed by {key="value"}.');
  const body = match[1];
  if (body === undefined) return {};
  const result: Record<string, string> = {};
  let i = 0;
  const ws = () => {
    while (/\s/.test(body[i] ?? '') && i < body.length) i++;
  };
  while (i < body.length) {
    ws();
    if (i === body.length) break;
    const key = /^[A-Za-z][A-Za-z0-9_-]*/.exec(body.slice(i))?.[0];
    if (!key) throw new Error(`Invalid metadata near "${body.slice(i)}".`);
    i += key.length;
    ws();
    if (body[i++] !== '=') throw new Error(`Expected '=' after ${key}.`);
    ws();
    if (body[i++] !== '"') throw new Error(`${key} must use a quoted value.`);
    let value = '';
    let closed = false;
    while (i < body.length) {
      const ch = body[i++];
      if (ch === '"') {
        closed = true;
        break;
      }
      if (ch === '\\') {
        const next = body[i++];
        if (next !== '"' && next !== '\\') throw new Error(`Invalid escape in ${key}.`);
        value += next;
      } else {
        if (isControl(ch)) throw new Error(`${key} cannot contain control characters.`);
        value += ch;
      }
    }
    if (!closed) throw new Error(`Unclosed value for ${key}.`);
    if (!['id', 'alt', 'caption', 'src', 'mode', 'state'].includes(key))
      throw new Error(`Unknown draft option "${key}".`);
    if (Object.hasOwn(result, key)) throw new Error(`Duplicate draft option "${key}".`);
    result[key] = value;
    ws();
  }
  if (result.id !== undefined && !/^[A-Za-z0-9_-]+$/.test(result.id))
    throw new Error('id must be a non-empty ASCII token.');
  if (result.mode !== undefined && result.mode !== 'static' && result.mode !== 'interactive')
    throw new Error('mode must be "static" or "interactive".');
  if (
    result.src !== undefined &&
    (!result.src.endsWith('.draft') ||
      result.src.trim() !== result.src ||
      result.src.includes('\0') ||
      result.src.startsWith('/') ||
      result.src.startsWith('\\') ||
      /^[A-Za-z][A-Za-z\d+.-]*:/.test(result.src) ||
      /^[A-Za-z]:/.test(result.src))
  ) {
    throw new Error('src must name a relative local .draft file.');
  }
  return result as FenceOptions;
}
