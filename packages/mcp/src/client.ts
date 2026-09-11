/**
 * Thin fetch wrapper over the AgentPact API - the MCP server holds no
 * policy logic itself (plan.md §3). `PACT_API_URL` is bound per environment
 * in wrangler.toml.
 */
export async function callPactApi<T>(
  baseUrl: string,
  method: "GET" | "POST",
  path: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(`${baseUrl.replace(/\/$/, "")}${path}`, {
    method,
    headers: { "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`AgentPact API error ${res.status}: ${text}`);
  }

  return res.json() as Promise<T>;
}
