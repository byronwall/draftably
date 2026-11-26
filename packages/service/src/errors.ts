import { SourceError } from '../../../src/lib/render-url';

/**
 * One error shape for every route: REST, MCP, short links and keyed image URLs. `diagnostic` is
 * the runtime's code for a diagram that does not draw (`unknown-word`), safe to log where the
 * message is not: a message can quote the caller's source.
 */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly line?: number,
    readonly diagnostic?: string,
  ) {
    super(message);
  }
}

/** A source the renderer or the Mermaid importer refused, with the diagnostic's code. */
export class DiagramError extends SourceError {
  constructor(
    message: string,
    readonly diagnostic: string,
  ) {
    super(message);
  }
}

export const errorJson = (e: ApiError) =>
  Response.json(
    { error: { code: e.code, message: e.message, ...(e.line ? { line: e.line } : {}) } },
    { status: e.status, headers: { 'Access-Control-Allow-Origin': '*' } },
  );
