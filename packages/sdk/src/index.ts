import type {
  ActivityRecord,
  AuthorizeParams,
  AuthorizeResult,
  BudgetResult,
} from "./types";

export * from "./types";

export interface AgentPactOptions {
  agentId: string;
  /** Session key issued to this agent by its owner (plan.md §26). */
  sessionKey?: string;
  /** Defaults to the hosted AgentPact API. Override for local dev / self-host. */
  baseUrl?: string;
}

const DEFAULT_BASE_URL = "https://api.agentpact.dev/api/v1";

/**
 * Thin HTTP client over the AgentPact API. This SDK is an interface into
 * AgentPact, not the enforcement boundary (plan.md §3) - every method here
 * is a network call, and the server has the final say.
 */
export class AgentPact {
  private readonly agentId: string;
  private readonly sessionKey?: string;
  private readonly baseUrl: string;

  constructor(options: AgentPactOptions) {
    this.agentId = options.agentId;
    this.sessionKey = options.sessionKey;
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");
  }

  /** authorize -> sign -> execute -> monitor -> audit (plan.md §20). */
  async authorize(params: AuthorizeParams): Promise<AuthorizeResult> {
    return this.request<AuthorizeResult>("POST", "/authorize", {
      agentId: this.agentId,
      ...params,
    });
  }

  /** Higher-level helper: authorize a payment. Does not yet execute onchain. */
  async pay(params: Omit<AuthorizeParams, "action">): Promise<AuthorizeResult> {
    return this.authorize({ ...params, action: "payment" });
  }

  /** Higher-level helper: authorize a swap. Does not yet execute onchain. */
  async swap(params: Omit<AuthorizeParams, "action">): Promise<AuthorizeResult> {
    return this.authorize({ ...params, action: "swap" });
  }

  async budget(): Promise<BudgetResult> {
    return this.request<BudgetResult>("GET", `/budget/${this.agentId}`);
  }

  async status(): Promise<{ id: string; name: string; status?: string }> {
    return this.request("GET", `/agents/${this.agentId}`);
  }

  async activity(): Promise<ActivityRecord[]> {
    const result = await this.request<{ activity: ActivityRecord[] }>(
      "GET",
      `/activity?agent=${encodeURIComponent(this.agentId)}`,
    );
    return result.activity;
  }

  private async request<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        "content-type": "application/json",
        ...(this.sessionKey ? { authorization: `Bearer ${this.sessionKey}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      throw new Error(`AgentPact API error ${res.status}: ${text}`);
    }

    return res.json() as Promise<T>;
  }
}
