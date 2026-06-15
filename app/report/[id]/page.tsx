import { ReportPageClient } from "@/components/ReportPageClient";
import { getReportById } from "@/lib/server/reportStore";

export default async function ReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const report = await getReportById(id);

  return <ReportPageClient reportId={id} initialReport={report} />;
}
