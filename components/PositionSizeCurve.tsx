import type { ExitAsset } from "@/lib/assets";
import { ScoreBadge } from "@/components/ScoreBadge";
import { type ExitCheckResult, type RiskProfile, runExitCheckForAsset } from "@/lib/scoring";

type PositionSizeCurveProps = {
  asset: ExitAsset;
  riskProfile?: RiskProfile;
  activeAmountUsd?: number;
};

export function PositionSizeCurve({
  asset,
  riskProfile = "balanced",
  activeAmountUsd,
}: PositionSizeCurveProps) {
  const rows = [1000, 10000, 50000, 100000].map((amountUsd) =>
    runExitCheckForAsset(asset, {
      assetId: asset.id,
      amountUsd,
      riskProfile,
      timeHorizonDays: 7,
      mode: asset.type === "live-pool" ? "live" : "demo",
    }),
  );
  const smallSize = rows[0];
  const largeSize = rows.find((row) => row.amountUsd === 50000) ?? rows[rows.length - 1];

  return (
    <section className="min-w-0 rounded-xl border border-[var(--line)] bg-[var(--card)] p-5 shadow-[var(--shadow)]">
      <div>
        <h2 className="text-lg font-semibold">How size changes exit risk</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
          ExitIQ reruns the same scoring engine across standard position sizes.
        </p>
      </div>

      <div className="mt-5 overflow-x-auto rounded-xl border border-[var(--line)]">
        <table className="w-full min-w-[620px] border-collapse text-left text-sm">
          <thead className="bg-[var(--surface)]">
            <tr>
              <th className="px-3 py-3 data-label">Amount</th>
              <th className="px-3 py-3 data-label">Exit score</th>
              <th className="px-3 py-3 data-label">Estimated slippage</th>
              <th className="px-3 py-3 data-label">Verdict</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const isActive = activeAmountUsd === row.amountUsd;

              return (
                <tr
                  key={row.amountUsd}
                  className={`border-t border-[var(--line)] border-l-4 ${gradeBorderClass(row.exitScore)} ${
                    isActive ? "bg-[var(--accent)] text-white" : "bg-[var(--card)]"
                  }`}
                >
                  <td className="px-3 py-3 font-semibold">${row.amountUsd.toLocaleString("en-US")}</td>
                  <td className="px-3 py-3">
                    <ScoreBadge grade={row.exitScore} />
                  </td>
                  <td className={`px-3 py-3 ${isActive ? "text-white/80" : "text-[var(--muted)]"}`}>
                    {row.estimatedSlippagePct}%
                  </td>
                  <td className="px-3 py-3 font-semibold capitalize">{formatVerdict(row.verdict)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-4 rounded-lg border border-[var(--line)] bg-[var(--surface)] p-3 text-sm leading-6 text-[var(--muted)]">
        {asset.name} scores {smallSize.exitScore} at ${smallSize.amountUsd.toLocaleString("en-US")} and{" "}
        {largeSize.exitScore} at ${largeSize.amountUsd.toLocaleString("en-US")}. Position size is the primary risk variable.
      </p>
    </section>
  );
}

function gradeBorderClass(grade: ExitCheckResult["exitScore"]) {
  if (grade === "A" || grade === "B") {
    return "border-l-[var(--success)]";
  }

  if (grade === "C" || grade === "D") {
    return "border-l-[var(--warning)]";
  }

  return "border-l-[var(--danger)]";
}

function formatVerdict(verdict: ExitCheckResult["verdict"]) {
  return verdict.replaceAll("_", " ");
}
