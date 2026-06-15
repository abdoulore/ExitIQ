import { demoAssets, getAssetById, type ExitAsset } from "@/lib/assets";
import { createComplianceStatus, type ComplianceStatus } from "@/lib/compliance";
import { runStressTests, type ExitStressResult } from "@/lib/stress";

export type RiskProfile = "conservative" | "balanced" | "aggressive";
export type ExitMode = "demo" | "live";
export type ExitGrade = "A" | "B" | "C" | "D" | "F";
export type ExitVerdict = "enter" | "enter_with_monitoring" | "reduce_size" | "wait" | "avoid";
export type RouteDiversity = "low" | "medium" | "high";
export type VolumeSupport = "weak" | "moderate" | "strong";

export type ExitCheckInput = {
  assetId: string;
  amountUsd: number;
  riskProfile: RiskProfile;
  timeHorizonDays: number;
  mode: ExitMode;
};

export type ExitAlternative = {
  asset?: string;
  reason?: string;
  exitScore?: ExitGrade;
  maxSafeSizeUsd: number;
  recommendedSizeUsd: number;
  message: string;
};

export type ExitCheckResult = {
  asset: ExitAsset;
  amountUsd: number;
  exitScore: ExitGrade;
  verdict: ExitVerdict;
  estimatedSlippagePct: number;
  maxSafeSizeUsd: number;
  bestRoute: string;
  routeDiversity: RouteDiversity;
  liquidityDepthUsd: number;
  volumeSupport: VolumeSupport;
  stress: ExitStressResult;
  alternative: ExitAlternative;
  complianceStatus: ComplianceStatus;
  aiMemo: string;
};

export type ExitScore = {
  value: number;
  label: "Safe" | "Watch" | "Crowded" | "Blocked";
  notes: string[];
  grade: ExitGrade;
  verdict: ExitVerdict;
  estimatedSlippagePct: number;
  maxSafeSizeUsd: number;
};

const safeSlippageThresholds: Record<RiskProfile, number> = {
  conservative: 1,
  balanced: 2.5,
  aggressive: 5,
};

export function estimateSlippage(amountInUsd: number, liquidityUsd: number) {
  if (amountInUsd <= 0 || liquidityUsd <= 0) return 100;

  const impact = amountInUsd / (liquidityUsd + amountInUsd);
  return roundPct(impact * 100);
}

export function scoreSlippage(slippagePct: number, riskProfile: RiskProfile) {
  const threshold = safeSlippageThresholds[riskProfile];

  if (slippagePct <= threshold * 0.5) return 100;
  if (slippagePct <= threshold) return 90;
  if (slippagePct <= threshold * 1.75) return 70;
  if (slippagePct <= threshold * 3) return 45;
  if (slippagePct <= threshold * 5) return 20;
  return 0;
}

export function scoreRouteDiversity(routes: number) {
  if (routes >= 3) {
    return { routeDiversity: "high" as const, score: 100 };
  }

  if (routes === 2) {
    return { routeDiversity: "medium" as const, score: 72 };
  }

  return { routeDiversity: "low" as const, score: 38 };
}

export function scoreVolumeSupport(amountUsd: number, dailyVolumeUsd: number) {
  const volumeShare = dailyVolumeUsd > 0 ? amountUsd / dailyVolumeUsd : Number.POSITIVE_INFINITY;

  if (volumeShare <= 0.1) {
    return { volumeSupport: "strong" as const, score: 100 };
  }

  if (volumeShare <= 0.4) {
    return { volumeSupport: "moderate" as const, score: 70 };
  }

  return { volumeSupport: "weak" as const, score: 25 };
}

export function toGrade(weightedScore: number): ExitGrade {
  if (weightedScore >= 85) return "A";
  if (weightedScore >= 70) return "B";
  if (weightedScore >= 55) return "C";
  if (weightedScore >= 40) return "D";
  return "F";
}

export function gradeToVerdict(grade: ExitGrade): ExitVerdict {
  const verdicts: Record<ExitGrade, ExitVerdict> = {
    A: "enter",
    B: "enter_with_monitoring",
    C: "reduce_size",
    D: "wait",
    F: "avoid",
  };

  return verdicts[grade];
}

export function runExitCheck(input: ExitCheckInput): ExitCheckResult {
  const asset = getAssetById(input.assetId);

  if (!asset) {
    throw new Error(`Unknown asset: ${input.assetId}`);
  }

  return runExitCheckForAsset(asset, input);
}

export function runExitCheckForAsset(asset: ExitAsset, input: ExitCheckInput): ExitCheckResult {
  const stress = runStressTests(asset, input, (stressAsset, stressInput) => {
    const stressResult = scoreAssetSnapshot(stressAsset, stressInput, 100);

    return {
      exitScore: stressResult.exitScore,
      estimatedSlippagePct: stressResult.estimatedSlippagePct,
    };
  });
  const stressResilienceScore = scoreStressResilience(stress);
  const scored = scoreAssetSnapshot(asset, input, stressResilienceScore);
  const alternative = createAlternative(input, asset, scored);

  return {
    asset,
    amountUsd: input.amountUsd,
    exitScore: scored.exitScore,
    verdict: gradeToVerdict(scored.exitScore),
    estimatedSlippagePct: scored.estimatedSlippagePct,
    maxSafeSizeUsd: scored.maxSafeSizeUsd,
    bestRoute: scored.bestRoute,
    routeDiversity: scored.routeDiversity,
    liquidityDepthUsd: asset.liquidityUsd,
    volumeSupport: scored.volumeSupport,
    stress,
    alternative,
    complianceStatus: createComplianceStatus(asset),
    aiMemo: createMemo({
      asset,
      amountUsd: input.amountUsd,
      estimatedSlippagePct: scored.estimatedSlippagePct,
      maxSafeSizeUsd: scored.maxSafeSizeUsd,
      exitScore: scored.exitScore,
      verdict: gradeToVerdict(scored.exitScore),
      routeDiversity: scored.routeDiversity,
      volumeSupport: scored.volumeSupport,
      stress,
      riskProfile: input.riskProfile,
    }),
  };
}

export function scoreExitRisk({
  asset,
  amountUsd,
  riskProfile,
}: {
  asset: ExitAsset;
  amountUsd: number;
  riskProfile: string;
}): ExitScore {
  const normalizedProfile = normalizeRiskProfile(riskProfile);
  const result = runExitCheckForAsset(asset, {
    assetId: asset.id,
    amountUsd,
    riskProfile: normalizedProfile,
    timeHorizonDays: 7,
    mode: "demo",
  });

  const numericScore = gradeToNumericScore(result.exitScore);

  return {
    value: numericScore,
    label: labelForGrade(result.exitScore),
    grade: result.exitScore,
    verdict: result.verdict,
    estimatedSlippagePct: result.estimatedSlippagePct,
    maxSafeSizeUsd: result.maxSafeSizeUsd,
    notes: [
      `${asset.name} is ${result.exitScore} at $${amountUsd.toLocaleString("en-US")}.`,
      `Max safe size for ${normalizedProfile} risk is $${result.maxSafeSizeUsd.toLocaleString("en-US")}.`,
    ],
  };
}

export function createPositionSizeCurve(
  asset: ExitAsset,
  amountUsd: number,
  riskProfile: RiskProfile = "balanced",
) {
  const sizes = [
    1000,
    Math.max(5000, Math.round(amountUsd * 0.25)),
    Math.max(10000, Math.round(amountUsd * 0.5)),
    amountUsd,
    50000,
  ];

  return [...new Set(sizes)]
    .sort((a, b) => a - b)
    .map((size) => {
      const result = runExitCheckForAsset(asset, {
        assetId: asset.id,
        amountUsd: size,
        riskProfile,
        timeHorizonDays: 7,
        mode: "demo",
      });

      return {
        amountUsd: size,
        score: gradeToNumericScore(result.exitScore),
        grade: result.exitScore,
        slippagePct: result.estimatedSlippagePct,
      };
    });
}

function scoreLiquidityDepth(amountUsd: number, liquidityUsd: number) {
  const liquidityShare = liquidityUsd > 0 ? amountUsd / liquidityUsd : Number.POSITIVE_INFINITY;

  if (liquidityShare <= 0.01) return 100;
  if (liquidityShare <= 0.05) return 85;
  if (liquidityShare <= 0.1) return 68;
  if (liquidityShare <= 0.25) return 42;
  return 15;
}

function scoreConcentrationRisk(amountUsd: number, liquidityUsd: number) {
  const liquidityShare = liquidityUsd > 0 ? amountUsd / liquidityUsd : Number.POSITIVE_INFINITY;

  if (liquidityShare <= 0.01) return 100;
  if (liquidityShare <= 0.05) return 82;
  if (liquidityShare <= 0.15) return 55;
  if (liquidityShare <= 0.3) return 25;
  return 8;
}

function scoreAssetSnapshot(
  asset: ExitAsset,
  input: ExitCheckInput,
  stressResilienceScore: number,
) {
  const estimatedSlippagePct = estimateSlippage(input.amountUsd, asset.liquidityUsd);
  const slippageScore = scoreSlippage(estimatedSlippagePct, input.riskProfile);
  const liquidityDepthScore = scoreLiquidityDepth(input.amountUsd, asset.liquidityUsd);
  const route = scoreRouteDiversity(asset.routes);
  const volume = scoreVolumeSupport(input.amountUsd, asset.dailyVolumeUsd);
  const concentrationScore = scoreConcentrationRisk(input.amountUsd, asset.liquidityUsd);
  // Weights are front-loaded on what an exit actually costs (slippage 35%) and whether
  // the market can absorb it (liquidity depth 20%), 55% combined on observed signals.
  // Route diversity and volume support (15% each) capture exit resilience over time.
  // Stress resilience is 10% because it is a scenario projection, not a current reading.
  // Concentration risk is capped at 5% to avoid double-counting depth and slippage.
  // See README "Scoring Methodology" for the full rationale and calibration note.
  const weightedScore =
    slippageScore * 0.35 +
    liquidityDepthScore * 0.2 +
    route.score * 0.15 +
    volume.score * 0.15 +
    stressResilienceScore * 0.1 +
    concentrationScore * 0.05;
  const exitScore = toGrade(weightedScore);

  return {
    exitScore,
    estimatedSlippagePct,
    maxSafeSizeUsd: calculateMaxSafeSize(asset.liquidityUsd, input.riskProfile),
    bestRoute: asset.route[0] ?? "No route available",
    routeDiversity: route.routeDiversity,
    volumeSupport: volume.volumeSupport,
  };
}

function scoreStressResilience(stress: ExitStressResult) {
  return Math.min(
    gradeToNumericScore(stress.liquidityDown20.exitScore),
    gradeToNumericScore(stress.liquidityDown50.exitScore),
    gradeToNumericScore(stress.bestRouteUnavailable.exitScore),
  );
}

function calculateMaxSafeSize(liquidityUsd: number, riskProfile: RiskProfile) {
  const threshold = safeSlippageThresholds[riskProfile] / 100;
  return Math.floor((threshold * liquidityUsd) / (1 - threshold));
}

function createAlternative(
  input: ExitCheckInput,
  asset: ExitAsset,
  scored: ReturnType<typeof scoreAssetSnapshot>,
): ExitAlternative {
  const betterAsset = findBetterAssetAlternative(input, asset, scored);

  if (betterAsset) {
    return betterAsset;
  }

  if (input.amountUsd <= scored.maxSafeSizeUsd) {
    return {
      maxSafeSizeUsd: scored.maxSafeSizeUsd,
      recommendedSizeUsd: input.amountUsd,
      message: "Requested size is inside the selected slippage threshold.",
    };
  }

  return {
    maxSafeSizeUsd: scored.maxSafeSizeUsd,
    recommendedSizeUsd: scored.maxSafeSizeUsd,
    message: `Reduce ${asset.symbol} size to about $${scored.maxSafeSizeUsd.toLocaleString(
      "en-US",
    )} or split the exit across more routes.`,
  };
}

function findBetterAssetAlternative(
  input: ExitCheckInput,
  currentAsset: ExitAsset,
  currentScore: ReturnType<typeof scoreAssetSnapshot>,
): ExitAlternative | undefined {
  if (!["C", "D", "F"].includes(currentScore.exitScore)) {
    return undefined;
  }

  const candidates = demoAssets
    .filter((asset) => asset.id !== currentAsset.id)
    .map((asset) => ({
      asset,
      scored: scoreAssetSnapshot(asset, input, 100),
    }))
    .filter(
      (candidate) =>
        gradeRank(candidate.scored.exitScore) > gradeRank(currentScore.exitScore) &&
        candidate.scored.maxSafeSizeUsd > currentScore.maxSafeSizeUsd,
    )
    .sort((a, b) => {
      const gradeDelta = gradeRank(b.scored.exitScore) - gradeRank(a.scored.exitScore);

      if (gradeDelta !== 0) {
        return gradeDelta;
      }

      return b.scored.maxSafeSizeUsd - a.scored.maxSafeSizeUsd;
    });

  const best = candidates[0];

  if (!best) {
    return undefined;
  }

  return {
    asset: best.asset.name,
    reason: "Better route depth and lower exit slippage at the same size",
    exitScore: best.scored.exitScore,
    maxSafeSizeUsd: best.scored.maxSafeSizeUsd,
    recommendedSizeUsd: best.scored.maxSafeSizeUsd,
    message: `${best.asset.name} has ${articleForGrade(
      best.scored.exitScore,
    )} ${best.scored.exitScore} exit score at $${input.amountUsd.toLocaleString(
      "en-US",
    )}, with a max safe size near $${best.scored.maxSafeSizeUsd.toLocaleString("en-US")}.`,
  };
}

function articleForGrade(exitScore: ExitGrade) {
  return exitScore === "A" || exitScore === "F" ? "an" : "a";
}

function createMemo({
  asset,
  amountUsd,
  estimatedSlippagePct,
  maxSafeSizeUsd,
  exitScore,
  verdict,
  routeDiversity,
  volumeSupport,
  stress,
  riskProfile,
}: {
  asset: ExitAsset;
  amountUsd: number;
  estimatedSlippagePct: number;
  maxSafeSizeUsd: number;
  exitScore: ExitGrade;
  verdict: ExitVerdict;
  routeDiversity: RouteDiversity;
  volumeSupport: VolumeSupport;
  stress: ExitStressResult;
  riskProfile: RiskProfile;
}) {
  const sizePhrase =
    amountUsd <= maxSafeSizeUsd
      ? "inside the safe-size threshold"
      : "above the safe-size threshold";

  return `${asset.name} scores ${exitScore} with a ${verdict.replaceAll(
    "_",
    " ",
  )} verdict. At $${amountUsd.toLocaleString("en-US")}, estimated exit slippage is ${estimatedSlippagePct}% and the position is ${sizePhrase} for a ${riskProfile} profile. Route diversity is ${routeDiversity}, volume support is ${volumeSupport}, and stress grades are ${stress.liquidityDown20.exitScore} for 20% lower liquidity, ${stress.liquidityDown50.exitScore} for 50% lower liquidity, and ${stress.bestRouteUnavailable.exitScore} if the best route is unavailable.`;
}

function normalizeRiskProfile(riskProfile: string): RiskProfile {
  const normalized = riskProfile.toLowerCase();

  if (normalized === "conservative" || normalized === "aggressive") {
    return normalized;
  }

  return "balanced";
}

function gradeToNumericScore(grade: ExitGrade) {
  const scores: Record<ExitGrade, number> = {
    A: 92,
    B: 76,
    C: 61,
    D: 45,
    F: 22,
  };

  return scores[grade];
}

function gradeRank(grade: ExitGrade) {
  const ranks: Record<ExitGrade, number> = {
    A: 5,
    B: 4,
    C: 3,
    D: 2,
    F: 1,
  };

  return ranks[grade];
}

function labelForGrade(grade: ExitGrade): ExitScore["label"] {
  if (grade === "A") return "Safe";
  if (grade === "B") return "Watch";
  if (grade === "C") return "Crowded";
  return "Blocked";
}

function roundPct(value: number) {
  return Math.round(value * 100) / 100;
}

export const sizeSensitivityDemo = {
  small: runExitCheck({
    assetId: "meth",
    amountUsd: 1000,
    riskProfile: "balanced",
    timeHorizonDays: 7,
    mode: "demo",
  }),
  large: runExitCheck({
    assetId: "meth",
    amountUsd: 50000,
    riskProfile: "balanced",
    timeHorizonDays: 7,
    mode: "demo",
  }),
};

// Keep this file self-documenting for quick console checks during demos.
export const demoExitChecks = demoAssets.flatMap((asset) => [
  runExitCheck({
    assetId: asset.id,
    amountUsd: 1000,
    riskProfile: "balanced",
    timeHorizonDays: 7,
    mode: "demo",
  }),
  runExitCheck({
    assetId: asset.id,
    amountUsd: 50000,
    riskProfile: "balanced",
    timeHorizonDays: 7,
    mode: "demo",
  }),
]);
