import { ScoreBadge } from "@/components/ScoreBadge";
import type { AgentSimulationResult } from "@/lib/agent";
import type { AgentDecision } from "@/lib/ai";

type AgentDecisionPanelProps = {
  decision?: AgentDecision;
  simulation?: AgentSimulationResult | null;
  isLoading?: boolean;
  error?: string | null;
  onSimulate?: () => void;
};

export function AgentDecisionPanel({
  decision,
  simulation,
  isLoading = false,
  error,
  onSimulate,
}: AgentDecisionPanelProps) {
  return (
    <section className="rounded-xl border border-[var(--line)] bg-[var(--card)] p-5 shadow-[var(--shadow)]">
      <p className="data-label">Agent simulation</p>
      <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Agent decision</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            The simulated agent compares APY against exit quality before choosing a route.
          </p>
        </div>
        {onSimulate ? (
          <button
            type="button"
            onClick={onSimulate}
            disabled={isLoading}
            className="inline-flex h-10 w-full items-center justify-center rounded-full bg-[var(--accent)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--accent-strong)] active:translate-y-px disabled:cursor-wait disabled:opacity-60 sm:w-auto"
          >
            {isLoading ? "Comparing routes..." : "Run Agent Simulation"}
          </button>
        ) : null}
      </div>

      {error ? (
        <p className="mt-4 rounded-md border border-[var(--danger-line)] bg-[var(--danger-bg)] p-3 text-sm font-semibold text-[var(--danger)]">
          {error}
        </p>
      ) : null}

      {isLoading ? (
        <AgentLoadingState />
      ) : simulation ? (
        <AgentSimulationResultView simulation={simulation} />
      ) : decision ? (
        <LegacyDecisionView decision={decision} />
      ) : (
        <AgentEmptyState />
      )}
    </section>
  );
}

function AgentSimulationResultView({ simulation }: { simulation: AgentSimulationResult }) {
  return (
    <div className="mt-5 grid gap-4">
      <div className="rounded-xl border border-[var(--success-line)] bg-[var(--success-bg)] p-4">
        <p className="data-label text-[var(--success)]">Selected route</p>
        <p className="mt-1 text-2xl font-semibold text-[var(--success)]">{simulation.selected}</p>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{simulation.selectedReason}</p>
      </div>

      <div className="rounded-xl border border-[var(--line)] bg-[var(--card)] p-4">
        <p className="text-sm font-semibold">Decision</p>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{simulation.decision}</p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[var(--line)]">
        <table className="w-full min-w-[680px] border-collapse text-left text-xs">
          <thead className="bg-[var(--surface)] text-[var(--muted)]">
            <tr>
              <th className="px-3 py-2 font-semibold">Asset</th>
              <th className="px-3 py-2 font-semibold">APY</th>
              <th className="px-3 py-2 font-semibold">Score</th>
              <th className="px-3 py-2 font-semibold">Safe size</th>
              <th className="px-3 py-2 font-semibold">Stress</th>
            </tr>
          </thead>
          <tbody>
            {simulation.compared.map((item) => (
              <tr key={item.asset} className="border-t border-[var(--line)]">
                <td className="px-3 py-2 font-semibold">{item.asset}</td>
                <td className="px-3 py-2">{item.apy}%</td>
                <td className="px-3 py-2">
                  <ScoreBadge grade={item.exitScore} size="sm" />
                </td>
                <td className="px-3 py-2">${item.maxSafeSizeUsd.toLocaleString("en-US")}</td>
                <td className="px-3 py-2">
                  {item.stressResult.liquidityDown20}/{item.stressResult.liquidityDown50}/
                  {item.stressResult.bestRouteUnavailable}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {simulation.rejected.length > 0 ? (
        <div className="grid gap-2">
          <p className="text-sm font-semibold">Rejected</p>
          {simulation.rejected.map((item) => (
            <div key={item.asset} className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-3">
              <p className="text-sm font-semibold">{item.asset}</p>
              <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{item.reason}</p>
            </div>
          ))}
        </div>
      ) : null}
      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
        Requested amount: ${simulation.amountUsd.toLocaleString("en-US")}
      </p>
    </div>
  );
}

function AgentEmptyState() {
  return (
    <div className="mt-5 rounded-xl border border-dashed border-[var(--line)] bg-[var(--surface)] p-5">
      <p className="text-sm font-semibold">No simulation run yet</p>
      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
        Run the agent simulation to compare APY, exit score, safe size, and stress results.
      </p>
    </div>
  );
}

function AgentLoadingState() {
  return (
    <div className="mt-5 grid gap-3">
      <div className="h-20 animate-pulse rounded-xl bg-[var(--surface)]" />
      <div className="grid gap-2">
        <div className="h-9 animate-pulse rounded-lg bg-[var(--surface)]" />
        <div className="h-9 animate-pulse rounded-lg bg-[var(--surface)]" />
        <div className="h-9 animate-pulse rounded-lg bg-[var(--surface)]" />
      </div>
    </div>
  );
}

function LegacyDecisionView({ decision }: { decision: AgentDecision }) {
  return (
    <div className="mt-5 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4">
      <p className="data-label">Decision</p>
      <p className="mt-1 text-xl font-semibold capitalize">{decision.action}</p>
      <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{decision.reason}</p>
      <p className="mt-2 text-sm font-semibold">{decision.requiredNextStep}</p>
    </div>
  );
}
