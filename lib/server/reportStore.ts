import { promises as fs } from "node:fs";
import path from "node:path";
import type { Hex } from "viem";
import type { ReportTransactionUpdate, StoredExitReport } from "@/lib/reports";
import { eqFilter, hasSupabaseConfig, supabaseRequest } from "@/lib/server/supabaseRest";

type ReportsDb = {
  reports: Record<string, StoredExitReport>;
};

const dataDir = path.join(process.cwd(), ".data");
const reportsPath = path.join(dataDir, "reports.json");

let writeQueue = Promise.resolve();

export async function saveReport(report: StoredExitReport) {
  if (hasSupabaseConfig) {
    try {
      return await saveReportToSupabase(report);
    } catch (error) {
      console.error("Supabase saveReport failed, falling back to local storage.", error);
    }
  }

  return enqueueWrite(async () => {
    const db = await readReportsDb();
    const normalizedReport = {
      ...report,
      createdAt: report.createdAt || new Date().toISOString(),
    };

    db.reports[normalizedReport.id] = normalizedReport;
    await writeReportsDb(db);

    return normalizedReport;
  });
}

export async function getReportById(reportId: string) {
  if (hasSupabaseConfig) {
    try {
      return await getReportByIdFromSupabase(reportId);
    } catch (error) {
      console.error("Supabase getReportById failed, falling back to local storage.", error);
    }
  }

  const db = await readReportsDb();

  return db.reports[reportId] ?? null;
}

export async function listReports() {
  if (hasSupabaseConfig) {
    try {
      return await listReportsFromSupabase();
    } catch (error) {
      console.error("Supabase listReports failed, falling back to local storage.", error);
    }
  }

  const db = await readReportsDb();

  return Object.values(db.reports).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export async function updateReportTransaction(reportId: string, update: ReportTransactionUpdate) {
  if (hasSupabaseConfig) {
    try {
      return await updateReportTransactionInSupabase(reportId, update);
    } catch (error) {
      console.error("Supabase updateReportTransaction failed, falling back to local storage.", error);
    }
  }

  return enqueueWrite(async () => {
    const db = await readReportsDb();
    const report = db.reports[reportId];

    if (!report) {
      return null;
    }

    const updatedReport = {
      ...report,
      reportHash: update.reportHash,
      transactionHash: update.transactionHash,
    };

    db.reports[reportId] = updatedReport;
    await writeReportsDb(db);

    return updatedReport;
  });
}

async function saveReportToSupabase(report: StoredExitReport) {
  const normalizedReport = {
    ...report,
    createdAt: report.createdAt || new Date().toISOString(),
  };
  const rows = await supabaseRequest<SupabaseReportRow[]>({
    path: "reports?on_conflict=id",
    init: {
      method: "POST",
      headers: {
        Prefer: "resolution=merge-duplicates,return=representation",
      },
      body: JSON.stringify({
        id: normalizedReport.id,
        report_json: normalizedReport,
        report_hash: normalizedReport.reportHash,
        tx_hash: normalizedReport.transactionHash ?? null,
      }),
    },
  });

  return mapReportRow(rows[0]) ?? normalizedReport;
}

async function getReportByIdFromSupabase(reportId: string) {
  const rows = await supabaseRequest<SupabaseReportRow[]>({
    path: `reports?id=${eqFilter(reportId)}&select=id,report_json,report_hash,tx_hash,created_at&limit=1`,
  });

  return mapReportRow(rows[0]) ?? null;
}

async function listReportsFromSupabase() {
  const rows = await supabaseRequest<SupabaseReportRow[]>({
    path: "reports?select=id,report_json,report_hash,tx_hash,created_at&order=created_at.desc",
  });

  return rows.map(mapReportRow).filter((report): report is StoredExitReport => Boolean(report));
}

async function updateReportTransactionInSupabase(reportId: string, update: ReportTransactionUpdate) {
  const existingReport = await getReportByIdFromSupabase(reportId);

  if (!existingReport) {
    return null;
  }

  const updatedReport = {
    ...existingReport,
    reportHash: update.reportHash,
    transactionHash: update.transactionHash,
  };
  const rows = await supabaseRequest<SupabaseReportRow[]>({
    path: `reports?id=${eqFilter(reportId)}`,
    init: {
      method: "PATCH",
      headers: {
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        report_json: updatedReport,
        report_hash: update.reportHash,
        tx_hash: update.transactionHash,
      }),
    },
  });

  return mapReportRow(rows[0]) ?? updatedReport;
}

function enqueueWrite<T>(operation: () => Promise<T>) {
  const nextWrite = writeQueue.then(operation, operation);
  writeQueue = nextWrite.then(
    () => undefined,
    () => undefined,
  );

  return nextWrite;
}

async function readReportsDb(): Promise<ReportsDb> {
  try {
    const rawDb = await fs.readFile(reportsPath, "utf8");
    const parsedDb = JSON.parse(rawDb) as ReportsDb;

    if (!parsedDb.reports || typeof parsedDb.reports !== "object") {
      return { reports: {} };
    }

    return parsedDb;
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      return { reports: {} };
    }

    throw error;
  }
}

async function writeReportsDb(db: ReportsDb) {
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(reportsPath, `${JSON.stringify(db, null, 2)}\n`);
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}

function mapReportRow(row: SupabaseReportRow | undefined): StoredExitReport | null {
  if (!row?.report_json) {
    return null;
  }

  const transactionHash = (row.tx_hash as Hex | null) ?? row.report_json.transactionHash;
  const report: StoredExitReport = {
    ...row.report_json,
    id: row.id,
    createdAt: row.report_json.createdAt ?? row.created_at,
    reportHash: row.report_hash as Hex,
  };

  if (transactionHash) {
    report.transactionHash = transactionHash;
  }

  return report;
}

type SupabaseReportRow = {
  id: string;
  report_json: StoredExitReport;
  report_hash: string;
  tx_hash: string | null;
  created_at: string;
};
