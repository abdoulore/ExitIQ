import { getAssetById } from "@/lib/assets";
import {
  type ExitCheckResult,
  type ExitMode,
  type RiskProfile,
  runExitCheck,
} from "@/lib/scoring";

const agentAssetIds = ["usdy", "meth", "usde"];

export type AgentSimulationInput = {
  amountUsd?: number;
  riskProfile?: RiskProfile;
  timeHorizonDays?: number;
  mode?: ExitMode;
};

export type AgentSimulationRejected = {
  asset: string;
  reason: string;
};

export type AgentSimulationComparison = {
  asset: string;
  apy: number;
  exitScore: ExitCheckResult["exitScore"];
  maxSafeSizeUsd: number;
  stressResult: {
    liquidityDown20: ExitCheckResult["stress"]["liquidityDown20"]["exitScore"];
    liquidityDown50: ExitCheckResult["stress"]["liquidityDown50"]["exitScore"];
    bestRouteUnavailable: ExitCheckResult["stress"]["bestRouteUnavailable"]["exitScore"];
  };
  verdict: ExitCheckResult["verdict"];
};

export type AgentSimulationResult = {
  selected: string;
  selectedReason: string;
  rejected: AgentSimulationRejected[];
  decision: string;
  amountUsd: number;
  compared: AgentSimulationComparison[];
};

export function simulateAgentDecision(input: AgentSimulationInput = {}): AgentSimulationResult {
  const amountUsd = input.amountUsd ?? 50000;
  const riskProfile = input.riskProfile ?? "balanced";
  const timeHorizonDays = input.timeHorizonDays ?? 7;
  const mode = input.mode ?? "demo";
  const results = agentAssetIds.map((assetId) =>
    runExitCheck({
      assetId,
      amountUsd,
      riskProfile,
      timeHorizonDays,
      mode,
    }),
  );
  const selected = [...results].sort(compareAgentOptions)[0];
  const highestApy = [...results].sort((left, right) => right.asset.apy - left.asset.apy)[0];
  const rejected = results
    .filter((result) => result.asset.id !== selected.asset.id)
    .map((result) => ({
      asset: result.asset.name,
      reason: rejectionReason(result),
    }));

  return {
    selected: selected.asset.name,
    selectedReason: selectedReason(selected, highestApy),
    rejected,
    decision: "Choose lower APY but safer exit quality.",
    amountUsd,
    compared: results.map((result) => ({
      asset: result.asset.name,
      apy: result.asset.apy,
      exitScore: result.exitScore,
      maxSafeSizeUsd: result.maxSafeSizeUsd,
      stressResult: {
        liquidityDown20: result.stress.liquidityDown20.exitScore,
        liquidityDown50: result.stress.liquidityDown50.exitScore,
        bestRouteUnavailable: result.stress.bestRouteUnavailable.exitScore,
      },
      verdict: result.verdict,
    })),
  };
}

function compareAgentOptions(left: ExitCheckResult, right: ExitCheckResult) {
  const leftScore = agentQualityScore(left);
  const rightScore = agentQualityScore(right);

  if (rightScore !== leftScore) {
    return rightScore - leftScore;
  }

  return right.asset.apy - left.asset.apy;
}

function agentQualityScore(result: ExitCheckResult) {
  const stressPenalty =
    gradeRank(result.stress.liquidityDown20.exitScore) +
    gradeRank(result.stress.liquidityDown50.exitScore) +
    gradeRank(result.stress.bestRouteUnavailable.exitScore);
  const safeSizeBonus = result.maxSafeSizeUsd >= result.amountUsd ? 20 : 0;

  return gradeRank(result.exitScore) * 100 + stressPenalty * 8 + safeSizeBonus;
}

function selectedReason(selected: ExitCheckResult, highestApy: ExitCheckResult) {
  if (selected.asset.id === highestApy.asset.id) {
    return `${selected.asset.name} has the strongest exit quality among the checked opportunities while still offering ${selected.asset.apy}% APY.`;
  }

  return `${selected.asset.name} has lower APY than ${highestApy.asset.name}, but much stronger exit quality at the requested size.`;
}

function rejectionReason(result: ExitCheckResult) {
  if (result.exitScore === "A" || result.exitScore === "B") {
    return `Rejected because another route has stronger exit quality at the requested size, despite ${result.asset.apy}% APY.`;
  }

  return `Rejected because it has a ${result.exitScore} exit score at the requested size despite ${result.asset.apy}% APY.`;
}

function gradeRank(grade: ExitCheckResult["exitScore"]) {
  const ranks: Record<ExitCheckResult["exitScore"], number> = {
    A: 5,
    B: 4,
    C: 3,
    D: 2,
    F: 1,
  };

  return ranks[grade];
}

export function parseAgentSimulationInput(body: unknown): AgentSimulationInput {
  if (!body || typeof body !== "object") {
    return {};
  }

  const input = body as AgentSimulationInput;
  const amountUsd =
    typeof input.amountUsd === "number" && Number.isFinite(input.amountUsd) && input.amountUsd > 0
      ? input.amountUsd
      : undefined;
  const riskProfile = isRiskProfile(input.riskProfile) ? input.riskProfile : undefined;
  const mode = input.mode === "live" || input.mode === "demo" ? input.mode : undefined;
  const timeHorizonDays =
    typeof input.timeHorizonDays === "number" &&
    Number.isFinite(input.timeHorizonDays) &&
    input.timeHorizonDays > 0
      ? input.timeHorizonDays
      : undefined;

  return {
    amountUsd,
    riskProfile,
    timeHorizonDays,
    mode,
  };
}

function isRiskProfile(value: unknown): value is RiskProfile {
  return value === "conservative" || value === "balanced" || value === "aggressive";
}

export function getAgentAssets() {
  return agentAssetIds.map((assetId) => getAssetById(assetId)).filter(Boolean);
}
