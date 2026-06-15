"use client";

import Link from "next/link";
import { useState } from "react";

type SaveStatus = "idle" | "saving" | "saved" | "error";

export function WatchlistButton({ reportId }: { reportId: string }) {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  async function saveToWatchlist() {
    setStatus("saving");
    setError(null);

    try {
      const response = await fetch("/api/watchlist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reportId }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to save report.");
      }

      setStatus("saved");
    } catch (saveError) {
      setStatus("error");
      setError(saveError instanceof Error ? saveError.message : "Unable to save report.");
    }
  }

  return (
    <div className="flex flex-col gap-2 sm:items-end">
      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={saveToWatchlist}
          disabled={status === "saving"}
          className="inline-flex h-10 items-center justify-center rounded-md bg-[var(--accent)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--accent-strong)] disabled:cursor-wait disabled:opacity-70"
        >
          {status === "saving" ? "Saving..." : status === "saved" ? "Saved to Watchlist" : "Save to Watchlist"}
        </button>
        <Link
          href="/watchlist"
          className="inline-flex h-10 items-center justify-center rounded-md border border-[var(--line)] bg-[var(--card)] px-4 text-sm font-semibold transition hover:bg-[var(--surface)]"
        >
          Open Watchlist
        </Link>
      </div>
      {status === "saved" ? (
        <p className="text-xs font-semibold text-[var(--success)]">Report is now monitored.</p>
      ) : null}
      {error ? <p className="text-xs font-semibold text-[var(--danger)]">{error}</p> : null}
    </div>
  );
}
