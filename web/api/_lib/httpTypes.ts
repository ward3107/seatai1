/**
 * Minimal request/response surface used by the Vercel functions.
 *
 * Keeping these local avoids the large `@vercel/node` build-tool dependency
 * when SeatAI only needs five type-only imports. Vercel still supplies the
 * runtime objects; these interfaces document only the fields SeatAI reads.
 */
export interface ApiRequest {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  query: Record<string, unknown>;
  body?: Record<string, unknown>;
  socket?: { remoteAddress?: string };
}

export interface ApiResponse {
  setHeader(name: string, value: string): void;
  status(code: number): ApiResponse;
  send(body: string): void;
  json(body: unknown): void;
  redirect(status: number, location: string): void;
}
