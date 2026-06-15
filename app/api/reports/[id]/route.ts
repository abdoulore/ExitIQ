import { NextResponse } from "next/server";
import type { ReportTransactionUpdate } from "@/lib/reports";
import { getReportById, updateReportTransaction } from "@/lib/server/reportStore";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const report = await getReportById(id);

  if (!report) {
    return NextResponse.json({ error: "Report not found." }, { status: 404 });
  }

  return NextResponse.json({ report });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const update = (await request.json()) as ReportTransactionUpdate;

    if (!update.reportHash || !update.transactionHash) {
      return NextResponse.json({ error: "Invalid transaction update." }, { status: 400 });
    }

    const report = await updateReportTransaction(id, update);

    if (!report) {
      return NextResponse.json({ error: "Report not found." }, { status: 404 });
    }

    return NextResponse.json({ report });
  } catch {
    return NextResponse.json({ error: "Unable to update report." }, { status: 500 });
  }
}
