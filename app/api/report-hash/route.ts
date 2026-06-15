import { createReportHash } from "@/lib/report-hash";

export async function POST(request: Request) {
  try {
    const report = await request.json();
    const reportHash = createReportHash(report);

    return Response.json({ reportHash });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Invalid report-hash request." },
      { status: 400 },
    );
  }
}
