# pact-guard

The public surface of [AgentPact](https://agentpact.dev) - financial
guardrails for AI agents on Robinhood Chain.

> Every agent gets a Pact. Every financial action must obey it.

This is the primary way most agents (Claude, Codex, and similar) reach
AgentPact: through the hosted MCP server, not the dashboard.

```
packages/
  mcp/    Remote MCP server (Cloudflare Workers) - the MCP site
  sdk/    @agentpact-dev/sdk - TypeScript SDK, published to npm
```

Neither package holds policy logic. Both are thin clients over the
AgentPact API - the enforcement boundary lives server-side (and, longer
term, on-chain in the Pact Account contract). See the product plan for
the full picture of how a decision is made.

## Development

```bash
pnpm install
pnpm dev:mcp      # wrangler dev, packages/mcp
```

`packages/mcp` expects `PACT_API_URL` to point at a running instance of the
API (`pact-api`, from the private `pact-app` repo). Defaults to
`http://localhost:8787/api/v1` for local development.

## Publishing the SDK

```bash
pnpm --filter @agentpact-dev/sdk build
pnpm --filter @agentpact-dev/sdk publish
```

## License

MIT
