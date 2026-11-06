/**
 * The diagram session the app shell acts on: the one the user last focused or pointed at. Menus,
 * shortcuts, commands, files and Compare address it rather than any one session.
 */
import { createSignal } from 'solid-js';
import { defaultSession } from './default-session';
import type { DiagramSession } from './session';

const [active, setActive] = createSignal<DiagramSession>(defaultSession);

export const activeSession = active;
export const setActiveSession = (session: DiagramSession) => setActive(() => session);
