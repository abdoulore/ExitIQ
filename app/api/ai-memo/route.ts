import { NextResponse } from "next/server";
import { generateRiskMemo } from "@/lib/server/aiMemo";
import type { ExitCheckResult } from "@/lib/scoring";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { result?: ExitCheckResult };

    if (!isExitCheckResult(body.result)) {
      return NextResponse.json({ error: "ExitCheckResult is required." }, { status: 400 });
    }

    const memo = await generateRiskMemo(body.result);

    return NextResponse.json(memo);
  } catch {
    return NextResponse.json({ error: "Unable to generate AI memo." }, { status: 500 });
  }
}

function isExitCheckResult(result: ExitCheckResult | undefined): result is ExitCheckResult {
  return Boolean(
    result?.asset?.name &&
      result.asset.symbol &&
      Number.isFinite(result.amountUsd) &&
      result.exitScore &&
      result.verdict &&
      Number.isFinite(result.estimatedSlippagePct) &&
      Number.isFinite(result.maxSafeSizeUsd),
  );
}
