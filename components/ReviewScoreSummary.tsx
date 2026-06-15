import Link from "next/link";
import { ScoreBadge } from "@/components/ScoreBadge";
import { createReviewHref, type ExitReviewState } from "@/lib/review-state";
import type { ExitCheckResult } from "@/lib/scoring";

type ReviewScoreSummaryProps = {
  result: ExitCheckResult;
  state: ExitReviewState;
};

export function ReviewScoreSummary({ result, state }: ReviewScoreSummaryProps) {
  return (
    <section className="mt-5 rounded-xl border border-[var(--line)] bg-[var(--card)] px-5 py-3 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <ScoreBadge grade={result.exitScore} size="sm" />
          <p className="min-w-0 text-sm">
            <span className="font-semibold">{result.asset.name}</span>
            <span className="text-[var(--muted)]">
              {" "}
              | ${result.amountUsd.toLocaleString("en-US")} | {formatVerdict(result.verdict)}
            </span>
          </p>
        </div>
        <Link
          href={createReviewHref("/check/result", state)}
          className="text-sm font-semibold text-[var(--accent)] transition hover:text-[var(--accent-strong)]"
        >
          View full result -&gt;
        </Link>
      </div>
    </section>
  );
}

function formatVerdict(verdict: ExitCheckResult["verdict"]) {
  return verdict.replaceAll("_", " ");
}
