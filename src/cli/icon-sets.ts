/** `draftably icons`, and the installed Iconify sets the CLI reads beyond Lucide. */
import { installedIconPrefixes, installedIconSet } from '../server/icon-sets';
import { knownSets, loadAllIconSets, searchIcons, setIconSource } from '../model/iconify';

/**
 * Read sets installed in each of `dirs` and their parents: the working folder, then the folder of
 * the file the command names. Nothing is fetched.
 */
export function useInstalledIconSets(dirs = [process.cwd()]) {
  setIconSource({
    load: prefix => {
      for (const dir of dirs) {
        const set = installedIconSet(prefix, dir);
        if (set) return set;
      }
    },
    list: () => [...new Set(dirs.flatMap(installedIconPrefixes))],
  });
}

/** `draftably icons <word>`: matching names from every installed set, one per line. */
export async function printIcons(word: string, limit: number) {
  await loadAllIconSets();
  const names = searchIcons(word, limit);
  if (!names.length) {
    console.log(
      `No icon matches "${word}" in ${knownSets().join(', ')}. Lucide names are listed at https://lucide.dev/icons. For vendor logos, install a set: pnpm add -D @iconify-json/logos (see draftably docs "more icon sets").`,
    );
    return 1;
  }
  console.log(names.join('\n'));
  return 0;
}
