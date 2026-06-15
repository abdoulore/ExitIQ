"use client";

import { useMemo, useState } from "react";
import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  isAddress,
  type Address,
  type Hex,
} from "viem";
import { createReportHash } from "@/lib/report-hash";
import {
  exitReportRegistryAbi,
  exitReportRegistryAddress,
  getMantleTxUrl,
  gradeToRegistryScore,
  mantleRegistryChain,
} from "@/lib/registry";
import type { ReportTransactionUpdate } from "@/lib/reports";
import type { ExitCheckResult } from "@/lib/scoring";

type BrowserEthereumProvider = Parameters<typeof custom>[0];
type SaveStatus = "idle" | "connecting" | "signing" | "submitted" | "success" | "error";

declare global {
  interface Window {
    ethereum?: BrowserEthereumProvider;
  }
}

const publicClient = createPublicClient({
  chain: mantleRegistryChain,
  transport: http(mantleRegistryChain.rpcUrls.default.http[0]),
});

export function ReportRegistryPanel({
  result,
  onReportSaved,
}: {
  result: ExitCheckResult;
  onReportSaved?: (update: ReportTransactionUpdate) => void;
}) {
  const [account, setAccount] = useState<Address | null>(null);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [reportHash, setReportHash] = useState<Hex | null>(null);
  const [txHash, setTxHash] = useState<Hex | null>(null);

  const registryAddress = useMemo(() => {
    if (!exitReportRegistryAddress || !isAddress(exitReportRegistryAddress)) {
      return undefined;
    }

    return exitReportRegistryAddress;
  }, []);
  const registryConfigured = Boolean(registryAddress);
  const isBusy = status === "connecting" || status === "signing" || status === "submitted";
  const txLink = txHash ? getMantleTxUrl(txHash) : undefined;

  async function connectWallet() {
    setStatus("connecting");
    setError(null);

    try {
      const walletClient = getWalletClient();
      await ensureMantleMainnet(walletClient);
      const addresses = await walletClient.requestAddresses();
      setAccount(addresses[0] ?? null);
      setStatus("idle");
    } catch (connectError) {
      setStatus("error");
      setError(toErrorMessage(connectError, "Wallet connection failed."));
    }
  }

  async function saveReportHash() {
    setError(null);

    if (!registryAddress) {
      setStatus("error");
      setError("Registry contract not configured yet.");
      return;
    }

    try {
      setStatus("signing");

      const walletClient = getWalletClient();
      await ensureMantleMainnet(walletClient);

      const addresses = account ? [account] : await walletClient.requestAddresses();
      const activeAccount = addresses[0];

      if (!activeAccount) {
        throw new Error("Connect a wallet before saving the report.");
      }

      setAccount(activeAccount);

      const hash = createReportHash(result);
      const numericExitScore = gradeToRegistryScore(result.exitScore);
      const amountUsd = BigInt(Math.round(result.amountUsd));
      setReportHash(hash);

      const transactionHash = await walletClient.writeContract({
        address: registryAddress,
        abi: exitReportRegistryAbi,
        functionName: "saveExitReport",
        args: [result.asset.address, amountUsd, hash, numericExitScore],
        account: activeAccount,
        chain: mantleRegistryChain,
      });

      setTxHash(transactionHash);
      setStatus("submitted");

      const receipt = await publicClient.waitForTransactionReceipt({
        hash: transactionHash,
      });

      if (receipt.status !== "success") {
        throw new Error("Transaction was submitted but did not succeed.");
      }

      setStatus("success");
      onReportSaved?.({
        reportHash: hash,
        transactionHash,
      });
    } catch (saveError) {
      setStatus("error");
      setError(toErrorMessage(saveError, "Could not save report hash."));
    }
  }

  return (
    <section className="rounded-lg border border-[var(--line)] bg-[var(--card)] p-5 shadow-[var(--shadow)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="data-label">Onchain registry</p>
          <h2 className="mt-2 text-xl font-semibold">Save report hash</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            Commit the current ExitIQ report hash to Mantle mainnet without changing the position.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row lg:flex-col xl:flex-row">
          <button
            type="button"
            onClick={connectWallet}
            disabled={isBusy}
            className="inline-flex h-10 items-center justify-center rounded-md border border-[var(--line)] bg-[var(--card)] px-4 text-sm font-semibold transition hover:bg-[var(--surface)] active:translate-y-px disabled:cursor-wait disabled:opacity-70"
          >
            {account ? shortAddress(account) : status === "connecting" ? "Connecting..." : "Connect Wallet"}
          </button>
          <button
            type="button"
            onClick={saveReportHash}
            disabled={!registryConfigured || isBusy}
            className="inline-flex h-10 items-center justify-center rounded-md bg-[var(--accent)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--accent-strong)] active:translate-y-px disabled:cursor-not-allowed disabled:bg-[var(--surface)]"
          >
            {status === "signing"
              ? "Confirm in wallet..."
              : status === "submitted"
                ? "Waiting for receipt..."
                : "Save Hash Onchain"}
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <InfoTile label="Network" value={`Mantle mainnet (${mantleRegistryChain.id})`} />
        <InfoTile label="Asset address" value={shortAddress(result.asset.address)} />
        <InfoTile label="Registry score" value={`${result.exitScore} = ${gradeToRegistryScore(result.exitScore)}`} />
      </div>

      {!registryConfigured ? (
        <p className="mt-4 rounded-md border border-[var(--warning-line)] bg-[var(--warning-bg)] p-3 text-sm font-semibold text-[var(--warning)]">
          Registry contract not configured yet.
        </p>
      ) : null}

      {reportHash ? (
        <div className="mt-4 rounded-md border border-[var(--line)] bg-[var(--surface)] p-3">
          <p className="text-xs text-[var(--muted)]">Report hash</p>
          <p className="mono mt-1 break-all text-xs font-semibold">{reportHash}</p>
        </div>
      ) : null}

      {status === "success" ? (
        <p className="mt-4 rounded-md border border-[var(--success-line)] bg-[var(--success-bg)] p-3 text-sm font-semibold text-[var(--success)]">
          Report hash saved on Mantle mainnet.
        </p>
      ) : null}

      {txHash ? (
        <div className="mt-4 rounded-md border border-[var(--line)] bg-[var(--surface)] p-3">
          <p className="text-xs text-[var(--muted)]">Transaction hash</p>
          <a
            href={txLink}
            target="_blank"
            rel="noreferrer"
            className="mono mt-1 block break-all text-xs font-semibold text-[var(--accent)] hover:text-[var(--accent-strong)]"
          >
            {txHash}
          </a>
          <p className="mt-2 text-xs text-[var(--muted)]">Mantle mainnet explorer link.</p>
        </div>
      ) : null}

      {error ? (
        <p className="mt-4 rounded-md border border-[var(--danger-line)] bg-[var(--danger-bg)] p-3 text-sm font-semibold text-[var(--danger)]">
          {error}
        </p>
      ) : null}
    </section>
  );
}

function getWalletClient() {
  if (!window.ethereum) {
    throw new Error("Browser wallet not found.");
  }

  return createWalletClient({
    chain: mantleRegistryChain,
    transport: custom(window.ethereum),
  });
}

async function ensureMantleMainnet(walletClient: ReturnType<typeof getWalletClient>) {
  try {
    await walletClient.switchChain({ id: mantleRegistryChain.id });
  } catch {
    try {
      await walletClient.addChain({ chain: mantleRegistryChain });
      await walletClient.switchChain({ id: mantleRegistryChain.id });
    } catch {
      throw new Error("Switch wallet to Mantle mainnet to save the report.");
    }
  }
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[var(--line)] bg-[var(--surface)] p-3">
      <p className="text-xs text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}

function shortAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function toErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}
