"use client";

import { useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { ExitForm } from "@/components/ExitForm";
import { ScoreBadge } from "@/components/ScoreBadge";
import { demoAssets } from "@/lib/assets";
import {
  defaultMantleLivePoolLimit,
  getMantleLiveFallback,
  type MantleLiveConnectorResult,
} from "@/lib/dex/mantleLive";
import { createReviewHref, type ExitReviewState } from "@/lib/review-state";
import {
  type ExitCheckResult,
  type ExitMode,
  type RiskProfile,
  runExitCheckForAsset,
} from "@/lib/scoring";

const quickAmounts = [1000, 10000, 50000, 100000];

export function ExitCheckClient() {
  const searchParams = useSearchParams();
  const initialAssetId = searchParams.get("assetId") ?? "meth";
  const initialAmountUsd = Number(searchParams.get("amountUsd") ?? "1000");
  const initialRiskProfile = normalizeRiskProfile(searchParams.get("riskProfile"));
  const initialMode = normalizeMode(searchParams.get("mode"));

  const [assetId, setAssetId] = useState(initialAssetId);
  const [amountUsd, setAmountUsd] = useState(
    Number.isFinite(initialAmountUsd) && initialAmountUsd > 0 ? initialAmountUsd : 1000,
  );
  const [riskProfile, setRiskProfile] = useState<RiskProfile>(initialRiskProfile);
  const [liveConnector, setLiveConnector] = useState<MantleLiveConnectorResult>(() =>
    getMantleLiveFallback(initialAssetId),
  );
  const [selectedLivePoolId, setSelectedLivePoolId] = useState<string | null>(
    initialMode === "live" ? initialAssetId : null,
  );
  const [isLiveLoading, setIsLiveLoading] = useState(true);

  const selectedAsset = useMemo(
    () => demoAssets.find((asset) => asset.id === assetId) ?? demoAssets[0],
    [assetId],
  );
  const liveScoringAsset =
    liveConnector.supported
      ? liveConnector.livePools.find((pool) => pool.id === selectedLivePoolId) ?? liveConnector.liveAssetData
      : null;
  const activeAsset = liveScoringAsset ?? selectedAsset;
  const activeMode: ExitMode = liveScoringAsset ? "live" : "demo";

  const result = useMemo(
    () =>
      runExitCheckForAsset(activeAsset, {
        assetId: activeAsset.id,
        amountUsd,
        riskProfile,
        timeHorizonDays: 7,
        mode: activeMode,
      }),
    [activeAsset, activeMode, amountUsd, riskProfile],
  );
  const reviewState = useMemo<ExitReviewState>(
    () => ({
      assetId: activeAsset.id,
      amountUsd,
      riskProfile,
      mode: activeMode,
    }),
    [activeAsset.id, activeMode, amountUsd, riskProfile],
  );

  useEffect(() => {
    let isCurrent = true;
    const loadingTimeout = window.setTimeout(() => {
      if (isCurrent) {
        setIsLiveLoading(false);
      }
    }, 7000);

    async function loadInitialLivePools() {
      setIsLiveLoading(true);

      try {
        const connector = await fetchLivePools(initialAssetId);

        if (!isCurrent) {
          return;
        }

        setLiveConnector(connector);

        if (connector.supported) {
          setSelectedLivePoolId(connector.liveAssetData.id);
        } else {
          setSelectedLivePoolId(null);
        }
      } finally {
        if (isCurrent) {
          setIsLiveLoading(false);
        }
      }
    }

    void loadInitialLivePools();

    return () => {
      isCurrent = false;
      window.clearTimeout(loadingTimeout);
    };
  }, [initialAssetId]);

  function handleAssetChange(nextAssetId: string) {
    setAssetId(nextAssetId);
  }

  function handleLivePoolChange(poolId: string) {
    setSelectedLivePoolId(poolId);
  }

  function getQuickAmountHref(quickAmount: number) {
    return createReviewHref("/check", {
      ...reviewState,
      amountUsd: quickAmount,
    });
  }

  return (
    <main className="min-h-[100dvh] bg-[var(--background)] px-4 pb-10 text-[var(--foreground)] sm:px-5">
      <div className="mx-auto max-w-7xl">
        <AppHeader
          active="check"
          eyebrow="Pre-entry exit risk"
          title="Set up your exit check"
          description="Pick an asset, enter the size, and see how exit risk changes."
        />

        <form action="/check/result" method="get" className="mx-auto mt-6 grid max-w-5xl gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
          <input type="hidden" name="mode" value={activeMode} />

          <div className="min-w-0 [&>section]:lg:static [&>section]:lg:top-auto">
            <ExitForm
              assets={demoAssets}
              activeAsset={activeAsset}
              selectedAssetId={selectedAsset.id}
              amountUsd={amountUsd}
              riskProfile={riskProfile}
              quickAmounts={quickAmounts}
              liveConnector={liveConnector}
              selectedLivePool={liveScoringAsset}
              isLiveLoading={isLiveLoading}
              getQuickAmountHref={getQuickAmountHref}
              onAssetChange={handleAssetChange}
              onAmountChange={setAmountUsd}
              onRiskProfileChange={setRiskProfile}
              onLivePoolChange={handleLivePoolChange}
            />
          </div>

          <aside className="grid min-w-0 gap-4 lg:sticky lg:top-6">
            <LivePreviewStrip result={result} />
            <button
              type="submit"
              className="inline-flex h-12 w-full items-center justify-center rounded-full bg-[var(--accent)] px-5 text-sm font-semibold text-white transition hover:bg-[var(--accent-strong)] active:translate-y-px"
            >
              See exit risk -&gt;
            </button>
            <p className="rounded-xl border border-[var(--line)] bg-[var(--card)] p-4 text-xs leading-5 text-[var(--muted)]">
              Use the quick sizes to compare how the same position changes from survivable to dangerous as size grows.
            </p>
          </aside>
        </form>
      </div>
    </main>
  );
}

function LivePreviewStrip({
  result,
}: {
  result: ExitCheckResult;
}) {
  return (
    <section className="rounded-xl border border-[var(--line)] bg-[var(--card)] p-4 shadow-sm">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <PreviewMetric label="Grade" value={<ScoreBadge grade={result.exitScore} />} />
        <PreviewMetric label="Verdict" value={formatVerdict(result.verdict)} />
        <PreviewMetric label="Slippage" value={`${result.estimatedSlippagePct}%`} />
        <PreviewMetric label="Max safe" value={`$${result.maxSafeSizeUsd.toLocaleString("en-US")}`} />
      </div>
    </section>
  );
}

function PreviewMetric({
  label,
  value,
}: {
  label: string;
  value: string | ReactNode;
}) {
  return (
    <div className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-3">
      <p className="data-label">{label}</p>
      <div className="mt-2 min-h-9 text-sm font-semibold capitalize">{value}</div>
    </div>
  );
}

function normalizeRiskProfile(value: string | null): RiskProfile {
  if (value === "conservative" || value === "aggressive") {
    return value;
  }

  return "balanced";
}

async function fetchLivePools(assetId: string) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 12000);

  try {
    const searchParams = new URLSearchParams({
      assetId,
      limit: String(defaultMantleLivePoolLimit),
    });
    const response = await fetch(`/api/live-pools?${searchParams.toString()}`, {
      headers: {
        accept: "application/json",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error("Live pool request failed.");
    }

    return (await response.json()) as MantleLiveConnectorResult;
  } catch {
    return getMantleLiveFallback(assetId);
  } finally {
    window.clearTimeout(timeout);
  }
}

function normalizeMode(value: string | null): ExitMode {
  return value === "live" ? "live" : "demo";
}

function formatVerdict(verdict: ExitCheckResult["verdict"]) {
  return verdict.replaceAll("_", " ");
}
