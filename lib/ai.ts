import type { ExitCheckResult, ExitScore } from "@/lib/scoring";

export type AIMemoSource = "deterministic" | "llm";

export type AgentDecision = {
  action: "allow" | "warn" | "reject";
  reason: string;
  requiredNextStep: string;
};

export function generateAIMemo(result: ExitCheckResult) {
  const recommendation = recommendationFor(result.verdict);
  const reason = `${result.asset.name} receives ${articleForGrade(result.exitScore)} ${result.exitScore} exit score because a $${formatUsd(
    result.amountUsd,
  )} exit has ${result.estimatedSlippagePct}% estimated slippage against $${formatUsd(
    result.liquidityDepthUsd,
  )} of liquidity depth, ${result.volumeSupport} volume support, and ${result.routeDiversity} route diversity.`;
  const action = `Action: ${actionFor(result.verdict)}.`;
  const alternative = alternativeFor(result);
  const monitoringTrigger = `Monitor liquidity depth. If it drops 20% to $${formatUsd(
    result.stress.liquidityDown20.liquidityUsd,
  )}, the stressed exit score becomes ${result.stress.liquidityDown20.exitScore}; ${monitoringAction(
    result.stress.liquidityDown20.exitScore,
  )}.`;

  return `${recommendation} ${reason} ${action} ${alternative} ${monitoringTrigger}`;
}

export function createAgentDecision(score: ExitScore): AgentDecision {
  if (score.value >= 80) {
    return {
      action: "allow",
      reason: "Exit score is above the safe threshold.",
      requiredNextStep: "Proceed only after a fresh check at final position size.",
    };
  }

  if (score.value >= 55) {
    return {
      action: "warn",
      reason: "Exit score is acceptable only with size limits.",
      requiredNextStep: "Reduce size or require a split-exit plan.",
    };
  }

  return {
    action: "reject",
    reason: "Exit score is too weak for an autonomous recommendation.",
    requiredNextStep: "Do not recommend this position until exit conditions improve.",
  };
}

function recommendationFor(verdict: ExitCheckResult["verdict"]) {
  const recommendations: Record<ExitCheckResult["verdict"], string> = {
    enter: "ExitIQ recommends entering this position.",
    enter_with_monitoring: "ExitIQ recommends entering this position with monitoring.",
    reduce_size: "ExitIQ recommends reducing this position.",
    wait: "ExitIQ recommends waiting before entry.",
    avoid: "ExitIQ recommends avoiding this position.",
  };

  return recommendations[verdict];
}

function actionFor(verdict: ExitCheckResult["verdict"]) {
  const actions: Record<ExitCheckResult["verdict"], string> = {
    enter: "enter",
    enter_with_monitoring: "enter with monitoring",
    reduce_size: "reduce size",
    wait: "wait",
    avoid: "avoid",
  };

  return actions[verdict];
}

function alternativeFor(result: ExitCheckResult) {
  if (result.alternative.asset) {
    return `A safer alternative is ${result.alternative.asset}, which scores ${
      result.alternative.exitScore
    } at the same $${formatUsd(result.amountUsd)} size because ${
      result.alternative.reason
    }. Its max safe size is $${formatUsd(result.alternative.maxSafeSizeUsd)}.`;
  }

  if (result.amountUsd > result.alternative.recommendedSizeUsd) {
    return `A safer action is to cap exposure near $${formatUsd(
      result.alternative.recommendedSizeUsd,
    )}. ${result.alternative.message}`;
  }

  return `A safer bound is to keep exposure at or below the calculated max safe size of $${formatUsd(
    result.maxSafeSizeUsd,
  )}.`;
}

function monitoringAction(exitScore: ExitCheckResult["exitScore"]) {
  if (exitScore === "A" || exitScore === "B") {
    return "continue monitoring before entry";
  }

  if (exitScore === "C") {
    return "reduce size before entry";
  }

  if (exitScore === "D") {
    return "wait before entry";
  }

  return "avoid entry";
}

function articleForGrade(exitScore: ExitCheckResult["exitScore"]) {
  return exitScore === "A" || exitScore === "F" ? "an" : "a";
}

function formatUsd(value: number) {
  return Math.round(value).toLocaleString("en-US");
}
