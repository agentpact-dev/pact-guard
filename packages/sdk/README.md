# @agentpact-dev/sdk

TypeScript SDK for [AgentPact](https://agentpact.dev) - financial guardrails
for AI agents on Robinhood Chain.

```bash
npm install @agentpact-dev/sdk
```

```ts
import { AgentPact } from "@agentpact-dev/sdk";

const pact = new AgentPact({
  agentId: "research-agent",
  sessionKey: process.env.AGENT_SESSION_KEY,
});

const result = await pact.pay({
  amount: "2",
  asset: "USDG",
  destination: "0x...",
});

if (result.decision === "allow") {
  // proceed with execution
} else if (result.decision === "approval_required") {
  // wait for the owner to approve, via the dashboard or a webhook
} else {
  // denied - do not retry with the same parameters
}
```

This SDK is a client for the AgentPact API. It is not itself the enforcement
boundary: every call is a network request, and the server has the final say
on whether an action is allowed. For most agents (Claude, Codex, and similar),
using AgentPact through [MCP](../mcp) rather than this SDK directly is the
simpler integration path.
