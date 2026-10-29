import { draw, paperOf } from '../draw';

export interface Thumbnail {
  url: string;
  paper?: string;
}

const cache = new Map<string, Promise<Thumbnail | null>>();
let queue: Promise<unknown> = Promise.resolve();

/**
 * A drawing of `source` as an image URL, made once per key. Drawings run one at a time, so a page
 * full of thumbnails never holds up the drawing the user is looking at.
 */
export function thumbnail(key: string, source: string): Promise<Thumbnail | null> {
  let hit = cache.get(key);
  if (!hit) {
    hit = queue.then(async () => {
      const { svg } = await draw(source);
      if (!svg) return null;
      return {
        url: URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' })),
        paper: paperOf(svg),
      };
    });
    queue = hit;
    cache.set(key, hit);
  }
  return hit;
}
