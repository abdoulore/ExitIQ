import type { ReportTransactionUpdate, StoredExitReport } from "@/lib/reports";

const reportKeyPrefix = "exitiq-report:";
const reportStorageEventName = "exitiq-report-storage";

let cachedReportId: string | undefined;
let cachedRawReport: string | null | undefined;
let cachedReport: StoredExitReport | null = null;

export function saveExitReportSnapshot(report: StoredExitReport) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(getReportStorageKey(report.id), JSON.stringify(report));
  notifyReportStorageChanged();
}

export function updateStoredReportTransaction(reportId: string, update: ReportTransactionUpdate) {
  if (typeof window === "undefined") {
    return;
  }

  const report = getStoredExitReport(reportId);

  if (!report) {
    return;
  }

  saveExitReportSnapshot({
    ...report,
    reportHash: update.reportHash,
    transactionHash: update.transactionHash,
  });
}

export function getStoredExitReport(reportId: string) {
  if (typeof window === "undefined") {
    return null;
  }

  const rawReport = window.localStorage.getItem(getReportStorageKey(reportId));

  if (cachedReportId === reportId && cachedRawReport === rawReport) {
    return cachedReport;
  }

  cachedReportId = reportId;
  cachedRawReport = rawReport;
  cachedReport = parseStoredReport(rawReport);

  return cachedReport;
}

export function subscribeToReportStorage(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  window.addEventListener("storage", onStoreChange);
  window.addEventListener(reportStorageEventName, onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(reportStorageEventName, onStoreChange);
  };
}

function getReportStorageKey(reportId: string) {
  return `${reportKeyPrefix}${reportId}`;
}

function notifyReportStorageChanged() {
  window.dispatchEvent(new Event(reportStorageEventName));
}

function parseStoredReport(rawReport: string | null) {
  if (!rawReport) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawReport) as StoredExitReport;

    if (!parsed.id || !parsed.result || !parsed.reportHash) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}
