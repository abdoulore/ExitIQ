import { AppHeader } from "@/components/AppHeader";
import { ReportRegistryPanel } from "@/components/ReportRegistryPanel";
import { ReviewNav } from "@/components/ReviewNav";
import { ReviewScoreSummary } from "@/components/ReviewScoreSummary";
import { parseReviewState } from "@/lib/review-state";
import { runReviewCheck } from "@/lib/server/reviewCheck";

type ReviewPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ProofReviewPage({ searchParams }: ReviewPageProps) {
  const state = parseReviewState(await searchParams);
  const result = await runReviewCheck(state);

  return (
    <main className="min-h-[100dvh] bg-[var(--background)] px-4 pb-10 text-[var(--foreground)] sm:px-5">
      <div className="mx-auto max-w-6xl">
        <AppHeader
          active="check"
          eyebrow="Focused review"
          title="Proof and registry review"
          description="Generate the deterministic report hash and save it to the Mantle mainnet registry when the contract is configured."
        />

        <ReviewScoreSummary result={result} state={state} />
        <ReviewNav state={state} active="proof" />

        <section className="mt-5 grid min-w-0 gap-5">
          <ReportRegistryPanel result={result} />
        </section>
      </div>
    </main>
  );
}
