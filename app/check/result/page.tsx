import Link from "next/link";
import { AgentVerdictPanel } from "@/components/AgentVerdictPanel";
import { AppHeader } from "@/components/AppHeader";
import { CreateReportButton } from "@/components/CreateReportButton";
import { ScoreBadge } from "@/components/ScoreBadge";
import { createReviewHref } from "@/lib/review-state";
import { parseReviewState } from "@/lib/review-state";
import { generateAgentDecision } from "@/lib/server/agentDecision";
import { runReviewCheck } from "@/lib/server/reviewCheck";
import type { ExitCheckResult, ExitGrade } from "@/lib/scoring";

type CheckResultPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CheckResultPage({ searchParams }: CheckResultPageProps) {
  const state = parseReviewState(await searchParams);
  const result = await runReviewCheck(state);
  const decision = await generateAgentDecision(result);
  const memo = decision.narrative;
  const adjustHref = createReviewHref("/check", state);

  return (
    <main className="min-h-[100dvh] bg-[var(--background)] px-4 pb-10 text-[var(--foreground)] sm:px-5">
      <div className="mx-auto max-w-6xl">
        <AppHeader
          active="check"
          eyebrow="Exit result"
          title="Exit-risk result"
          description="The AI agent makes the call from the calculated signals. The model report below is the auditable evidence behind it."
        />

        <div className="mt-5">
          <AgentVerdictPanel decision={decision} />
        </div>

        <section className={`mt-5 overflow-hidden rounded-xl border border-[var(--line)] shadow-[var(--shadow)] ${decisionToneClass(result.verdict)}`}>
          <div className="p-5 sm:p-6">
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <ScoreBadge grade={result.exitScore} size="lg" />
                <div>
                  <p className="data-label">Model signal · audit trail</p>
                  <h2 className="mt-1 text-2xl font-semibold sm:text-3xl">{decisionHeadline(result.verdict)}</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
                    {result.asset.name} at ${result.amountUsd.toLocaleString("en-US")} has {result.estimatedSlippagePct}% estimated slippage and a max safe size of ${result.maxSafeSizeUsd.toLocaleString("en-US")}.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
                <Link
                  href={adjustHref}
                  className="inline-flex h-11 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--card)] px-5 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface)] active:translate-y-px"
                >
                  &lt;- Adjust inputs
                </Link>
                <CreateReportButton result={result} memo={memo} decision={decision} />
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Metric label="Model verdict" value={formatVerdict(result.verdict)} />
              <Metric
                label="Safe-size check"
                value={result.amountUsd <= result.maxSafeSizeUsd ? "Inside limit" : "Above limit"}
              />
              <Metric label="Slippage" value={`${result.estimatedSlippagePct}%`} />
              <Metric label="Max safe size" value={`$${result.maxSafeSizeUsd.toLocaleString("en-US")}`} />
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-xl border border-[var(--line)] bg-[var(--card)] p-5 shadow-[var(--shadow)]">
          <div>
            <h2 className="text-lg font-semibold">Full analysis</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Each section opens as a focused review page.</p>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <EvidenceCard
              href={createReviewHref("/review/stress", state)}
              title="Score and stress"
              description="Score breakdown, size curve, and stress scenarios."
              badge={`Worst ${worstStressGrade(result)}`}
            />
            <EvidenceCard
              href={createReviewHref("/review/compliance", state)}
              title="Compliance"
              description="RWA awareness, KYC, jurisdiction, and eligibility fields."
              badge={result.complianceStatus.level}
            />
            <EvidenceCard
              href={createReviewHref("/review/agent", state)}
              title="Agent decision"
              description="Agent workflow timeline and APY-vs-exit comparison."
              badge={formatVerdict(result.verdict)}
            />
            <EvidenceCard
              href={createReviewHref("/review/proof", state)}
              title="Proof and registry"
              description="Report hash and Mantle mainnet registry save flow."
              badge="Hash ready"
            />
          </div>

          <p className="mt-5 rounded-xl bg-[var(--surface)] p-5 text-base leading-8 text-[var(--foreground)]">
            {memo}
          </p>
        </section>
      </div>
    </main>
  );
}

function EvidenceCard({
  href,
  title,
  description,
  badge,
}: {
  href: string;
  title: string;
  description: string;
  badge: string;
}) {
  return (
    <Link
      href={href}
      className="grid min-h-40 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4 transition hover:border-[var(--accent)] hover:bg-[var(--card)] active:translate-y-px"
    >
      <span className="text-sm font-semibold">{title}</span>
      <span className="mt-2 text-xs leading-5 text-[var(--muted)]">{description}</span>
      <span className="mt-4 inline-flex w-fit self-end rounded-full border border-[var(--line)] bg-[var(--card)] px-3 py-1 text-xs font-semibold capitalize text-[var(--muted)]">
        {badge}
      </span>
    </Link>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--line)] bg-[var(--card)] p-3">
      <p className="data-label">{label}</p>
      <p className="mt-1 text-sm font-semibold capitalize">{value}</p>
    </div>
  );
}

function worstStressGrade(result: ExitCheckResult): ExitGrade {
  const grades = [
    result.stress.liquidityDown20.exitScore,
    result.stress.liquidityDown50.exitScore,
    result.stress.bestRouteUnavailable.exitScore,
  ];
  const order: ExitGrade[] = ["A", "B", "C", "D", "F"];

  return grades.reduce<ExitGrade>(
    (worst, grade) => (order.indexOf(grade) > order.indexOf(worst) ? grade : worst),
    "A",
  );
}

function decisionToneClass(verdict: ExitCheckResult["verdict"]) {
  if (verdict === "enter" || verdict === "enter_with_monitoring") {
    return "bg-[var(--success-bg)]";
  }

  if (verdict === "avoid") {
    return "bg-[var(--danger-bg)]";
  }

  return "bg-[var(--warning-bg)]";
}

function decisionHeadline(verdict: ExitCheckResult["verdict"]) {
  const headlines: Record<ExitCheckResult["verdict"], string> = {
    enter: "Exit looks survivable at this size",
    enter_with_monitoring: "Enter only with monitoring",
    reduce_size: "Reduce the position before entry",
    wait: "Wait for better exit conditions",
    avoid: "Avoid this entry at the current size",
  };

  return headlines[verdict];
}

function formatVerdict(verdict: ExitCheckResult["verdict"]) {
  return verdict.replaceAll("_", " ");
}
