/**
 * The diagram session the app shell acts on: the one the user last focused or pointed at. Menus,
 * shortcuts, commands, files and Compare address it rather than any one session.
 */
import { createSignal } from 'solid-js';
import type { DiagramSession } from './session';

const [active, setActive] = createSignal<DiagramSession | null>(null);

export function activeSession(): DiagramSession {
  const session = active();
  if (!session) throw Error('No diagram session is active.');
  return session;
}

export const setActiveSession = (session: DiagramSession) => setActive(() => session);
