// Delegates to the default session until every caller reads a session of its own.
import { defaultSession } from './default-session';

export * from './session/routing';
export const { setRouting, applyRoutePreset, activeRoutePreset } = defaultSession;
