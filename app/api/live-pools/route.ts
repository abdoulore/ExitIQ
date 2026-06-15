import { defaultMantleLivePoolLimit, fetchMantlePools } from "@/lib/dex/mantleLive";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const assetId = searchParams.get("assetId") ?? undefined;
  const limit = Number(searchParams.get("limit") ?? defaultMantleLivePoolLimit);

  const connector = await fetchMantlePools({
    assetId: assetId ?? "",
    limit,
  });

  return Response.json(connector);
}
