import type {
  ActivityRecord,
  Approval,
  AuthorizeParams,
  AuthorizeResult,
  BudgetResult,
  SandboxSession,
} from "./types";

export * from "./types";

export interface AgentPactOptions {
  /** Session key issued to this agent by its owner (pact_sk_...). Identifies the agent. */
  sessionKey: string;
  /** Defaults to the hosted AgentPact API. Override for local dev / self-host. */
  baseUrl?: string;
}

const DEFAULT_BASE_URL = "https://api.agentpact.dev/api/v1";

export class AgentPactError extends Error {
  constructor(
    readonly status: number,
    readonly body: { error?: string; [k: string]: unknown },
  ) {
    super(body.error ?? `AgentPact API error ${status}`);
  }
}

/**
 * Thin HTTP client over the AgentPact API. Every method is a network call
 * and the server decides; this SDK is an interface, not the enforcement
 * boundary.
 */
export class AgentPact {
  private readonly sessionKey: string;
  private readonly baseUrl: string;

  constructor(options: AgentPactOptions) {
    if (!options.sessionKey) throw new Error("AgentPact: sessionKey is required");
    this.sessionKey = options.sessionKey;
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");
  }

  /**
   * Zero-signup sandbox: a throwaway Research agent with a one-hour key.
   * Exercises the real policy engine; cannot move funds.
   */
  static async sandbox(options: { baseUrl?: string; template?: "research" | "trading" | "worker" } = {}) {
    const baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");
    const res = await fetch(`${baseUrl}/demo/session?template=${options.template ?? "research"}`, { method: "POST" });
    const body = (await res.json()) as SandboxSession & { error?: string; [k: string]: unknown };
    if (!res.ok) throw new AgentPactError(res.status, body);
    return { client: new AgentPact({ sessionKey: body.sessionKey, baseUrl }), session: body };
  }

  /** Ask whether an action is allowed. An allow commits the amount against the budget. */
  async authorize(params: AuthorizeParams): Promise<AuthorizeResult> {
    return this.request<AuthorizeResult>("POST", "/authorize", params);
  }

  /**
   * Authorize AND execute a payment from the agent's managed wallet. On
   * allow, the transfer is sent on-chain and the result carries txHash; on
   * approval_required it executes when the owner approves. Requires a
   * managed wallet and a 0x destination - agents holding their own keys
   * should use authorize() and move funds themselves.
   */
  async pay(params: Omit<AuthorizeParams, "action">): Promise<AuthorizeResult & { txHash?: string | null; executionError?: string }> {
    return this.request("POST", "/pay", { ...params, action: "payment" });
  }

  /** The agent's managed wallet address and balances (errors without one). */
  async wallet(): Promise<{ address: string; chain: string; balances: Record<string, string> | null }> {
    const out = await this.request<{ wallet: { address: string; chain: string; balances: Record<string, string> | null } }>(
      "GET",
      "/wallet",
    );
    return out.wallet;
  }

  /** Authorize a swap. Swap execution is not deployed yet; this only authorizes. */
  async swap(params: Omit<AuthorizeParams, "action">): Promise<AuthorizeResult> {
    return this.authorize({ ...params, action: "swap" });
  }

  async budget(): Promise<BudgetResult> {
    return this.request<BudgetResult>("GET", "/budget");
  }

  /** Alias of budget(): status, active Pact summary and budget in one call. */
  async status(): Promise<BudgetResult> {
    return this.budget();
  }

  async activity(options: { limit?: number } = {}): Promise<ActivityRecord[]> {
    const result = await this.request<{ activity: ActivityRecord[] }>("GET", `/activity?limit=${options.limit ?? 50}`);
    return result.activity;
  }

  async approval(approvalId: string): Promise<Approval> {
    const result = await this.request<{ approval: Approval }>("GET", `/approvals/${encodeURIComponent(approvalId)}`);
    return result.approval;
  }

  /**
   * Polls an approval until the owner resolves it or it expires.
   * Resolves with the final approval; check `status === "approved"` before proceeding.
   */
  async waitForApproval(
    approvalId: string,
    options: { intervalMs?: number; timeoutMs?: number } = {},
  ): Promise<Approval> {
    const interval = options.intervalMs ?? 3000;
    const deadline = Date.now() + (options.timeoutMs ?? 10 * 60 * 1000);
    for (;;) {
      const approval = await this.approval(approvalId);
      if (approval.status !== "pending") return approval;
      if (Date.now() >= deadline) return approval;
      await new Promise((r) => setTimeout(r, interval));
    }
  }

  private async request<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: { "content-type": "application/json", authorization: `Bearer ${this.sessionKey}` },
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = (await res.json().catch(() => ({ error: res.statusText }))) as { error?: string };
    if (!res.ok) throw new AgentPactError(res.status, json);
    return json as T;
  }
}
