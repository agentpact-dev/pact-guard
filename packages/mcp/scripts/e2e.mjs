import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const API = process.argv[2] ?? "http://localhost:8787";
const MCP = process.argv[3] ?? "http://localhost:8788";
const sandbox = await (await fetch(`${API}/api/v1/demo/session`, { method: "POST" })).json();
console.log("sandbox agent", sandbox.agent.id);

async function connect(headers) {
  const client = new Client({ name: "e2e", version: "0" });
  await client.connect(new StreamableHTTPClientTransport(new URL(`${MCP}/mcp`), { requestInit: { headers } }));
  return client;
}
const show = (label, r) => console.log(`\n## ${label}\n` + r.content[0].text.slice(0, 500));

const anon = await connect({});
console.log("tools:", (await anon.listTools()).tools.map((t) => t.name).join(", "));
show("no key -> helpful error", await anon.callTool({ name: "pact_budget", arguments: {} }));
await anon.close();

const c = await connect({ authorization: `Bearer ${sandbox.sessionKey}` });
show("pact_status", await c.callTool({ name: "pact_status", arguments: {} }));
show("pact_authorize 0.5 to new dest -> ask", await c.callTool({ name: "pact_authorize", arguments: { action: "payment", amount: "0.5", asset: "USDG", destination: "0xapi", memo: "test" } }));
show("pact_authorize swap -> deny", await c.callTool({ name: "pact_authorize", arguments: { action: "swap", amount: "0.5", asset: "USDG", destination: "0xapi" } }));
const r = JSON.parse((await c.callTool({ name: "pact_pay", arguments: { amount: "5", asset: "USDG", destination: "0xapi" } })).content[0].text);
show("pact_approval_status", await c.callTool({ name: "pact_approval_status", arguments: { approvalId: r.approvalId } }));
show("pact_activity", await c.callTool({ name: "pact_activity", arguments: { limit: 2 } }));
await c.close();

const q = await connect({});
// query-string key form
const c2 = new Client({ name: "e2e-q", version: "0" });
await c2.connect(new StreamableHTTPClientTransport(new URL(`${MCP}/mcp?key=${sandbox.sessionKey}`)));
show("?key= form pact_budget", await c2.callTool({ name: "pact_budget", arguments: {} }));
await c2.close(); await q.close();
