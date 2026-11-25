/** One error shape for every keyed route: REST, MCP and keyed image URLs. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly line?: number,
  ) {
    super(message);
  }
}

export const errorJson = (e: ApiError) =>
  Response.json(
    { error: { code: e.code, message: e.message, ...(e.line ? { line: e.line } : {}) } },
    { status: e.status, headers: { 'Access-Control-Allow-Origin': '*' } },
  );
