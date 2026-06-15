import type { Hex } from "viem";
import type { AgentExitDecision } from "@/lib/agentDecision";
import type { ExitCheckResult } from "@/lib/scoring";

export type StoredExitReport = {
  id: string;
  createdAt: string;
  result: ExitCheckResult;
  aiMemo: string;
  agentDecision?: AgentExitDecision;
  reportHash: Hex;
  transactionHash?: Hex;
};

export type ReportTransactionUpdate = {
  reportHash: Hex;
  transactionHash: Hex;
};
