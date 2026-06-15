import { demoAssets } from "@/lib/assets";

export async function GET() {
  return Response.json(demoAssets);
}

