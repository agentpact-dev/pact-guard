import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerPactTools } from "./tools";

export interface Env {
  /** apps/api's deployed URL, https://api.agentpact.dev/api/v1 in production. */
  PACT_API_URL: string;
}

/**
 * The remote MCP server - this is "the MCP site": a hosted, URL-addressable
 * MCP endpoint that Claude, Codex, and other agents connect to directly,
 * rather than running anything locally. Backed by a Durable Object per
 * Cloudflare's `agents` package.
 */
export class PactMcp extends McpAgent<Env> {
  server = new McpServer({ name: "AgentPact", version: "0.1.0" });

  async init() {
    registerPactTools(this.server, this.env.PACT_API_URL);
  }
}

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);

    if (url.pathname === "/sse" || url.pathname === "/sse/message") {
      return PactMcp.serveSSE("/sse").fetch(request, env, ctx);
    }

    if (url.pathname === "/mcp") {
      return PactMcp.serve("/mcp").fetch(request, env, ctx);
    }

    if (url.pathname === "/health") {
      return Response.json({ ok: true, service: "pact-mcp" });
    }

    return new Response("Not found", { status: 404 });
  },
};
