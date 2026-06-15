"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AgentExitDecision } from "@/lib/agentDecision";
import { createReportId } from "@/lib/hash";
import { createReportHash } from "@/lib/report-hash";
import { saveExitReportSnapshot } from "@/lib/report-storage";
import type { StoredExitReport } from "@/lib/reports";
import type { ExitCheckResult } from "@/lib/scoring";

type CreateReportButtonProps = {
  result: ExitCheckResult;
  memo: string;
  decision?: AgentExitDecision;
};

export function CreateReportButton({ result, memo, decision }: CreateReportButtonProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createReport() {
    setIsSaving(true);
    setError(null);

    const reportHash = createReportHash(result);
    const reportId = createReportId(reportHash);
    const report: StoredExitReport = {
      id: reportId,
      createdAt: new Date().toISOString(),
      result,
      aiMemo: memo,
      agentDecision: decision,
      reportHash,
    };

    saveExitReportSnapshot(report);

    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(report),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to save report.");
      }

      router.push(`/report/${reportId}`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save report.");
      setIsSaving(false);
    }
  }

  return (
    <div className="grid gap-2">
      <button
        type="button"
        onClick={createReport}
        disabled={isSaving}
        className="inline-flex h-11 items-center justify-center rounded-full bg-[var(--accent)] px-5 text-sm font-semibold text-white transition hover:bg-[var(--accent-strong)] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSaving ? "Creating report..." : "Create report ->"}
      </button>
      {error ? (
        <p className="rounded-lg border border-[var(--danger-line)] bg-[var(--danger-bg)] px-3 py-2 text-xs font-semibold text-[var(--danger)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
