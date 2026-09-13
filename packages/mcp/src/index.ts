import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerPactTools } from "./tools";

export interface Env {
  /** apps/api's deployed URL, https://api.agentpact.dev/api/v1 in production. */
  PACT_API_URL: string;
}

/** Per-connection props, set from the request before the agent is served. */
export interface Props extends Record<string, unknown> {
  sessionKey: string | null;
}

/**
 * The remote MCP server - a hosted, URL-addressable MCP endpoint that
 * Claude, Codex, and other agents connect to directly. Backed by a Durable
 * Object per Cloudflare's `agents` package.
 *
 * The agent's session key (issued by its owner in the dashboard or via
 * POST /agents/:id/session) travels with the connection, never as a tool
 * argument, so it never lands in the model's context:
 *
 *   Authorization: Bearer pact_sk_...      (preferred)
 *   https://mcp.agentpact.dev/mcp?key=pact_sk_...   (clients without header support)
 */
export class PactMcp extends McpAgent<Env, unknown, Props> {
  server = new McpServer({ name: "AgentPact", version: "0.2.0" });

  async init() {
    registerPactTools(this.server, this.env.PACT_API_URL, () => this.props?.sessionKey ?? null);
  }
}

const SESSION_KEY_RE = /^pact_sk_[a-z0-9]{20,}$/;

function sessionKeyFrom(request: Request, url: URL): string | null {
  const header = request.headers.get("authorization") ?? "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  const candidate = bearer || url.searchParams.get("key") || "";
  return SESSION_KEY_RE.test(candidate) ? candidate : null;
}

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);
    const props: Props = { sessionKey: sessionKeyFrom(request, url) };
    const withProps = Object.assign(ctx, { props });

    if (url.pathname === "/sse" || url.pathname === "/sse/message") {
      return PactMcp.serveSSE("/sse").fetch(request, env, withProps);
    }

    if (url.pathname === "/mcp") {
      return PactMcp.serve("/mcp").fetch(request, env, withProps);
    }

    if (url.pathname === "/health") {
      return Response.json({ ok: true, service: "pact-mcp" });
    }

    if (url.pathname === "/") {
      return Response.json({
        service: "pact-mcp",
        endpoint: "https://mcp.agentpact.dev/mcp",
        auth: "Authorization: Bearer <agent session key>, or ?key=<agent session key>",
        docs: "https://agentpact.dev/docs",
        sandbox: "POST https://api.agentpact.dev/api/v1/demo/session for a one-hour throwaway key",
      });
    }

    return new Response("Not found", { status: 404 });
  },
};
