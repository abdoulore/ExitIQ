import { AppHeader } from "@/components/AppHeader";
import { CompliancePanel } from "@/components/CompliancePanel";
import { ReviewNav } from "@/components/ReviewNav";
import { ReviewScoreSummary } from "@/components/ReviewScoreSummary";
import { parseReviewState } from "@/lib/review-state";
import { runReviewCheck } from "@/lib/server/reviewCheck";

type ReviewPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ComplianceReviewPage({ searchParams }: ReviewPageProps) {
  const state = parseReviewState(await searchParams);
  const result = await runReviewCheck(state);

  return (
    <main className="min-h-[100dvh] bg-[var(--background)] px-4 pb-10 text-[var(--foreground)] sm:px-5">
      <div className="mx-auto max-w-6xl">
        <AppHeader
          active="check"
          eyebrow="Focused review"
          title="Compliance awareness review"
          description="Surface KYC, jurisdiction, accredited investor, and issuer-specific review items before entering RWA or yield positions."
        />

        <ReviewScoreSummary result={result} state={state} />
        <ReviewNav state={state} active="compliance" />

        <section className="mt-5 grid min-w-0 gap-5">
          <CompliancePanel result={result} />
        </section>
      </div>
    </main>
  );
}
