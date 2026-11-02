import { createMermaidFlowParser } from './mermaid-facade.js';

/**
 * Lazy browser provider. This needs a DOM; it does not run in a bare Web Worker.
 * Bounded input helps responsiveness, but this implementation has no hard browser CPU watchdog.
 * Do not describe Promise.race as cancellation: production isolation is an integration gate.
 */
export const parseMermaidFlowBrowser = createMermaidFlowParser(async () => (await import('mermaid')).default);
