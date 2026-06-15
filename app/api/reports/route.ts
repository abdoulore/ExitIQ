import { NextResponse } from "next/server";
import type { StoredExitReport } from "@/lib/reports";
import { listReports, saveReport } from "@/lib/server/reportStore";

export const runtime = "nodejs";

export async function GET() {
  const reports = await listReports();

  return NextResponse.json({ reports });
}

export async function POST(request: Request) {
  try {
    const report = (await request.json()) as StoredExitReport;

    if (!isValidReport(report)) {
      return NextResponse.json({ error: "Invalid report payload." }, { status: 400 });
    }

    const savedReport = await saveReport(report);

    return NextResponse.json({ report: savedReport });
  } catch {
    return NextResponse.json({ error: "Unable to persist report." }, { status: 500 });
  }
}

function isValidReport(report: StoredExitReport | null | undefined): report is StoredExitReport {
  return Boolean(
    report?.id &&
      report.createdAt &&
      report.result?.asset?.id &&
      Number.isFinite(report.result.amountUsd) &&
      report.reportHash,
  );
}
