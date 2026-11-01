/** Where the editor keeps the browser's diagram. The site reads it too: same origin. */
export const STORAGE_KEY = 'diagram-studio-v5';

/** The title of the diagram kept in this browser, if there is one. */
export function savedTitle(): string {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}').title ?? '';
  } catch {
    return '';
  }
}
