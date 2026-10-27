/**
 * Compiled files kept across reloads, tabs and file switches. Laying out and routing a large file
 * takes seconds, and the same source is opened again and again. Entries are keyed by the source
 * and this build of the app (the bundle's own URL carries its content hash), so a new build never
 * reads an older one's layout. IndexedDB stores structured clones, which keep a scene's maps.
 */
const DB = 'draftably-scenes',
  KEEP = 24;

let opening: Promise<IDBDatabase | null> | null = null;
function database() {
  opening ??= new Promise(resolve => {
    // A development build's URL does not change with its code, and tests have no IndexedDB.
    if (import.meta.env.DEV || typeof indexedDB === 'undefined') return resolve(null);
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore('scenes');
      request.result.createObjectStore('used');
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });
  return opening;
}

async function keyOf(source: string) {
  const bytes = new TextEncoder().encode(`${import.meta.url}\n${source}`),
    digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}

const done = (request: IDBRequest | IDBTransaction) =>
  new Promise<void>(resolve => {
    if ('oncomplete' in request) request.oncomplete = request.onerror = () => resolve();
    else request.onsuccess = request.onerror = () => resolve();
  });

/** The compiled file stored for `source` by this build, if any. */
export async function cachedScene<T>(source: string): Promise<T | undefined> {
  try {
    const db = await database();
    if (!db) return undefined;
    // The key first: a transaction closes when the task that opened it ends.
    const key = await keyOf(source),
      request = db.transaction('scenes').objectStore('scenes').get(key);
    await done(request);
    return request.result as T | undefined;
  } catch {
    return undefined;
  }
}

/** Store the compiled file for `source`, keeping the most recently stored few. */
export async function cacheScene(source: string, value: unknown) {
  try {
    const db = await database();
    if (!db) return;
    const key = await keyOf(source),
      tx = db.transaction(['scenes', 'used'], 'readwrite'),
      used = tx.objectStore('used');
    tx.objectStore('scenes').put(value, key);
    used.put(Date.now(), key);
    const all = used.getAll(),
      keys = used.getAllKeys();
    await done(keys);
    const old = keys.result
      .map((k, i) => [k, all.result[i] as number] as const)
      .sort((a, b) => b[1] - a[1])
      .slice(KEEP);
    for (const [k] of old) {
      tx.objectStore('scenes').delete(k);
      used.delete(k);
    }
    await done(tx);
  } catch {
    // A full or blocked store only costs the next open a compile.
  }
}
