import type { ExitGrade } from "@/lib/scoring";
import type { ExitStressResult, StressScenarioResult } from "@/lib/stress";
import { ScoreBadge } from "@/components/ScoreBadge";

type StressTestPanelProps = {
  stress: ExitStressResult;
};

export function StressTestPanel({ stress }: StressTestPanelProps) {
  const tests = [
    {
      name: "Liquidity drops 20%",
      result: stress.liquidityDown20,
      summary: "Available liquidity is reduced by 20% and the same exit size is checked again.",
    },
    {
      name: "Liquidity drops 50%",
      result: stress.liquidityDown50,
      summary: "Available liquidity is cut in half to model a thinner market during stress.",
    },
    {
      name: "Best route unavailable",
      result: stress.bestRouteUnavailable,
      summary: "Available liquidity is reduced by 40% and route count drops by one, with a minimum of one route.",
    },
  ];

  return (
    <section className="grid gap-3">
      {tests.map((test) => (
        <div
          key={test.name}
          className={`rounded-xl border border-[var(--line)] border-l-4 bg-[var(--card)] p-4 shadow-sm ${gradeBorderClass(
            test.result.exitScore,
          )}`}
        >
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_180px] sm:items-start">
            <div className="min-w-0">
              <p className="text-sm font-semibold">{test.name}</p>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{test.summary}</p>
            </div>
            <div className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="data-label">New score</p>
                <ScoreBadge grade={test.result.exitScore} size="sm" />
              </div>
              <p className="mt-3 text-xs leading-5 text-[var(--muted)]">
                Liquidity ${formatUsd(test.result.liquidityUsd)}
              </p>
              <p className="text-xs leading-5 text-[var(--muted)]">
                {test.result.estimatedSlippagePct}% slippage | {test.result.routes} route
                {test.result.routes === 1 ? "" : "s"}
              </p>
            </div>
          </div>
        </div>
      ))}
    </section>
  );
}

function gradeBorderClass(grade: ExitGrade) {
  if (grade === "A" || grade === "B") {
    return "border-l-[var(--success)]";
  }

  if (grade === "C" || grade === "D") {
    return "border-l-[var(--warning)]";
  }

  return "border-l-[var(--danger)]";
}

function formatUsd(value: StressScenarioResult["liquidityUsd"]) {
  return value.toLocaleString("en-US", {
    maximumFractionDigits: 0,
  });
}
