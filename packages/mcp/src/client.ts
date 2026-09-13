/**
 * Thin fetch wrapper over the AgentPact API - the MCP server holds no
 * policy logic itself. `PACT_API_URL` is bound per environment in
 * wrangler.toml. The session key identifies the agent server-side.
 */
export class PactApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: unknown,
  ) {
    super(`AgentPact API error ${status}`);
  }
}

export async function callPactApi<T>(
  baseUrl: string,
  sessionKey: string,
  method: "GET" | "POST",
  path: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(`${baseUrl.replace(/\/$/, "")}${path}`, {
    method,
    headers: { "content-type": "application/json", authorization: `Bearer ${sessionKey}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({ error: res.statusText }));
  if (!res.ok) throw new PactApiError(res.status, json);
  return json as T;
}
