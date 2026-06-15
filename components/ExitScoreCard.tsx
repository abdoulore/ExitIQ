import { ScoreBadge } from "@/components/ScoreBadge";
import type { ExitCheckResult } from "@/lib/scoring";

type ExitScoreCardProps = {
  result: ExitCheckResult;
};

export function ExitScoreCard({ result }: ExitScoreCardProps) {
  const { asset } = result;

  return (
    <section className="min-w-0 rounded-xl border border-[var(--line)] bg-[var(--card)] p-5 shadow-[var(--shadow)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="data-label">Measured exit conditions</p>
          <h2 className="mt-2 truncate text-xl font-semibold">{asset.name}</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            ExitIQ evaluates this position against available liquidity, observed volume, route coverage, and stress resilience.
          </p>
        </div>
        <ScoreBadge grade={result.exitScore} size="lg" />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <Metric label="Estimated slippage" value={`${result.estimatedSlippagePct}%`} />
        <Metric label="Max safe size" value={`$${result.maxSafeSizeUsd.toLocaleString("en-US")}`} />
        <Metric label="Route diversity" value={result.routeDiversity} />
        <Metric label="Volume support" value={result.volumeSupport} />
        <Metric label="Liquidity depth" value={`$${result.liquidityDepthUsd.toLocaleString("en-US")}`} />
        <Metric label="Best route" value={result.bestRoute} />
      </div>

      <p className="mt-4 rounded-lg border border-[var(--line)] bg-[var(--surface)] p-3 text-xs leading-5 text-[var(--muted)]">
        ExitIQ scores this position against liquidity depth, volume support, route diversity, and stress conditions at the $
        {result.amountUsd.toLocaleString("en-US")} size.
      </p>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-3">
      <p className="data-label">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold capitalize">{value}</p>
    </div>
  );
}
