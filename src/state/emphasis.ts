// Delegates to the default session until every caller reads a session of its own.
import { defaultSession } from './default-session';

export * from './session/emphasis';
export const { states, activeState, gridOpen, setGridOpen, showState, stepState, drawnDoc } =
  defaultSession;
