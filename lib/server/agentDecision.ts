import {
  type AgentAction,
  type AgentExitDecision,
  buildDeterministicDecision,
} from "@/lib/agentDecision";
import type { ExitCheckResult } from "@/lib/scoring";

const defaultAiApiUrl = "https://api.deepseek.com/chat/completions";
const defaultAiModel = "deepseek-v4-flash";

const systemPrompt =
  "You are the ExitIQ exit-risk agent. Using ONLY the calculated signals provided, you make the final exit-risk decision for a position: allow, warn, or reject. A deterministic model gives you a baseline action; you may agree with it or override it, but any override MUST be justified strictly from the provided signals. Never invent numbers, pools, APY, liquidity, routes, scores, or transactions. Respond with a single minified JSON object and nothing else.";

/**
 * Live AI decision: the agent ingests the deterministic, auditable signals and
 * produces the governing allow/warn/reject call. Always resolves; any failure
 * falls back to the deterministic baseline so the decision stays reproducible.
 */
export async function generateAgentDecision(result: ExitCheckResult): Promise<AgentExitDecision> {
  const baseline = buildDeterministicDecision(result);
  const apiKey = process.env.AI_API_KEY;

  if (!apiKey) {
    return baseline;
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
        max_tokens: 500,
        response_format: {
          type: "json_object",
        },
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: buildDecisionPrompt(result, baseline.modelBaselineAction),
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`AI provider returned ${response.status}.`);
    }

    const payload = (await response.json()) as ChatCompletionResponse;
    const content = payload.choices?.[0]?.message?.content?.trim();

    if (!content) {
      throw new Error("AI provider returned an empty decision.");
    }

    const parsed = parseDecision(content);

    if (!parsed) {
      throw new Error("AI provider returned an unparseable decision.");
    }

    return finalizeDecision(parsed, baseline);
  } catch (error) {
    console.error("Agent decision LLM call failed, using deterministic baseline.", error);

    return baseline;
  }
}

function buildDecisionPrompt(result: ExitCheckResult, baselineAction: AgentAction) {
  const facts = {
    asset: result.asset.name,
    symbol: result.asset.symbol,
    amountUsd: result.amountUsd,
    modelExitGrade: result.exitScore,
    modelBaselineAction: baselineAction,
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
    compliance: result.complianceStatus,
    alternative: result.alternative,
  };

  return `Decide allow, warn, or reject for this exit. The model baseline action is "${baselineAction}". Return JSON with exactly these fields:
{
  "action": "allow|warn|reject",
  "confidence": <integer 0-100>,
  "headline": "<one sentence>",
  "reasons": ["<reason grounded in the signals>", "..."],
  "requiredAction": "<what must happen next>",
  "monitoringTrigger": "<one measurable trigger to re-check>",
  "narrative": "<2-3 sentence plain-English memo>"
}
Calculated signals:
${JSON.stringify(facts, null, 2)}`;
}

function parseDecision(content: string): RawDecision | null {
  const direct = tryParse(content);

  if (direct) {
    return direct;
  }

  const match = content.match(/\{[\s\S]*\}/);

  return match ? tryParse(match[0]) : null;
}

function tryParse(value: string): RawDecision | null {
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;

    return isAgentAction(parsed.action) ? (parsed as RawDecision) : null;
  } catch {
    return null;
  }
}

function finalizeDecision(parsed: RawDecision, baseline: AgentExitDecision): AgentExitDecision {
  const action = parsed.action;
  const reasons = Array.isArray(parsed.reasons)
    ? parsed.reasons.filter((reason): reason is string => typeof reason === "string" && reason.trim().length > 0)
    : [];

  return {
    action,
    confidence: clampConfidence(parsed.confidence, baseline.confidence),
    headline: textOr(parsed.headline, baseline.headline),
    reasons: reasons.length > 0 ? reasons : baseline.reasons,
    requiredAction: textOr(parsed.requiredAction, baseline.requiredAction),
    monitoringTrigger: textOr(parsed.monitoringTrigger, baseline.monitoringTrigger),
    narrative: textOr(parsed.narrative, baseline.narrative),
    modelBaselineAction: baseline.modelBaselineAction,
    agreesWithBaseline: action === baseline.modelBaselineAction,
    source: "llm",
  };
}

function clampConfidence(value: unknown, fallback: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(100, Math.max(0, Math.round(value)));
}

function textOr(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

function isAgentAction(value: unknown): value is AgentAction {
  return value === "allow" || value === "warn" || value === "reject";
}

type RawDecision = {
  action: AgentAction;
  confidence?: unknown;
  headline?: unknown;
  reasons?: unknown;
  requiredAction?: unknown;
  monitoringTrigger?: unknown;
  narrative?: unknown;
};

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};
