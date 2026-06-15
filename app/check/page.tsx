import { Suspense } from "react";
import { ExitCheckClient } from "@/components/ExitCheckClient";

export default function CheckPage() {
  return (
    <Suspense fallback={<CheckPageFallback />}>
      <ExitCheckClient />
    </Suspense>
  );
}

function CheckPageFallback() {
  return (
    <main className="min-h-[100dvh] bg-[var(--background)] px-4 pb-10 text-[var(--foreground)] sm:px-5">
      <div className="mx-auto max-w-xl pt-20">
        <div className="rounded-xl border border-[var(--line)] bg-[var(--card)] p-5 shadow-[var(--shadow)]">
          <p className="data-label">Loading check</p>
          <div className="mt-4 h-12 animate-pulse rounded-lg bg-[var(--surface)]" />
          <div className="mt-3 h-24 animate-pulse rounded-lg bg-[var(--surface)]" />
        </div>
      </div>
    </main>
  );
}
