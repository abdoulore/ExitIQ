import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { ScoreBadge } from "@/components/ScoreBadge";
import { listWatchlistItems } from "@/lib/server/watchlistStore";
import type { WatchlistStatus } from "@/lib/watchlist";

export const dynamic = "force-dynamic";

export default async function WatchlistPage() {
  const items = await listWatchlistItems();

  return (
    <main className="min-h-[100dvh] bg-[var(--background)] px-4 py-5 pb-10 text-[var(--foreground)] sm:px-5">
      <div className="mx-auto max-w-6xl">
        <AppHeader
          active="watchlist"
          eyebrow="Saved reports"
          title="Exit-risk watchlist"
          description="Monitor generated reports by healthy, warning, or critical status before a position is entered."
          actions={
            <Link
              href="/check"
              className="inline-flex h-10 w-full items-center justify-center rounded-md bg-[var(--accent)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--accent-strong)] active:translate-y-px sm:w-auto"
            >
              New exit check
            </Link>
          }
        />

        {items.length === 0 ? (
          <section className="mt-6 rounded-lg border border-[var(--line)] bg-[var(--card)] p-6 shadow-[var(--shadow)]">
            <p className="data-label">No saved reports</p>
            <h2 className="mt-2 text-2xl font-semibold">Watchlist is empty</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">
              Generate a shareable report, then save it to the watchlist from the report page.
            </p>
            <Link
              href="/check"
              className="mt-5 inline-flex h-10 items-center justify-center rounded-md bg-[var(--accent)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--accent-strong)]"
            >
              Run First Check
            </Link>
          </section>
        ) : (
          <section className="mt-6 grid gap-4">
            {items.map((item) => (
              <article
                key={item.reportId}
                className="rounded-lg border border-[var(--line)] bg-[var(--card)] p-5 shadow-[var(--shadow)]"
              >
                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-start">
                  <div>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-xs font-semibold text-[var(--accent)]">
                          {item.report.result.asset.symbol}
                        </p>
                        <h2 className="mt-1 text-xl font-semibold">{item.report.result.asset.name}</h2>
                      </div>
                      <StatusPill status={item.status} label={item.statusLabel} />
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <Metric label="Amount" value={`$${item.report.result.amountUsd.toLocaleString("en-US")}`} />
                      <Metric
                        label="Slippage"
                        value={`${item.report.result.estimatedSlippagePct}%`}
                      />
                      <Metric
                        label="Max safe size"
                        value={`$${item.report.result.maxSafeSizeUsd.toLocaleString("en-US")}`}
                      />
                      <Metric label="Volume support" value={item.report.result.volumeSupport} />
                    </div>

                    <p className="mt-4 text-sm leading-6 text-[var(--muted)]">{item.statusReason}</p>
                  </div>

                  <div className="rounded-md border border-[var(--line)] bg-[var(--surface)] p-4">
                    <p className="text-xs font-semibold text-[var(--muted)]">Current score</p>
                    <div className="mt-3 flex items-center gap-3">
                      <ScoreBadge grade={item.report.result.exitScore} size="lg" />
                      <div>
                        <p className="text-sm font-semibold">
                          {item.report.result.verdict.replaceAll("_", " ")}
                        </p>
                        <p className="mt-1 text-xs text-[var(--muted)]">
                          Saved {new Date(item.createdAt).toLocaleDateString("en-US")}
                        </p>
                      </div>
                    </div>
                    <Link
                      href={`/report/${item.reportId}`}
                      className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-md border border-[var(--line)] bg-[var(--card)] px-4 text-sm font-semibold transition hover:bg-[var(--surface)]"
                    >
                      View Report
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}

function StatusPill({ status, label }: { status: WatchlistStatus; label: string }) {
  return (
    <span
      className={`inline-flex h-8 w-fit items-center rounded-md border px-3 text-xs font-semibold ${statusClass(
        status,
      )}`}
    >
      {label}
    </span>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[var(--line)] bg-[var(--surface)] p-3">
      <p className="text-xs text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-sm font-semibold capitalize">{value}</p>
    </div>
  );
}

function statusClass(status: WatchlistStatus) {
  if (status === "healthy") {
    return "border-[var(--success-line)] bg-[var(--success-bg)] text-[var(--success)]";
  }

  if (status === "warning") {
    return "border-[var(--warning-line)] bg-[var(--warning-bg)] text-[var(--warning)]";
  }

  return "border-[var(--danger-line)] bg-[var(--danger-bg)] text-[var(--danger)]";
}
