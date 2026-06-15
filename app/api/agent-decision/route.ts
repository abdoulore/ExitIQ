import { NextResponse } from "next/server";
import { generateAgentDecision } from "@/lib/server/agentDecision";
import type { ExitCheckResult } from "@/lib/scoring";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { result?: ExitCheckResult };

    if (!isExitCheckResult(body.result)) {
      return NextResponse.json({ error: "ExitCheckResult is required." }, { status: 400 });
    }

    const decision = await generateAgentDecision(body.result);

    return NextResponse.json({ decision });
  } catch {
    return NextResponse.json({ error: "Unable to generate agent decision." }, { status: 500 });
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
