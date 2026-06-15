import { NextResponse } from "next/server";
import { addReportToWatchlist, listWatchlistItems } from "@/lib/server/watchlistStore";

export const runtime = "nodejs";

export async function GET() {
  const items = await listWatchlistItems();

  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { reportId?: string };

    if (!body.reportId) {
      return NextResponse.json({ error: "reportId is required." }, { status: 400 });
    }

    const item = await addReportToWatchlist(body.reportId);

    if (!item) {
      return NextResponse.json({ error: "Report not found." }, { status: 404 });
    }

    return NextResponse.json({ item });
  } catch {
    return NextResponse.json({ error: "Unable to update watchlist." }, { status: 500 });
  }
}
