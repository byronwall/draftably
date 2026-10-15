/**
 * The lower-case key for a shortcut. With Alt (Option on a Mac) the typed character changes,
 * e.g. Option+L types "¬", so letter and digit shortcuts use the physical key instead.
 */
export function shortcutKey(e: KeyboardEvent) {
  if (e.altKey && /^(Key[A-Z]|Digit\d)$/.test(e.code)) return e.code.slice(-1).toLowerCase();
  return e.key.toLowerCase();
}
