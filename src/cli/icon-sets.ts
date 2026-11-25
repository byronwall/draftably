/** `draftably icons`, and the installed Iconify sets the CLI reads beyond Lucide. */
import { installedIconPrefixes, installedIconSet } from '../server/icon-sets';
import { loadAllIconSets, searchIcons, setIconSource } from '../model/iconify';

/** Read sets installed in `cwd` and its parents. Nothing is fetched. */
export function useInstalledIconSets(cwd = process.cwd()) {
  setIconSource({
    load: prefix => installedIconSet(prefix, cwd),
    list: () => installedIconPrefixes(cwd),
  });
}

/** `draftably icons <word>`: matching names from every installed set, one per line. */
export async function printIcons(word: string, limit: number) {
  await loadAllIconSets();
  const names = searchIcons(word, limit);
  if (!names.length) {
    console.log(`No icon matches "${word}". Lucide names are listed at https://lucide.dev/icons.`);
    return 1;
  }
  console.log(names.join('\n'));
  return 0;
}
