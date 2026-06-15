import { defaultMantleLivePoolLimit, fetchMantlePools } from "@/lib/dex/mantleLive";
import {
  runExitCheck,
  runExitCheckForAsset,
  type ExitCheckInput,
  type ExitMode,
  type RiskProfile,
} from "@/lib/scoring";

const riskProfiles: RiskProfile[] = ["conservative", "balanced", "aggressive"];
const modes: ExitMode[] = ["demo", "live"];

export async function POST(request: Request) {
  try {
    const input = parseExitCheckInput(await request.json());
    const result = await runExitCheckWithMode(input);

    return Response.json(result);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Invalid exit-check request." },
      { status: 400 },
    );
  }
}

async function runExitCheckWithMode(input: ExitCheckInput) {
  if (input.mode !== "live") {
    return runExitCheck(input);
  }

  const connector = await fetchMantlePools({
    assetId: input.assetId,
    limit: defaultMantleLivePoolLimit,
  });

  if (!connector.supported) {
    return runExitCheckForAsset(connector.fallbackAssetData, {
      ...input,
      assetId: connector.fallbackAssetData.id,
      mode: "demo",
    });
  }

  return runExitCheckForAsset(connector.liveAssetData, {
    ...input,
    assetId: connector.liveAssetData.id,
  });
}

function parseExitCheckInput(body: unknown): ExitCheckInput {
  if (!body || typeof body !== "object") {
    throw new Error("Request body must be an object.");
  }

  const input = body as Partial<ExitCheckInput>;

  if (!input.assetId || typeof input.assetId !== "string") {
    throw new Error("assetId is required.");
  }

  if (typeof input.amountUsd !== "number" || !Number.isFinite(input.amountUsd) || input.amountUsd <= 0) {
    throw new Error("amountUsd must be a positive number.");
  }

  if (!input.riskProfile || !riskProfiles.includes(input.riskProfile)) {
    throw new Error("riskProfile must be conservative, balanced, or aggressive.");
  }

  if (
    typeof input.timeHorizonDays !== "number" ||
    !Number.isFinite(input.timeHorizonDays) ||
    input.timeHorizonDays <= 0
  ) {
    throw new Error("timeHorizonDays must be a positive number.");
  }

  if (!input.mode || !modes.includes(input.mode)) {
    throw new Error("mode must be demo or live.");
  }

  return {
    assetId: input.assetId,
    amountUsd: input.amountUsd,
    riskProfile: input.riskProfile,
    timeHorizonDays: input.timeHorizonDays,
    mode: input.mode,
  };
}
