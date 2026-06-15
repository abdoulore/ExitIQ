import { createComplianceStatus } from "@/lib/compliance";
import type { ExitCheckResult } from "@/lib/scoring";

const legalDisclosure =
  "This is not legal advice. ExitIQ flags compliance awareness items only. Users must verify issuer rules, KYC/AML requirements, jurisdiction access, and investor eligibility before entering RWA positions.";

export function CompliancePanel({ result }: { result: ExitCheckResult }) {
  const { asset } = result;
  const complianceStatus = result.complianceStatus ?? createComplianceStatus(asset);

  return (
    <section className="rounded-xl border border-[var(--line)] bg-[var(--card)] p-5 shadow-[var(--shadow)]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="data-label">Compliance awareness</p>
          <h2 className="mt-2 text-xl font-semibold">{complianceStatus.label}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">{complianceStatus.summary}</p>
        </div>
        <span
          className={`inline-flex h-10 w-fit items-center rounded-full border px-4 text-sm font-semibold capitalize ${statusClass(
            complianceStatus.level,
          )}`}
        >
          {formatAssetClass(asset.assetClass)}
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <ComplianceMetric label="KYC/AML" value={formatValue(asset.kycRequirement)} />
        <ComplianceMetric
          label="Jurisdiction limits"
          value={formatValue(asset.jurisdictionRestriction)}
        />
        <ComplianceMetric
          label="Accredited investor"
          value={formatValue(asset.accreditedInvestorRequired)}
        />
        <ComplianceMetric label="Asset class" value={formatAssetClass(asset.assetClass)} />
      </div>

      {complianceStatus.flags.length > 0 ? (
        <div className="mt-5 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4">
          <p className="text-sm font-semibold">Awareness notes</p>
          <ul className="mt-3 grid gap-2 text-sm leading-6 text-[var(--muted)]">
            {complianceStatus.flags.map((note) => (
              <li key={note} className="flex gap-2">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--warning)]" />
                <span>{note}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="mt-5 rounded-lg border border-[var(--warning-line)] bg-[var(--warning-bg)] p-3 text-[11px] font-semibold leading-5 text-[var(--warning)]">
        {legalDisclosure}
      </p>
    </section>
  );
}

function ComplianceMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-3">
      <p className="data-label">{label}</p>
      <p className="mt-1 text-sm font-semibold capitalize">{value}</p>
    </div>
  );
}

function statusClass(level: ExitCheckResult["complianceStatus"]["level"]) {
  if (level === "low") {
    return "border-[var(--success-line)] bg-[var(--success-bg)] text-[var(--success)]";
  }

  if (level === "review") {
    return "border-[var(--warning-line)] bg-[var(--warning-bg)] text-[var(--warning)]";
  }

  return "border-[var(--danger-line)] bg-[var(--danger-bg)] text-[var(--danger)]";
}

function formatAssetClass(value: string) {
  return value.replaceAll("-", " ");
}

function formatValue(value: string) {
  return value.replaceAll("_", " ");
}
