// Delegates to the default session until every caller reads a session of its own.
import { defaultSession } from './default-session';

export * from './session/canvas-text';
export const { selectedText, setSelectedText } = defaultSession;
