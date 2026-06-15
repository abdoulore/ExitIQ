import type { ExitAsset } from "@/lib/assets";
import type { ExitCheckInput, ExitGrade } from "@/lib/scoring";

export type StressScenarioResult = {
  exitScore: ExitGrade;
  liquidityUsd: number;
  routes: number;
  estimatedSlippagePct: number;
};

export type ExitStressResult = {
  liquidityDown20: StressScenarioResult;
  liquidityDown50: StressScenarioResult;
  bestRouteUnavailable: StressScenarioResult;
};

type StressScoreRunner = (
  asset: ExitAsset,
  input: ExitCheckInput,
) => Pick<StressScenarioResult, "exitScore" | "estimatedSlippagePct">;

export function runStressTests(
  asset: ExitAsset,
  input: ExitCheckInput,
  scoreScenario: StressScoreRunner,
): ExitStressResult {
  const liquidityDown20Asset = {
    ...asset,
    liquidityUsd: asset.liquidityUsd * 0.8,
  };
  const liquidityDown50Asset = {
    ...asset,
    liquidityUsd: asset.liquidityUsd * 0.5,
  };
  const bestRouteUnavailableAsset = {
    ...asset,
    liquidityUsd: asset.liquidityUsd * 0.6,
    routes: Math.max(1, asset.routes - 1),
    route: asset.route.length > 1 ? asset.route.slice(1) : asset.route,
  };

  return {
    liquidityDown20: runScenario(liquidityDown20Asset, input, scoreScenario),
    liquidityDown50: runScenario(liquidityDown50Asset, input, scoreScenario),
    bestRouteUnavailable: runScenario(bestRouteUnavailableAsset, input, scoreScenario),
  };
}

function runScenario(
  asset: ExitAsset,
  input: ExitCheckInput,
  scoreScenario: StressScoreRunner,
): StressScenarioResult {
  const result = scoreScenario(asset, input);

  return {
    exitScore: result.exitScore,
    estimatedSlippagePct: result.estimatedSlippagePct,
    liquidityUsd: asset.liquidityUsd,
    routes: asset.routes,
  };
}
