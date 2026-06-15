import { AgentDecisionPanel } from "@/components/AgentDecisionPanel";
import { AgentWorkflowTimeline } from "@/components/AgentWorkflowTimeline";
import { AppHeader } from "@/components/AppHeader";
import { ReviewNav } from "@/components/ReviewNav";
import { ReviewScoreSummary } from "@/components/ReviewScoreSummary";
import { simulateAgentDecision } from "@/lib/agent";
import { parseReviewState } from "@/lib/review-state";
import { runReviewCheck } from "@/lib/server/reviewCheck";

type ReviewPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AgentReviewPage({ searchParams }: ReviewPageProps) {
  const state = parseReviewState(await searchParams);
  const result = await runReviewCheck(state);
  const simulation = simulateAgentDecision({
    amountUsd: state.amountUsd,
    riskProfile: state.riskProfile,
    timeHorizonDays: 7,
    mode: state.mode,
  });

  return (
    <main className="min-h-[100dvh] bg-[var(--background)] px-4 pb-10 text-[var(--foreground)] sm:px-5">
      <div className="mx-auto max-w-6xl">
        <AppHeader
          active="check"
          eyebrow="Focused review"
          title="Agent decision review"
          description="Show how an AI agent compares APY against exit score, safe size, stress results, and workflow status."
        />

        <ReviewScoreSummary result={result} state={state} />
        <ReviewNav state={state} active="agent" />

        <section className="mt-5 grid min-w-0 gap-5">
          <AgentWorkflowTimeline result={result} reportHashSaved={false} />
          <AgentDecisionPanel simulation={simulation} />
        </section>
      </div>
    </main>
  );
}
