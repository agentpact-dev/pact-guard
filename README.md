# pact-guard

The public surface of [AgentPact](https://agentpact.dev) - spending
guardrails for AI agents.

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

## Live

https://mcp.agentpact.dev/mcp - the deployed MCP server, pointed at the
production API (`api.agentpact.dev`, from the private `pact-app` repo).

Connect with the agent's session key in the `Authorization: Bearer` header
(or `?key=` on the URL for clients without header support). The key is
issued by the agent's owner in the dashboard. For a throwaway sandbox key:
`POST https://api.agentpact.dev/api/v1/demo/session`.

```json
{
  "mcpServers": {
    "agentpact": {
      "type": "http",
      "url": "https://mcp.agentpact.dev/mcp",
      "headers": { "Authorization": "Bearer pact_sk_..." }
    }
  }
}
```

End-to-end check against a local API + MCP (`wrangler dev` on 8787 / 8788):

```bash
node packages/mcp/scripts/e2e.mjs http://localhost:8787 http://localhost:8788
```

## Development

```bash
pnpm install
cp packages/mcp/.dev.vars.example packages/mcp/.dev.vars   # first time only
pnpm dev:mcp      # wrangler dev, packages/mcp
```

`packages/mcp` reads `PACT_API_URL` from `.dev.vars` locally (gitignored,
points at `http://localhost:8787/api/v1`, a local `pact-api`) and from
`wrangler.toml`'s `[vars]` in production (`https://api.agentpact.dev/api/v1`).

## Deploying the MCP server

```bash
pnpm --filter @agentpact/mcp run deploy
```

Needs `wrangler login` against the Cloudflare account that owns the
`agentpact.dev` zone first. Note the explicit `run`, `deploy` collides with
pnpm's own built-in command.

## Publishing the SDK

```bash
pnpm --filter @agentpact-dev/sdk run build
pnpm --filter @agentpact-dev/sdk publish
```

## License

MIT
