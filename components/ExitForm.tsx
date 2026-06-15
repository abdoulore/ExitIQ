import type { ExitAsset } from "@/lib/assets";
import type { MantleLiveConnectorResult, MantleLiveLiquidityData } from "@/lib/dex/mantleLive";
import type { RiskProfile } from "@/lib/scoring";

type ExitFormProps = {
  assets: ExitAsset[];
  activeAsset: ExitAsset;
  selectedAssetId: string;
  amountUsd: number;
  riskProfile: RiskProfile;
  quickAmounts: number[];
  liveConnector?: MantleLiveConnectorResult;
  selectedLivePool?: MantleLiveLiquidityData | null;
  isLiveLoading?: boolean;
  getQuickAmountHref: (amountUsd: number) => string;
  onAssetChange: (assetId: string) => void;
  onAmountChange: (amountUsd: number) => void;
  onRiskProfileChange: (riskProfile: RiskProfile) => void;
  onLivePoolChange?: (poolId: string) => void;
};

export function ExitForm({
  assets,
  activeAsset,
  selectedAssetId,
  amountUsd,
  riskProfile,
  quickAmounts,
  liveConnector,
  selectedLivePool,
  isLiveLoading = false,
  getQuickAmountHref,
  onAssetChange,
  onAmountChange,
  onRiskProfileChange,
  onLivePoolChange,
}: ExitFormProps) {
  const selectedAsset = assets.find((asset) => asset.id === selectedAssetId) ?? assets[0];
  const liveSupportedConnector = liveConnector?.supported ? liveConnector : null;
  const isLiveFallback = Boolean(liveConnector && !liveConnector.supported);

  return (
    <section className="min-w-0 rounded-xl border border-[var(--line)] bg-[var(--card)] shadow-[var(--shadow)] lg:sticky lg:top-6 lg:self-start">
      <div className="grid gap-5 p-4 sm:p-5">
        {liveSupportedConnector ? (
          <LivePoolSelector
            connector={liveSupportedConnector}
            selectedLivePool={selectedLivePool ?? liveSupportedConnector.liveAssetData}
            onLivePoolChange={onLivePoolChange}
          />
        ) : (
          <label className="grid gap-2" htmlFor="asset">
            <span className="data-label">Fallback scenario</span>
            {isLiveLoading ? (
              <span className="rounded-lg border border-[var(--accent-line)] bg-[var(--accent-bg)] p-3 text-xs font-semibold leading-5 text-[var(--accent)]">
                Loading live Mantle pools. Fallback scenarios are available now.
              </span>
            ) : null}
            {isLiveFallback && !isLiveLoading ? (
              <span className="rounded-lg border border-[var(--warning-line)] bg-[var(--warning-bg)] p-3 text-xs font-semibold leading-5 text-[var(--warning)]">
                Live connector fallback active.
              </span>
            ) : null}
            <select
              id="asset"
              name="assetId"
              value={selectedAssetId}
              onChange={(event) => onAssetChange(event.target.value)}
              className="h-12 w-full min-w-0 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 text-sm font-semibold text-[var(--foreground)] outline-none transition focus:border-[var(--accent)] focus:bg-[var(--card)]"
            >
              {assets.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.name}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="grid gap-2" htmlFor="amount">
          <span className="data-label">Amount in USD</span>
          <span className="relative block">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-lg font-bold text-[var(--muted)]">
              $
            </span>
            <input
              id="amount"
              name="amountUsd"
              type="number"
              min={1}
              step={1}
              value={amountUsd}
              onChange={(event) => onAmountChange(Number(event.target.value))}
              className="h-14 w-full min-w-0 rounded-lg border border-[var(--line)] bg-[var(--surface)] pl-8 pr-3 text-2xl font-bold text-[var(--foreground)] outline-none transition focus:border-[var(--accent)] focus:bg-[var(--card)]"
            />
          </span>
        </label>

        <div>
          <p className="data-label">Quick sizes</p>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
            {quickAmounts.map((quickAmount) => (
              <a
                key={quickAmount}
                href={getQuickAmountHref(quickAmount)}
                onClick={(event) => {
                  event.preventDefault();
                  onAmountChange(quickAmount);
                }}
                className={`inline-flex h-10 min-w-0 items-center justify-center rounded-full border px-3 text-sm font-semibold transition active:translate-y-px ${
                  amountUsd === quickAmount
                    ? "border-[var(--accent)] bg-[var(--accent)] text-white shadow-sm"
                    : "border-[var(--line)] bg-[var(--surface)] text-[var(--foreground)] hover:border-[var(--accent)] hover:bg-[var(--card)]"
                }`}
              >
                {formatQuickAmount(quickAmount)}
              </a>
            ))}
          </div>
        </div>

        <label className="grid gap-2" htmlFor="risk-profile">
          <span className="data-label">Risk profile</span>
          <select
            id="risk-profile"
            name="riskProfile"
            value={riskProfile}
            onChange={(event) => onRiskProfileChange(event.target.value as RiskProfile)}
            className="h-12 w-full min-w-0 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 text-sm font-semibold capitalize text-[var(--foreground)] outline-none transition focus:border-[var(--accent)] focus:bg-[var(--card)]"
          >
            <option value="conservative">Conservative</option>
            <option value="balanced">Balanced</option>
            <option value="aggressive">Aggressive</option>
          </select>
        </label>
      </div>

      <div className="border-t border-[var(--line)] p-4 sm:p-5">
        <div className="rounded-lg bg-[var(--surface)] p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">{activeAsset.symbol}</p>
              <p className="mt-1 truncate text-xs text-[var(--muted)]">{activeAsset.name}</p>
            </div>
            <span className="shrink-0 rounded-full bg-[var(--accent-bg)] px-3 py-1 text-xs font-semibold text-[var(--accent)]">
              {activeAsset.type === "live-pool" ? "Live pool" : `${selectedAsset.apy}% APY`}
            </span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Metric label="Liquidity" value={`$${activeAsset.liquidityUsd.toLocaleString("en-US")}`} />
            <Metric label="24h volume" value={`$${activeAsset.dailyVolumeUsd.toLocaleString("en-US")}`} />
          </div>
        </div>

        <p className="mt-3 text-xs leading-5 text-[var(--muted)]">
          Live mode uses GeckoTerminal Mantle pool data where available. Demo mode uses seeded liquidity scenarios for reliable judging.
        </p>
      </div>
    </section>
  );
}

function LivePoolSelector({
  connector,
  selectedLivePool,
  onLivePoolChange,
}: {
  connector: Extract<MantleLiveConnectorResult, { supported: true }>;
  selectedLivePool: MantleLiveLiquidityData;
  onLivePoolChange?: (poolId: string) => void;
}) {
  return (
    <div className="grid gap-3 rounded-xl border border-[var(--accent-line)] bg-[var(--accent-bg)] p-3">
      <label className="grid gap-2" htmlFor="live-pool">
        <span className="data-label text-[var(--accent)]">Pool to score</span>
        <select
          id="live-pool"
          name="assetId"
          value={selectedLivePool.id}
          onChange={(event) => onLivePoolChange?.(event.target.value)}
          className="h-12 w-full min-w-0 rounded-lg border border-[var(--accent-line)] bg-[var(--card)] px-3 text-sm font-semibold text-[var(--foreground)] outline-none transition focus:border-[var(--accent)]"
        >
          {connector.livePools.map((pool) => (
            <option key={pool.id} value={pool.id}>
              {pool.name} - {pool.dexName ?? "Unknown DEX"}
            </option>
          ))}
        </select>
      </label>

      <div className="grid grid-cols-2 gap-2 text-xs text-[var(--muted)]">
        <div className="rounded-lg bg-[var(--card)] p-3">
          <p className="data-label">DEX</p>
          <p className="mt-1 truncate font-semibold text-[var(--foreground)]">
            {selectedLivePool.dexName ?? "Unknown"}
          </p>
        </div>
        <div className="rounded-lg bg-[var(--card)] p-3">
          <p className="data-label">Pools loaded</p>
          <p className="mt-1 font-semibold text-[var(--foreground)]">{connector.livePools.length}</p>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-[var(--card)] p-3">
      <p className="data-label">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold">{value}</p>
    </div>
  );
}

function formatQuickAmount(value: number) {
  if (value >= 1000) {
    return `$${value / 1000}k`;
  }

  return `$${value}`;
}
