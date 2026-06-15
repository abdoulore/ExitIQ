"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { AgentVerdictPanel } from "@/components/AgentVerdictPanel";
import { AgentWorkflowTimeline } from "@/components/AgentWorkflowTimeline";
import { AppHeader } from "@/components/AppHeader";
import { CompliancePanel } from "@/components/CompliancePanel";
import { ExitScoreCard } from "@/components/ExitScoreCard";
import { ReportRegistryPanel } from "@/components/ReportRegistryPanel";
import { ScoreBadge } from "@/components/ScoreBadge";
import { StressTestPanel } from "@/components/StressTestPanel";
import { WatchlistButton } from "@/components/WatchlistButton";
import { getMantleTxUrl } from "@/lib/registry";
import {
  getStoredExitReport,
  saveExitReportSnapshot,
  subscribeToReportStorage,
} from "@/lib/report-storage";
import type { ReportTransactionUpdate, StoredExitReport } from "@/lib/reports";

type ReportTab = "decision" | "stress" | "compliance" | "proof";

export function ReportPageClient({
  reportId,
  initialReport,
}: {
  reportId: string;
  initialReport: StoredExitReport | null;
}) {
  const [persistedReport, setPersistedReport] = useState<StoredExitReport | null>(initialReport);
  const localReport = useSyncExternalStore(
    subscribeToReportStorage,
    () => getStoredExitReport(reportId),
    () => null,
  );
  const report = persistedReport ?? localReport;
  const isPersistentReport = Boolean(persistedReport);
  const [activeTab, setActiveTab] = useState<ReportTab>("decision");

  async function handleReportSaved(update: ReportTransactionUpdate) {
    if (!report) {
      return;
    }

    const optimisticReport = {
      ...report,
      reportHash: update.reportHash,
      transactionHash: update.transactionHash,
    };

    setPersistedReport(optimisticReport);
    saveExitReportSnapshot(optimisticReport);

    try {
      const response = await fetch(`/api/reports/${report.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(update),
      });

      if (!response.ok) {
        return;
      }

      const payload = (await response.json()) as { report?: StoredExitReport };

      if (payload.report) {
        setPersistedReport(payload.report);
        saveExitReportSnapshot(payload.report);
      }
    } catch {
      // Keep the optimistic local update if persistent storage is unavailable.
    }
  }

  if (!report) {
    return (
      <main className="min-h-[100dvh] bg-[var(--background)] px-5 pb-10 text-[var(--foreground)]">
        <div className="mx-auto max-w-4xl">
          <AppHeader
            active="report"
            eyebrow="Report lookup"
            title="Report not found"
            description="This report is not available in persistent storage. Run a check and create a shareable report."
          />
          <section className="mt-6 rounded-xl border border-[var(--line)] bg-[var(--card)] p-6 shadow-[var(--shadow)]">
            <p className="mono text-xs text-[var(--muted)]">Report ID: {reportId}</p>
            <Link
              href="/check"
              className="mt-5 inline-flex h-10 items-center justify-center rounded-full bg-[var(--accent)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--accent-strong)]"
            >
              Create report
            </Link>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[100dvh] bg-[var(--background)] px-4 pb-10 text-[var(--foreground)] sm:px-5">
      <div className="mx-auto max-w-6xl">
        <AppHeader
          active="report"
          eyebrow="Shareable report"
          title="Exit-risk report"
          description={
            isPersistentReport
              ? "Persistent report generated from an ExitIQ check."
              : "Browser fallback report generated from the current ExitIQ check."
          }
        />

        <ReportSummaryBar report={report} />

        {report.agentDecision ? (
          <div className="mt-5">
            <AgentVerdictPanel decision={report.agentDecision} />
          </div>
        ) : null}

        <div className="mt-6 grid gap-5">
          <ExitScoreCard result={report.result} />
          {!report.transactionHash ? (
            <ReportRegistryPanel result={report.result} onReportSaved={handleReportSaved} />
          ) : null}
          <ReportEvidenceTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            report={report}
          />
        </div>
      </div>
    </main>
  );
}

function ReportSummaryBar({ report }: { report: StoredExitReport }) {
  return (
    <section className="mt-5 rounded-xl border border-[var(--line)] bg-[var(--card)] p-4 shadow-[var(--shadow)]">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center">
          <ScoreBadge grade={report.result.exitScore} size="lg" />
          <div className="min-w-0">
            <p className="truncate text-xl font-semibold">{report.result.asset.name}</p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              ${report.result.amountUsd.toLocaleString("en-US")} position | Generated{" "}
              {new Date(report.createdAt).toLocaleString("en-US")}
            </p>
            <p className="mono mt-2 break-all text-xs text-[var(--muted)]">Report ID: {report.id}</p>
          </div>
        </div>
        <WatchlistButton reportId={report.id} />
      </div>
    </section>
  );
}

function ReportEvidenceTabs({
  activeTab,
  onTabChange,
  report,
}: {
  activeTab: ReportTab;
  onTabChange: (tab: ReportTab) => void;
  report: StoredExitReport;
}) {
  const tabs: Array<{ id: ReportTab; label: string; hint: string }> = [
    { id: "decision", label: "Decision", hint: "Memo and alternatives" },
    { id: "stress", label: "Stress", hint: "Liquidity shocks" },
    { id: "compliance", label: "Compliance", hint: "Eligibility awareness" },
    { id: "proof", label: "Proof", hint: "Hash and transaction" },
  ];

  return (
    <section className="rounded-xl border border-[var(--line)] bg-[var(--card)] p-4 shadow-[var(--shadow)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="data-label">Report evidence</p>
          <h2 className="mt-1 text-xl font-semibold">Open the detail you need</h2>
        </div>
        <p className="text-xs font-semibold text-[var(--muted)]">
          Created {new Date(report.createdAt).toLocaleString("en-US")}
        </p>
      </div>

      <div className="mt-4 rounded-xl bg-[var(--surface)] p-1">
        <div className="grid gap-1 md:grid-cols-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`rounded-lg px-3 py-3 text-left transition active:translate-y-px ${
                activeTab === tab.id
                  ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm"
                  : "text-[var(--muted)] hover:bg-white/5 hover:text-[var(--foreground)]"
              }`}
            >
              <span className="block text-sm font-semibold">{tab.label}</span>
              <span className="mt-1 block text-xs">{tab.hint}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5">
        {activeTab === "decision" ? (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="grid gap-5">
              <AgentWorkflowTimeline result={report.result} reportHashSaved={Boolean(report.transactionHash)} />
              <AiMemoPanel memo={report.aiMemo} />
            </div>
            <AlternativePanel report={report} />
          </div>
        ) : null}
        {activeTab === "stress" ? <StressTestPanel stress={report.result.stress} /> : null}
        {activeTab === "compliance" ? <CompliancePanel result={report.result} /> : null}
        {activeTab === "proof" ? <ReportHashPanel report={report} /> : null}
      </div>
    </section>
  );
}

function ReportHashPanel({ report }: { report: StoredExitReport }) {
  const txLink = report.transactionHash ? getMantleTxUrl(report.transactionHash) : undefined;

  return (
    <div className="grid gap-5">
      <section className="rounded-xl border border-[var(--line)] bg-[var(--card)] p-5 shadow-[var(--shadow)]">
        <p className="data-label">Report proof</p>
        <div className="mt-4 grid gap-3">
          <InfoRow label="Created" value={new Date(report.createdAt).toLocaleString("en-US")} />
          <InfoRow label="Report hash" value={report.reportHash} mono />
          {report.transactionHash ? (
            <div className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-3">
              <p className="data-label">Transaction hash</p>
              <a
                href={txLink}
                target="_blank"
                rel="noreferrer"
                className="mono mt-1 block break-all text-xs font-semibold text-[var(--accent)] hover:text-[var(--accent-strong)]"
              >
                {report.transactionHash}
              </a>
            </div>
          ) : (
            <InfoRow label="Transaction hash" value="Not saved onchain yet." />
          )}
        </div>
      </section>
    </div>
  );
}

function AlternativePanel({ report }: { report: StoredExitReport }) {
  const { alternative } = report.result;

  return (
    <section className="rounded-xl border border-[var(--line)] bg-[var(--card)] p-5 shadow-[var(--shadow)]">
      <p className="data-label">Alternative suggestion</p>
      <h2 className="mt-2 text-xl font-semibold">{alternative.asset ?? "No stronger alternative needed"}</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {alternative.exitScore ? (
          <div className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-3">
            <p className="data-label">Alternative score</p>
            <div className="mt-2">
              <ScoreBadge grade={alternative.exitScore} size="sm" />
            </div>
          </div>
        ) : null}
        <InfoTile label="Max safe size" value={`$${alternative.maxSafeSizeUsd.toLocaleString("en-US")}`} />
        <InfoTile label="Recommended size" value={`$${alternative.recommendedSizeUsd.toLocaleString("en-US")}`} />
      </div>
      {alternative.reason ? (
        <p className="mt-4 text-sm font-semibold">{alternative.reason}</p>
      ) : null}
      <p className="mt-3 text-sm leading-7 text-[var(--muted)]">{alternative.message}</p>
    </section>
  );
}

function AiMemoPanel({ memo }: { memo: string }) {
  const cleanMemo = cleanMemoText(memo);

  return (
    <section className="rounded-xl border border-[var(--line)] bg-[var(--card)] p-5 shadow-[var(--shadow)]">
      <p className="data-label">AI memo</p>
      <p className="mt-3 rounded-xl bg-[var(--surface)] p-5 text-base leading-8 text-[var(--foreground)]">
        {cleanMemo}
      </p>
    </section>
  );
}

function cleanMemoText(memo: string) {
  return memo.replaceAll("**", "").replaceAll("\u2014", "-").replaceAll("\u2013", "-");
}

function InfoRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-3">
      <p className="data-label">{label}</p>
      <p className={`${mono ? "mono text-xs" : "text-sm"} mt-1 break-all font-semibold`}>{value}</p>
    </div>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-3">
      <p className="data-label">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}
