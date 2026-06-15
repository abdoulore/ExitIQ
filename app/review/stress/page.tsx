import { AppHeader } from "@/components/AppHeader";
import { ExitScoreCard } from "@/components/ExitScoreCard";
import { PositionSizeCurve } from "@/components/PositionSizeCurve";
import { ReviewNav } from "@/components/ReviewNav";
import { ReviewScoreSummary } from "@/components/ReviewScoreSummary";
import { StressTestPanel } from "@/components/StressTestPanel";
import { parseReviewState } from "@/lib/review-state";
import { runReviewCheck } from "@/lib/server/reviewCheck";

type ReviewPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function StressReviewPage({ searchParams }: ReviewPageProps) {
  const state = parseReviewState(await searchParams);
  const result = await runReviewCheck(state);

  return (
    <main className="min-h-[100dvh] bg-[var(--background)] px-4 pb-10 text-[var(--foreground)] sm:px-5">
      <div className="mx-auto max-w-6xl">
        <AppHeader
          active="check"
          eyebrow="Focused review"
          title="Score and stress review"
          description="Full exit score breakdown, position-size curve, and stress scenarios for the selected check."
        />

        <ReviewScoreSummary result={result} state={state} />
        <ReviewNav state={state} active="stress" />

        <section className="mt-5 grid min-w-0 gap-5">
          <ExitScoreCard result={result} />
          <PositionSizeCurve
            asset={result.asset}
            riskProfile={state.riskProfile}
            activeAmountUsd={state.amountUsd}
          />
          <StressTestPanel stress={result.stress} />
        </section>
      </div>
    </main>
  );
}
