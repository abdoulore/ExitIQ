import { promises as fs } from "node:fs";
import path from "node:path";
import { getReportById } from "@/lib/server/reportStore";
import { hasSupabaseConfig, supabaseRequest } from "@/lib/server/supabaseRest";
import {
  createWatchlistItem,
  type WatchlistItem,
  type WatchlistRecord,
} from "@/lib/watchlist";

type WatchlistDb = {
  items: Record<string, WatchlistRecord>;
};

const dataDir = path.join(process.cwd(), ".data");
const watchlistPath = path.join(dataDir, "watchlist.json");

let writeQueue = Promise.resolve();

export async function listWatchlistItems(): Promise<WatchlistItem[]> {
  if (hasSupabaseConfig) {
    try {
      return await listWatchlistItemsFromSupabase();
    } catch (error) {
      console.error("Supabase listWatchlistItems failed, falling back to local storage.", error);
    }
  }

  const db = await readWatchlistDb();
  const records = Object.values(db.items).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  const enrichedItems = await Promise.all(
    records.map(async (record) => {
      const report = await getReportById(record.reportId);

      if (!report) {
        return null;
      }

      return createWatchlistItem(record, report);
    }),
  );

  return enrichedItems.filter((item): item is WatchlistItem => Boolean(item));
}

export async function addReportToWatchlist(reportId: string) {
  const report = await getReportById(reportId);

  if (!report) {
    return null;
  }

  if (hasSupabaseConfig) {
    try {
      return await addReportToWatchlistInSupabase(reportId);
    } catch (error) {
      console.error("Supabase addReportToWatchlist failed, falling back to local storage.", error);
    }
  }

  return enqueueWrite(async () => {
    const db = await readWatchlistDb();
    const existingRecord = db.items[reportId];
    const record =
      existingRecord ??
      ({
        reportId,
        createdAt: new Date().toISOString(),
      } satisfies WatchlistRecord);

    db.items[reportId] = record;
    await writeWatchlistDb(db);

    return createWatchlistItem(record, report);
  });
}

async function listWatchlistItemsFromSupabase() {
  const rows = await supabaseRequest<SupabaseWatchlistRow[]>({
    path: "watchlist?select=id,report_id,status,created_at&order=created_at.desc",
  });
  const enrichedItems = await Promise.all(
    rows.map(async (row) => {
      const report = await getReportById(row.report_id);

      if (!report) {
        return null;
      }

      return createWatchlistItem(
        {
          reportId: row.report_id,
          createdAt: row.created_at,
        },
        report,
      );
    }),
  );

  return enrichedItems.filter((item): item is WatchlistItem => Boolean(item));
}

async function addReportToWatchlistInSupabase(reportId: string) {
  const report = await getReportById(reportId);

  if (!report) {
    return null;
  }

  const item = createWatchlistItem(
    {
      reportId,
      createdAt: new Date().toISOString(),
    },
    report,
  );
  const rows = await supabaseRequest<SupabaseWatchlistRow[]>({
    path: "watchlist?on_conflict=id",
    init: {
      method: "POST",
      headers: {
        Prefer: "resolution=merge-duplicates,return=representation",
      },
      body: JSON.stringify({
        id: reportId,
        report_id: reportId,
        status: item.status,
      }),
    },
  });
  const savedRow = rows[0];

  if (!savedRow) {
    return item;
  }

  return createWatchlistItem(
    {
      reportId: savedRow.report_id,
      createdAt: savedRow.created_at,
    },
    report,
  );
}

function enqueueWrite<T>(operation: () => Promise<T>) {
  const nextWrite = writeQueue.then(operation, operation);
  writeQueue = nextWrite.then(
    () => undefined,
    () => undefined,
  );

  return nextWrite;
}

async function readWatchlistDb(): Promise<WatchlistDb> {
  try {
    const rawDb = await fs.readFile(watchlistPath, "utf8");
    const parsedDb = JSON.parse(rawDb) as WatchlistDb;

    if (!parsedDb.items || typeof parsedDb.items !== "object") {
      return { items: {} };
    }

    return parsedDb;
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      return { items: {} };
    }

    throw error;
  }
}

async function writeWatchlistDb(db: WatchlistDb) {
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(watchlistPath, `${JSON.stringify(db, null, 2)}\n`);
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}

type SupabaseWatchlistRow = {
  id: string;
  report_id: string;
  status: string;
  created_at: string;
};
