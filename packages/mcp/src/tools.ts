import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { callPactApi, PactApiError } from "./client";

const ACTION = z.enum(["payment", "swap", "transfer", "contract_call"]);

const NO_KEY = {
  error: "no_session_key",
  message:
    "This MCP connection has no agent session key. Connect with `Authorization: Bearer pact_sk_...` " +
    "or append `?key=pact_sk_...` to the server URL. The agent's owner issues keys from the AgentPact " +
    "dashboard (POST /agents/:id/session). For a throwaway sandbox key: POST https://api.agentpact.dev/api/v1/demo/session",
};

function text(value: unknown, isError = false) {
  return { content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }], ...(isError ? { isError } : {}) };
}

/**
 * MCP tool surface. Every tool is a thin call to the AgentPact API; the
 * decision is made server-side under the agent's active Pact. The agent is
 * identified by the connection's session key, so no tool takes an agentId.
 */
export function registerPactTools(server: McpServer, baseUrl: string, getKey: () => string | null) {
  const call = async <T>(method: "GET" | "POST", path: string, body?: unknown) => {
    const key = getKey();
    if (!key) return text(NO_KEY, true);
    try {
      return text(await callPactApi<T>(baseUrl, key, method, path, body));
    } catch (e) {
      if (e instanceof PactApiError) return text({ status: e.status, ...(e.body as object) }, true);
      throw e;
    }
  };

  server.tool(
    "pact_status",
    "Show this agent: its status (active/frozen), its active Pact (limits, allowed actions, assets, destinations) and today's budget.",
    {},
    async () => call("GET", "/budget"),
  );

  server.tool(
    "pact_budget",
    "Remaining budget under the agent's Pact: daily limit, spent in the rolling 24h window, remaining, per-transaction cap.",
    {},
    async () => call("GET", "/budget"),
  );

  server.tool(
    "pact_authorize",
    "Ask AgentPact whether a financial action is allowed under this agent's Pact BEFORE doing it. " +
      "Returns decision allow | deny | approval_required, the rule checks, and the remaining daily budget. " +
      "An allow commits the amount against the budget. On approval_required, wait for the owner: poll pact_approval_status with the approvalId. " +
      "On deny, do not retry the same request.",
    {
      action: ACTION,
      amount: z.string().describe('Decimal string, e.g. "2.5". Never a float.'),
      asset: z.string().describe('Asset symbol, e.g. "USDG"'),
      destination: z.string().describe("Contract address, merchant address or known identifier being paid"),
      memo: z.string().max(500).optional().describe("Short purpose, stored in the audit trail"),
    },
    async (args) => call("POST", "/authorize", args),
  );

  server.tool(
    "pact_approval_status",
    "Check an approval the owner was asked for. Status: pending | approved | denied | expired. Once approved, the amount is committed and you may proceed.",
    { approvalId: z.string() },
    async ({ approvalId }) => call("GET", `/approvals/${encodeURIComponent(approvalId)}`),
  );

  server.tool(
    "pact_activity",
    "Recent decisions for this agent (allow / deny / approval_required), newest first.",
    { limit: z.number().int().min(1).max(100).optional() },
    async ({ limit }) => call("GET", `/activity?limit=${limit ?? 20}`),
  );

  server.tool(
    "pact_pay",
    "Authorize AND execute a payment from the agent's managed wallet. On allow, the transfer is sent on-chain and the response includes txHash. On approval_required, wait for the owner (pact_approval_status); the transfer executes when they approve. Requires the agent to have a managed wallet and destination to be a 0x address; agents without one should use pact_authorize and move funds themselves.",
    { amount: z.string(), asset: z.string(), destination: z.string(), memo: z.string().optional() },
    async (args) => call("POST", "/pay", { ...args, action: "payment" }),
  );

  server.tool(
    "pact_swap",
    "Authorize a swap against the Pact. Swap execution is not deployed yet: this only authorizes (same as pact_authorize with action=swap).",
    { amount: z.string(), asset: z.string(), destination: z.string(), memo: z.string().optional() },
    async (args) => call("POST", "/authorize", { ...args, action: "swap" }),
  );

  server.tool(
    "pact_wallet",
    "The agent's managed wallet address and balances, for funding checks. Errors if the agent has no managed wallet.",
    {},
    async () => call("GET", "/wallet"),
  );
}
