const PREFIX = 'draftably.import:';

/** Keep the imported native source before navigating away from the current diagram. */
export function keepImportedSource(source: string): string {
  const id = crypto.randomUUID();
  try {
    localStorage.setItem(PREFIX + id, source);
  } catch {
    throw Error(
      'Could not keep the imported diagram in this browser. The current diagram is unchanged.',
    );
  }
  return id;
}

export function readImportedSource(id: string): string | null {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  try {
    return localStorage.getItem(PREFIX + id);
  } catch {
    return null;
  }
}
