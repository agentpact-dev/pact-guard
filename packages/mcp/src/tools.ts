import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { callPactApi } from "./client";

const ACTION = z.enum(["payment", "swap", "transfer", "contract_call"]);

function text(value: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }] };
}

/**
 * plan.md §19 - initial MCP tool surface. `pact_status`, `pact_budget`,
 * `pact_authorize`, and `pact_activity` call the real (demo) API.
 * `pact_pay`, `pact_swap`, and `pact_request_approval` are stubs - they
 * will call into the Pact Account execution layer once that exists.
 */
export function registerPactTools(server: McpServer, baseUrl: string) {
  server.tool(
    "pact_status",
    "Get the status and active Pact for an agent.",
    { agentId: z.string() },
    async ({ agentId }) => text(await callPactApi(baseUrl, "GET", `/agents/${agentId}`)),
  );

  server.tool(
    "pact_budget",
    "Get an agent's remaining daily budget under its active Pact.",
    { agentId: z.string() },
    async ({ agentId }) => text(await callPactApi(baseUrl, "GET", `/budget/${agentId}`)),
  );

  server.tool(
    "pact_authorize",
    "Ask AgentPact whether a proposed financial action is allowed under the agent's Pact, before executing it.",
    {
      agentId: z.string(),
      action: ACTION,
      amount: z.string().describe("Base-unit decimal string, e.g. \"2.5\""),
      asset: z.string(),
      destination: z.string(),
    },
    async ({ agentId, ...body }) =>
      text(await callPactApi(baseUrl, "POST", "/authorize", { agentId, ...body })),
  );

  server.tool(
    "pact_activity",
    "List recent Pact decisions for an agent.",
    { agentId: z.string() },
    async ({ agentId }) =>
      text(await callPactApi(baseUrl, "GET", `/activity?agent=${encodeURIComponent(agentId)}`)),
  );

  server.tool(
    "pact_pay",
    "Authorize and execute a payment. Not implemented yet, chain execution lands in a later phase.",
    { agentId: z.string(), amount: z.string(), asset: z.string(), destination: z.string() },
    async () => text({ error: "not_implemented", reason: "execution layer not deployed yet" }),
  );

  server.tool(
    "pact_swap",
    "Authorize and execute a swap. Not implemented yet, chain execution lands in a later phase.",
    { agentId: z.string(), amount: z.string(), asset: z.string(), destination: z.string() },
    async () => text({ error: "not_implemented", reason: "execution layer not deployed yet" }),
  );

  server.tool(
    "pact_request_approval",
    "Explicitly request owner approval for an action, outside of the normal authorize flow. Not implemented yet.",
    { agentId: z.string(), reason: z.string() },
    async () => text({ error: "not_implemented", reason: "approval queue not deployed yet" }),
  );
}
