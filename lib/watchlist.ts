import type { StoredExitReport } from "@/lib/reports";
import type { ExitGrade } from "@/lib/scoring";

export type WatchlistStatus = "healthy" | "warning" | "critical";

export type WatchlistRecord = {
  reportId: string;
  createdAt: string;
};

export type WatchlistItem = WatchlistRecord & {
  report: StoredExitReport;
  status: WatchlistStatus;
  statusLabel: string;
  statusReason: string;
};

export function createWatchlistItem(record: WatchlistRecord, report: StoredExitReport): WatchlistItem {
  const status = getWatchlistStatus(report.result.exitScore);

  return {
    ...record,
    report,
    status,
    statusLabel: getWatchlistStatusLabel(status),
    statusReason: getWatchlistStatusReason(report.result.exitScore),
  };
}

export function getWatchlistStatus(exitScore: ExitGrade): WatchlistStatus {
  if (exitScore === "A" || exitScore === "B") {
    return "healthy";
  }

  if (exitScore === "C" || exitScore === "D") {
    return "warning";
  }

  return "critical";
}

function getWatchlistStatusLabel(status: WatchlistStatus) {
  if (status === "healthy") {
    return "Healthy";
  }

  if (status === "warning") {
    return "Warning";
  }

  return "Critical";
}

function getWatchlistStatusReason(exitScore: ExitGrade) {
  if (exitScore === "A" || exitScore === "B") {
    return "Exit score is still inside the acceptable monitoring band.";
  }

  if (exitScore === "C" || exitScore === "D") {
    return "Exit score needs attention before increasing allocation.";
  }

  return "Exit score is critical. Avoid entry or reduce planned size.";
}
