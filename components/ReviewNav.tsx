import Link from "next/link";
import { createReviewHref, type ExitReviewState } from "@/lib/review-state";

type ReviewNavProps = {
  state: ExitReviewState;
  active: "stress" | "compliance" | "agent" | "proof";
};

const tabs = [
  { id: "stress", label: "Score and stress", href: "/review/stress" },
  { id: "compliance", label: "Compliance", href: "/review/compliance" },
  { id: "agent", label: "Agent", href: "/review/agent" },
  { id: "proof", label: "Proof", href: "/review/proof" },
] as const;

export function ReviewNav({ state, active }: ReviewNavProps) {
  return (
    <nav className="mt-5 grid gap-3 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center" aria-label="Review navigation">
      <Link
        href={createReviewHref("/check/result", state)}
        className="inline-flex h-10 w-fit items-center justify-center rounded-full border border-[var(--line)] bg-[var(--card)] px-4 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface)] active:translate-y-px"
      >
        &lt;- Back to result
      </Link>

      <div className="overflow-x-auto rounded-xl bg-[var(--surface)] p-1">
        <div className="flex min-w-max gap-1 sm:min-w-0 sm:justify-end">
          {tabs.map((tab) => (
            <Link
              key={tab.id}
              href={createReviewHref(tab.href, state)}
              className={`inline-flex h-9 items-center rounded-lg px-3 text-sm font-semibold transition active:translate-y-px ${
                active === tab.id
                  ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm"
                  : "text-[var(--muted)] hover:bg-white/5 hover:text-[var(--foreground)]"
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
