# @agentpact-dev/sdk

TypeScript SDK for [AgentPact](https://agentpact.dev): spending guardrails
for AI agents. Define what an agent may spend, where, and when it needs a
human; every action is checked against that Pact before it happens.

```bash
npm install @agentpact-dev/sdk
```

## Try it in 30 seconds (no signup)

```ts
import { AgentPact } from "@agentpact-dev/sdk";

// Throwaway Research agent: 1 USDG per transaction, 25 USDG per day, one-hour key.
const { client } = await AgentPact.sandbox();

const result = await client.pay({ amount: "0.5", asset: "USDG", destination: "0xResearchApi" });
console.log(result.decision, result.reasons, result.remainingDailyBudget);
```

## Real agents

The agent's owner creates the agent and its Pact in the dashboard (or via
the REST API) and issues a scoped session key. The key identifies the
agent; it cannot change its own Pact.

```ts
const pact = new AgentPact({ sessionKey: process.env.AGENT_SESSION_KEY! });

const result = await pact.authorize({
  action: "payment",
  amount: "2",
  asset: "USDG",
  destination: "0x...",
  memo: "NVDA filings dataset",
});

switch (result.decision) {
  case "allow":
    // proceed. The amount is already committed against the daily budget.
    break;
  case "approval_required": {
    const approval = await pact.waitForApproval(result.approvalId!);
    if (approval.status === "approved") {
      // proceed
    }
    break;
  }
  case "deny":
    // do not retry with the same parameters. result.reasons says why.
    break;
}
```

Other calls: `budget()`, `activity()`, `approval(id)`.

## What the server enforces

- Allowed action types (allow / ask / deny per type)
- Per-transaction cap, daily budget (rolling 24h), optional session budget
- Asset allowlist, trusted and blocked destinations, unknown-destination policy
- Optional actions-per-hour velocity guard
- Owner approvals with expiry, and emergency freeze

Budget checks are committed atomically server-side, so concurrent requests
cannot overspend. This SDK is a client over that API, not the enforcement
boundary. For Claude, Codex and similar, the hosted MCP server at
`https://mcp.agentpact.dev/mcp` is the simpler integration.

Chain execution (moving the funds) is a later phase; today `pay()` and
`swap()` authorize only.
