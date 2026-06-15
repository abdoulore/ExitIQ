import type { ExitAsset } from "@/lib/assets";

export type ComplianceStatusLevel = "low" | "review" | "unknown";

export type ComplianceStatus = {
  level: ComplianceStatusLevel;
  label: string;
  summary: string;
  flags: string[];
};

export function createComplianceStatus(asset: ExitAsset): ComplianceStatus {
  const flags = [...asset.complianceNotes];

  if (asset.kycRequirement === "required") {
    flags.push("KYC/AML onboarding may be required.");
  }

  if (asset.jurisdictionRestriction === "medium" || asset.jurisdictionRestriction === "high") {
    flags.push("Jurisdiction access limits may apply.");
  }

  if (asset.accreditedInvestorRequired === "yes") {
    flags.push("Accredited investor eligibility may be required.");
  }

  if (
    asset.assetClass === "rwa" ||
    asset.kycRequirement === "unknown" ||
    asset.jurisdictionRestriction === "unknown" ||
    asset.accreditedInvestorRequired === "unknown"
  ) {
    return {
      level: "unknown",
      label: "Eligibility review required",
      summary:
        "Compliance metadata is incomplete or issuer-specific. Verify access rules before allocation.",
      flags,
    };
  }

  if (
    asset.kycRequirement === "required" ||
    asset.jurisdictionRestriction === "medium" ||
    asset.jurisdictionRestriction === "high" ||
    asset.accreditedInvestorRequired === "yes"
  ) {
    return {
      level: "review",
      label: "Compliance review required",
      summary: "The selected asset has one or more compliance gates that should be reviewed.",
      flags,
    };
  }

  return {
    level: "low",
    label: "No explicit gate flagged",
    summary:
      "No KYC or accredited-investor gate is flagged in ExitIQ demo metadata. Users still need to verify issuer and jurisdiction rules.",
    flags,
  };
}
