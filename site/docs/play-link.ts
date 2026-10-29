import { encodeSource } from '../../src/lib/source-hash';

/** A playground link that opens with this source, in the playground's share-hash format. */
export async function playUrl(source: string) {
  return `${import.meta.env.BASE_URL}play#${await encodeSource(source)}`;
}
