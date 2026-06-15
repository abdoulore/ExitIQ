import type { ExitMode, RiskProfile } from "@/lib/scoring";

export type ExitReviewState = {
  assetId: string;
  amountUsd: number;
  riskProfile: RiskProfile;
  mode: ExitMode;
};

export const defaultReviewState: ExitReviewState = {
  assetId: "meth",
  amountUsd: 1000,
  riskProfile: "balanced",
  mode: "demo",
};

export function createReviewHref(path: string, state: ExitReviewState) {
  const params = new URLSearchParams({
    assetId: state.assetId,
    amountUsd: String(state.amountUsd),
    riskProfile: state.riskProfile,
    mode: state.mode,
  });

  return `${path}?${params.toString()}`;
}

export function parseReviewState(
  searchParams: Record<string, string | string[] | undefined> | undefined,
): ExitReviewState {
  const assetId = singleValue(searchParams?.assetId) ?? defaultReviewState.assetId;
  const amountParam = Number(singleValue(searchParams?.amountUsd));
  const riskProfile = normalizeRiskProfile(singleValue(searchParams?.riskProfile));
  const mode = normalizeMode(singleValue(searchParams?.mode));

  return {
    assetId,
    amountUsd: Number.isFinite(amountParam) && amountParam > 0 ? amountParam : defaultReviewState.amountUsd,
    riskProfile,
    mode,
  };
}

function singleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeRiskProfile(value: string | undefined): RiskProfile {
  if (value === "conservative" || value === "aggressive") {
    return value;
  }

  return "balanced";
}

function normalizeMode(value: string | undefined): ExitMode {
  return value === "live" ? "live" : "demo";
}
