import { getAssetById } from "@/lib/assets";
import { defaultMantleLivePoolLimit, fetchMantlePools } from "@/lib/dex/mantleLive";
import { defaultReviewState, type ExitReviewState } from "@/lib/review-state";
import { runExitCheckForAsset } from "@/lib/scoring";

export async function runReviewCheck(state: ExitReviewState) {
  if (state.mode === "live") {
    const connector = await fetchMantlePools({
      assetId: state.assetId,
      limit: defaultMantleLivePoolLimit,
    });

    if (connector.supported) {
      return runExitCheckForAsset(connector.liveAssetData, {
        assetId: connector.liveAssetData.id,
        amountUsd: state.amountUsd,
        riskProfile: state.riskProfile,
        timeHorizonDays: 7,
        mode: "live",
      });
    }
  }

  const asset = getAssetById(state.assetId) ?? getAssetById(defaultReviewState.assetId);

  if (!asset) {
    throw new Error("Default review asset is not configured.");
  }

  return runExitCheckForAsset(asset, {
    assetId: asset.id,
    amountUsd: state.amountUsd,
    riskProfile: state.riskProfile,
    timeHorizonDays: 7,
    mode: "demo",
  });
}
