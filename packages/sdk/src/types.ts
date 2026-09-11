/**
 * Wire types for the AgentPact REST API. Kept in sync by hand with
 * `pact-app/packages/shared` (a separate, private repo) - this SDK only
 * ever talks to that API over HTTP, it holds no policy logic itself.
 */

export type ActionType = "payment" | "swap" | "transfer" | "contract_call";

export type DecisionOutcome = "allow" | "deny" | "approval_required";

export interface AuthorizeParams {
  action: ActionType;
  amount: string;
  asset: string;
  destination: string;
}

export interface AuthorizeResult {
  decision: DecisionOutcome;
  decisionId: string;
  reasons: string[];
  remainingDailyBudget: string;
  approvalId?: string;
}

export interface BudgetResult {
  dailyLimit: string;
  dailySpent: string;
  remaining: string;
}

export interface ActivityRecord {
  decisionId: string;
  agentId: string;
  action: string;
  amount: string;
  asset: string;
  destination: string;
  decision: string;
  reasons: string[];
  createdAt: string;
}
