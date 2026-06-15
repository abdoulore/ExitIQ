import type { ExitAsset } from "@/lib/assets";
import type { ExitCheckResult, ExitGrade, ExitVerdict } from "@/lib/scoring";

type TimelineStatus = "completed" | "warning" | "blocked" | "pending";

type TimelineStep = {
  label: string;
  status: TimelineStatus;
  detail: string;
};

export function AgentWorkflowTimeline({
  result,
  reportHashSaved = false,
}: {
  result: ExitCheckResult;
  reportHashSaved?: boolean;
}) {
  const steps = createWorkflowSteps(result, reportHashSaved);

  return (
    <section className="rounded-xl border border-[var(--line)] bg-[var(--card)] p-5 shadow-[var(--shadow)]">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="data-label">Agent workflow</p>
          <h2 className="mt-2 text-xl font-semibold">Decision timeline</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            ExitIQ turns an opportunity into an agent-ready decision path before entry.
          </p>
        </div>
        <span className="inline-flex h-8 w-fit items-center rounded-full border border-[var(--line)] bg-[var(--surface)] px-3 text-xs font-semibold text-[var(--muted)]">
          RWA/yield guardrail
        </span>
      </div>

      <div className="mt-5 grid gap-3">
        {steps.map((step, index) => (
          <div
            key={step.label}
            className="grid gap-3 rounded-lg border border-[var(--line)] bg-[var(--surface)] p-3 sm:grid-cols-[32px_minmax(0,1fr)_110px] sm:items-start"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--card)] text-sm font-semibold">
              {index + 1}
            </div>
            <div>
              <p className="text-sm font-semibold">{step.label}</p>
              <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{step.detail}</p>
            </div>
            <span
              className={`inline-flex h-7 w-fit items-center justify-center rounded-full border px-2 text-xs font-semibold capitalize sm:w-full ${statusClass(
                step.status,
              )}`}
            >
              {step.status}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function createWorkflowSteps(result: ExitCheckResult, reportHashSaved: boolean): TimelineStep[] {
  return [
    {
      label: "Opportunity detected",
      status: "completed",
      detail: `${result.asset.name} was selected for a $${result.amountUsd.toLocaleString(
        "en-US",
      )} pre-entry check.`,
    },
    {
      label: "Exit risk checked",
      status: exitRiskStatus(result.exitScore),
      detail: `Exit score is ${result.exitScore}, with ${result.estimatedSlippagePct}% estimated slippage. Verdict: ${result.verdict.replaceAll(
        "_",
        " ",
      )}.`,
    },
    {
      label: "Compliance awareness checked",
      status: complianceStatus(result.asset),
      detail:
        result.asset.assetClass === "rwa" && hasUnknownCompliance(result.asset)
          ? "RWA compliance fields include unknown values. Issuer rules, KYC/AML, jurisdiction, and investor eligibility need review."
          : `Asset class is ${result.asset.assetClass.replaceAll(
              "-",
              " ",
            )}; ExitIQ has surfaced the configured awareness fields.`,
    },
    {
      label: "Alternatives compared",
      status: alternativeStatus(result),
      detail: result.alternative.asset
        ? `${result.alternative.asset} was identified as a safer comparison route at the same size.`
        : result.amountUsd > result.maxSafeSizeUsd
          ? `No stronger route was selected; reduce near $${result.alternative.recommendedSizeUsd.toLocaleString(
              "en-US",
            )}.`
          : "No stronger alternative needed at the requested size.",
    },
    {
      label: "Agent decision made",
      status: agentDecisionStatus(result.verdict),
      detail: `Agent-facing decision is ${result.verdict.replaceAll("_", " ")} for this amount and risk profile.`,
    },
    {
      label: "Report hash saved on Mantle",
      status: reportHashSaved ? "completed" : "pending",
      detail: reportHashSaved
        ? "The report hash has a recorded Mantle transaction hash."
        : "The report can be saved to the Mantle registry after wallet confirmation.",
    },
  ];
}

function exitRiskStatus(exitScore: ExitGrade): TimelineStatus {
  if (exitScore === "A" || exitScore === "B") {
    return "completed";
  }

  if (exitScore === "C") {
    return "warning";
  }

  return "blocked";
}

function complianceStatus(asset: ExitAsset): TimelineStatus {
  if (asset.assetClass === "rwa" && hasUnknownCompliance(asset)) {
    return "warning";
  }

  return "completed";
}

function alternativeStatus(result: ExitCheckResult): TimelineStatus {
  if (result.alternative.asset || result.amountUsd <= result.maxSafeSizeUsd) {
    return "completed";
  }

  if (result.verdict === "avoid") {
    return "blocked";
  }

  return "warning";
}

function agentDecisionStatus(verdict: ExitVerdict): TimelineStatus {
  if (verdict === "enter" || verdict === "enter_with_monitoring") {
    return "completed";
  }

  if (verdict === "reduce_size") {
    return "warning";
  }

  return "blocked";
}

function hasUnknownCompliance(asset: ExitAsset) {
  return (
    asset.kycRequirement === "unknown" ||
    asset.jurisdictionRestriction === "unknown" ||
    asset.accreditedInvestorRequired === "unknown"
  );
}

function statusClass(status: TimelineStatus) {
  if (status === "completed") {
    return "border-[var(--success-line)] bg-[var(--success-bg)] text-[var(--success)]";
  }

  if (status === "warning") {
    return "border-[var(--warning-line)] bg-[var(--warning-bg)] text-[var(--warning)]";
  }

  if (status === "blocked") {
    return "border-[var(--danger-line)] bg-[var(--danger-bg)] text-[var(--danger)]";
  }

  return "border-[var(--line)] bg-[var(--card)] text-[var(--muted)]";
}
