import { defineChain, type Address } from "viem";
import type { ExitGrade } from "@/lib/scoring";

export const mantleMainnet = defineChain({
  id: 5000,
  name: "Mantle",
  nativeCurrency: {
    decimals: 18,
    name: "Mantle",
    symbol: "MNT",
  },
  rpcUrls: {
    default: {
      http: ["https://rpc.mantle.xyz"],
    },
  },
  blockExplorers: {
    default: {
      name: "Mantle Explorer",
      url: "https://explorer.mantle.xyz",
    },
  },
  testnet: false,
});

export const mantleRegistryChain = mantleMainnet;

export const deployedExitReportRegistryAddress =
  "0x160493BC227713b256344E382f02d2adbFD0555e" as const;

export const exitReportRegistryAddress = (process.env
  .NEXT_PUBLIC_EXIT_REPORT_REGISTRY_ADDRESS || deployedExitReportRegistryAddress) as Address;

export const exitReportRegistryAbi = [
  {
    type: "function",
    name: "saveExitReport",
    stateMutability: "nonpayable",
    inputs: [
      { name: "asset", type: "address" },
      { name: "amountUsd", type: "uint256" },
      { name: "reportHash", type: "bytes32" },
      { name: "exitScore", type: "uint8" },
    ],
    outputs: [{ name: "reportId", type: "uint256" }],
  },
] as const;

export function gradeToRegistryScore(grade: ExitGrade) {
  const scores: Record<ExitGrade, number> = {
    A: 5,
    B: 4,
    C: 3,
    D: 2,
    F: 1,
  };

  return scores[grade];
}

export function getMantleTxUrl(txHash: string) {
  return `${mantleRegistryChain.blockExplorers.default.url}/tx/${txHash}`;
}
