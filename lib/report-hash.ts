import { keccak256, toHex } from "viem";
import { stableStringify } from "@/lib/hash";

export function createReportHash(report: unknown) {
  return keccak256(toHex(stableStringify(report)));
}

