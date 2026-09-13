/**
 * Wire types for the AgentPact REST API (https://api.agentpact.dev/api/v1).
 * This SDK is a client: it holds no policy logic, the server has the final say.
 */

export type ActionType = "payment" | "swap" | "transfer" | "contract_call";

export type DecisionOutcome = "allow" | "deny" | "approval_required";

export type CheckResult = "pass" | "fail" | "ask" | "skip";

export type Checks = Partial<
  Record<
    | "agent_active"
    | "action_allowed"
    | "asset_allowed"
    | "destination_not_blocked"
    | "destination_known"
    | "transaction_cap"
    | "daily_budget"
    | "session_budget"
    | "velocity",
    CheckResult
  >
>;

export interface AuthorizeParams {
  action: ActionType;
  /** Decimal string, e.g. "2.5". Never a float. */
  amount: string;
  asset: string;
  destination: string;
  /** Short purpose, stored in the audit trail. */
  memo?: string;
}

export interface AuthorizeResult {
  decision: DecisionOutcome;
  decisionId: string;
  reasons: string[];
  checks: Checks;
  remainingDailyBudget: string;
  pactId: string;
  pactVersion: number;
  /** Present when decision is approval_required. */
  approvalId?: string;
  approvalExpiresAt?: string;
}

export interface BudgetResult {
  agentId: string;
  status: "active" | "frozen";
  pact: { id: string; version: number; name: string };
  dailyLimit: string;
  dailySpent: string;
  remaining: string;
  transactionLimit: string;
  window: "rolling_24h";
  sessionLimit?: string;
  sessionSpent?: string;
  sessionRemaining?: string;
}

export interface ActivityRecord {
  decisionId: string;
  agentId: string;
  pactId: string;
  action: string;
  amount: string;
  asset: string;
  destination: string;
  memo: string | null;
  decision: DecisionOutcome;
  reasons: string[];
  checks: Checks;
  createdAt: string;
}

export type ApprovalStatus = "pending" | "approved" | "denied" | "expired";

export interface Approval {
  id: string;
  decisionId: string;
  agentId: string;
  status: ApprovalStatus;
  requestedAt: string;
  expiresAt: string;
  resolvedAt: string | null;
  resolutionReason: string | null;
  request?: ActivityRecord;
}

export interface SandboxSession {
  agent: { id: string; name: string; status: string };
  pact: { id: string; version: number; name: string; config: unknown };
  sessionKey: string;
  expiresAt: string;
}
