/** The diagram session a canvas and its panels edit, provided once per editor. */
import { createContext, useContext, type JSX } from 'solid-js';
import type { DiagramSession } from '../state/session';

const SessionContext = createContext<DiagramSession>();

export function DiagramSessionProvider(props: { session: DiagramSession; children: JSX.Element }) {
  // A provider's session is fixed for its subtree.
  // eslint-disable-next-line solid/reactivity
  return <SessionContext.Provider value={props.session}>{props.children}</SessionContext.Provider>;
}

/** The session drawn here, or undefined where scene views draw without one (Compare, tests). */
export const useSessionIfAny = () => useContext(SessionContext);

export function useDiagramSession(): DiagramSession {
  const session = useContext(SessionContext);
  if (!session) throw Error('useDiagramSession needs a DiagramSessionProvider.');
  return session;
}
