import { generateAIMemo, type AIMemoSource } from "@/lib/ai";
import type { ExitCheckResult } from "@/lib/scoring";

export type AIMemoResult = {
  memo: string;
  source: AIMemoSource;
  reason?: string;
};

const defaultAiApiUrl = "https://api.deepseek.com/chat/completions";
const defaultAiModel = "deepseek-v4-flash";

export async function generateRiskMemo(result: ExitCheckResult): Promise<AIMemoResult> {
  const fallbackMemo = generateAIMemo(result);
  const apiKey = process.env.AI_API_KEY;

  if (!apiKey) {
    return {
      memo: fallbackMemo,
      source: "deterministic",
      reason: "AI_API_KEY is not configured.",
    };
  }

  try {
    const response = await fetch(process.env.AI_API_BASE_URL ?? defaultAiApiUrl, {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.AI_MODEL ?? defaultAiModel,
        thinking: {
          type: "disabled",
        },
        temperature: 0.2,
        max_tokens: 220,
        messages: [
          {
            role: "system",
            content:
              "You are ExitIQ, an exit-risk analyst. Write concise risk memos using only the provided calculated facts. Do not invent numbers, pool names, APY, liquidity, routes, scores, or transaction details.",
          },
          {
            role: "user",
            content: buildMemoPrompt(result),
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`AI provider returned ${response.status}.`);
    }

    const payload = (await response.json()) as ChatCompletionResponse;
    const memo = payload.choices?.[0]?.message?.content?.trim();

    if (!memo) {
      throw new Error("AI provider returned an empty memo.");
    }

    return {
      memo,
      source: "llm",
    };
  } catch (error) {
    return {
      memo: fallbackMemo,
      source: "deterministic",
      reason: error instanceof Error ? error.message : "AI provider failed.",
    };
  }
}

function buildMemoPrompt(result: ExitCheckResult) {
  const facts = {
    asset: result.asset.name,
    symbol: result.asset.symbol,
    amountUsd: result.amountUsd,
    exitScore: result.exitScore,
    verdict: result.verdict,
    estimatedSlippagePct: result.estimatedSlippagePct,
    maxSafeSizeUsd: result.maxSafeSizeUsd,
    liquidityDepthUsd: result.liquidityDepthUsd,
    routeDiversity: result.routeDiversity,
    volumeSupport: result.volumeSupport,
    bestRoute: result.bestRoute,
    stress: {
      liquidityDown20: result.stress.liquidityDown20,
      liquidityDown50: result.stress.liquidityDown50,
      bestRouteUnavailable: result.stress.bestRouteUnavailable,
    },
    alternative: result.alternative,
  };

  return `Write one short ExitIQ memo. Include a verdict, the reason for the score, whether to enter/reduce/wait/avoid, a safer alternative if present, and one monitoring trigger. Use only these calculated facts:\n${JSON.stringify(
    facts,
    null,
    2,
  )}`;
}

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};
