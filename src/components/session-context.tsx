/** The diagram session a canvas and its panels edit, provided once per editor. */
import { createContext, useContext, type JSX } from 'solid-js';
import { defaultSession } from '../state/default-session';
import type { DiagramSession } from '../state/session';

const SessionContext = createContext<DiagramSession>();

export function DiagramSessionProvider(props: { session: DiagramSession; children: JSX.Element }) {
  // A provider's session is fixed for its subtree.
  // eslint-disable-next-line solid/reactivity
  return <SessionContext.Provider value={props.session}>{props.children}</SessionContext.Provider>;
}

export const useDiagramSession = () => useContext(SessionContext) ?? defaultSession;
