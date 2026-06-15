import { generateAIMemo } from "@/lib/ai";
import type { ExitCheckResult, ExitGrade } from "@/lib/scoring";

export type AgentAction = "allow" | "warn" | "reject";
export type AgentDecisionSource = "llm" | "deterministic";

export type AgentExitDecision = {
  action: AgentAction;
  confidence: number;
  headline: string;
  reasons: string[];
  requiredAction: string;
  monitoringTrigger: string;
  narrative: string;
  modelBaselineAction: AgentAction;
  agreesWithBaseline: boolean;
  source: AgentDecisionSource;
};

const gradeToBaselineAction: Record<ExitGrade, AgentAction> = {
  A: "allow",
  B: "allow",
  C: "warn",
  D: "warn",
  F: "reject",
};

export function baselineActionForGrade(grade: ExitGrade): AgentAction {
  return gradeToBaselineAction[grade];
}

export function actionLabel(action: AgentAction) {
  const labels: Record<AgentAction, string> = {
    allow: "Allow",
    warn: "Warn",
    reject: "Reject",
  };

  return labels[action];
}

/**
 * Deterministic decision used both as the audit baseline the AI agent reasons
 * against and as the safe fallback when the LLM is unavailable. This keeps the
 * decision reproducible and verifiable while the AI layer drives the live call.
 */
export function buildDeterministicDecision(result: ExitCheckResult): AgentExitDecision {
  const action = baselineActionForGrade(result.exitScore);
  const sizeWithinLimit = result.amountUsd <= result.maxSafeSizeUsd;

  return {
    action,
    confidence: deterministicConfidence(action, sizeWithinLimit),
    headline: headlineFor(action, result),
    reasons: reasonsFor(result, sizeWithinLimit),
    requiredAction: requiredActionFor(action, result, sizeWithinLimit),
    monitoringTrigger: monitoringTriggerFor(result),
    narrative: generateAIMemo(result),
    modelBaselineAction: action,
    agreesWithBaseline: true,
    source: "deterministic",
  };
}

function deterministicConfidence(action: AgentAction, sizeWithinLimit: boolean) {
  if (action === "allow") {
    return sizeWithinLimit ? 88 : 74;
  }

  if (action === "reject") {
    return 82;
  }

  return sizeWithinLimit ? 64 : 58;
}

function headlineFor(action: AgentAction, result: ExitCheckResult) {
  const size = `$${usd(result.amountUsd)} ${result.asset.symbol}`;

  if (action === "allow") {
    return `Agent allows the ${size} position at this size.`;
  }

  if (action === "warn") {
    return `Agent flags the ${size} position for size and route limits.`;
  }

  return `Agent rejects the ${size} position at this size.`;
}

function reasonsFor(result: ExitCheckResult, sizeWithinLimit: boolean) {
  const reasons = [
    `A $${usd(result.amountUsd)} exit carries ${result.estimatedSlippagePct}% estimated slippage against $${usd(
      result.liquidityDepthUsd,
    )} of liquidity depth.`,
    `Route diversity is ${result.routeDiversity} and volume support is ${result.volumeSupport}; best route is ${result.bestRoute}.`,
    sizeWithinLimit
      ? `Requested size is within the $${usd(result.maxSafeSizeUsd)} max safe size.`
      : `Requested size exceeds the $${usd(result.maxSafeSizeUsd)} max safe size.`,
    `Under a 20% liquidity drop the stressed exit grade becomes ${result.stress.liquidityDown20.exitScore}.`,
  ];

  return reasons;
}

function requiredActionFor(action: AgentAction, result: ExitCheckResult, sizeWithinLimit: boolean) {
  if (action === "allow") {
    return "Proceed, then re-check at the final position size before executing.";
  }

  if (action === "warn") {
    return sizeWithinLimit
      ? "Enter only with active monitoring and a split-exit plan."
      : `Reduce size toward $${usd(result.maxSafeSizeUsd)} or split the exit across routes before entry.`;
  }

  return "Do not enter at this size; wait for deeper liquidity or a stronger exit route.";
}

function monitoringTriggerFor(result: ExitCheckResult) {
  return `If liquidity depth falls 20% to $${usd(
    result.stress.liquidityDown20.liquidityUsd,
  )}, the stressed exit grade is ${result.stress.liquidityDown20.exitScore}; re-evaluate before exiting.`;
}

function usd(value: number) {
  return Math.round(value).toLocaleString("en-US");
}
