import { demoAssets, getAssetById, type ExitAsset } from "@/lib/assets";

const geckoTerminalMantlePoolsBaseUrl =
  "https://api.geckoterminal.com/api/v2/networks/mantle/pools?include=base_token,quote_token,dex";
const geckoTerminalPageSize = 20;
const maxGeckoTerminalPages = 5;
const geckoTerminalRequestTimeoutMs = 5000;

// One page (20 pools) keeps the initial /check load to a single fast request and
// is plenty for the pool selector; the connector falls back to seeded demo data
// if the request is slow or unavailable.
export const defaultMantleLivePoolLimit = 20;

export const mantleMainnetReadConfig = {
  chainId: 5000,
  rpcUrl: "https://rpc.mantle.xyz",
  source: "mantle-mainnet",
  geckoTerminalNetworkId: "mantle",
} as const;

export type MantleLiveLiquidityRequest = {
  assetId: string;
  limit?: number;
};

export type MantleLiveLiquidityData = {
  id: string;
  name: string;
  symbol: string;
  address: `0x${string}`;
  type: "live-pool";
  liquidityUsd: number;
  dailyVolumeUsd: number;
  routes: 1;
  apy: 0;
  riskTag: "Live pool";
  route: string[];
  assetClass: "defi-pool";
  kycRequirement: "unknown";
  jurisdictionRestriction: "unknown";
  accreditedInvestorRequired: "unknown";
  complianceNotes: string[];
  poolAddress: `0x${string}`;
  baseTokenSymbol: string;
  quoteTokenSymbol: string;
  dexName?: string;
  chainId: typeof mantleMainnetReadConfig.chainId;
  rpcUrl: typeof mantleMainnetReadConfig.rpcUrl;
  geckoTerminalNetworkId: typeof mantleMainnetReadConfig.geckoTerminalNetworkId;
  fetchedAt: string;
};

export type MantleLiveConnectorResult =
  | {
      supported: true;
      reason: "GeckoTerminal Mantle pool data active";
      livePools: MantleLiveLiquidityData[];
      liveAssetData: MantleLiveLiquidityData;
      chainId: typeof mantleMainnetReadConfig.chainId;
      rpcUrl: typeof mantleMainnetReadConfig.rpcUrl;
      fetchedAt: string;
    }
  | {
      supported: false;
      reason: "Live connector fallback active";
      fallbackAssetData: ExitAsset;
      fallbackPools: ExitAsset[];
      chainId: typeof mantleMainnetReadConfig.chainId;
      rpcUrl: typeof mantleMainnetReadConfig.rpcUrl;
      fetchedAt: string;
    };

export type MantleLiveLiquidityConnector = {
  fetchLiquidityData: (request: MantleLiveLiquidityRequest) => Promise<MantleLiveConnectorResult>;
};

export const mantleLiveLiquidityConnector: MantleLiveLiquidityConnector = {
  fetchLiquidityData: fetchMantlePools,
};

export async function fetchMantlePools(
  request: MantleLiveLiquidityRequest = { assetId: demoAssets[0].id },
): Promise<MantleLiveConnectorResult> {
  try {
    const limit = normalizePoolLimit(request.limit);
    const payloads = await fetchGeckoTerminalPoolPages(limit);
    const fetchedAt = new Date().toISOString();
    const livePools = uniqueLivePools(
      payloads.flatMap((payload) => mapGeckoTerminalPools(payload, fetchedAt)),
    ).slice(0, limit);

    if (livePools.length === 0) {
      throw new Error("GeckoTerminal returned no Mantle pools.");
    }
    const selectedLivePool =
      livePools.find((pool) => pool.id === request.assetId) ??
      livePools.find((pool) => pool.poolAddress.toLowerCase() === request.assetId.toLowerCase()) ??
      livePools[0];

    return {
      supported: true,
      reason: "GeckoTerminal Mantle pool data active",
      livePools,
      liveAssetData: selectedLivePool,
      chainId: mantleMainnetReadConfig.chainId,
      rpcUrl: mantleMainnetReadConfig.rpcUrl,
      fetchedAt,
    };
  } catch {
    return getMantleLiveFallback(request.assetId);
  }
}

async function fetchGeckoTerminalPoolPages(limit: number) {
  const pageCount = Math.min(maxGeckoTerminalPages, Math.ceil(limit / geckoTerminalPageSize));
  const payloads: GeckoTerminalPoolsResponse[] = [];

  for (let page = 1; page <= pageCount; page += 1) {
    try {
      const response = await fetchWithTimeout(
        `${geckoTerminalMantlePoolsBaseUrl}&page=${page}`,
        {
          headers: {
            accept: "application/json",
          },
        },
        geckoTerminalRequestTimeoutMs,
      );

      if (!response.ok) {
        throw new Error(`GeckoTerminal request failed with ${response.status}.`);
      }

      const payload = (await response.json()) as GeckoTerminalPoolsResponse;

      if (!payload.data || payload.data.length === 0) {
        break;
      }

      payloads.push(payload);
    } catch (error) {
      if (payloads.length === 0) {
        throw error;
      }

      break;
    }
  }

  return payloads;
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function normalizePoolLimit(limit: number | undefined) {
  if (!Number.isFinite(limit)) {
    return defaultMantleLivePoolLimit;
  }

  return Math.min(
    geckoTerminalPageSize * maxGeckoTerminalPages,
    Math.max(1, Math.floor(limit ?? defaultMantleLivePoolLimit)),
  );
}

function uniqueLivePools(pools: MantleLiveLiquidityData[]) {
  const seen = new Set<string>();
  const uniquePools: MantleLiveLiquidityData[] = [];

  for (const pool of pools) {
    if (seen.has(pool.poolAddress)) {
      continue;
    }

    seen.add(pool.poolAddress);
    uniquePools.push(pool);
  }

  return uniquePools;
}

export function getMantleLiveFallback(assetId: string): MantleLiveConnectorResult {
  return {
    supported: false,
    reason: "Live connector fallback active",
    fallbackAssetData: getAssetById(assetId) ?? demoAssets[0],
    fallbackPools: demoAssets,
    chainId: mantleMainnetReadConfig.chainId,
    rpcUrl: mantleMainnetReadConfig.rpcUrl,
    fetchedAt: new Date().toISOString(),
  };
}

function mapGeckoTerminalPools(
  payload: GeckoTerminalPoolsResponse,
  fetchedAt: string,
): MantleLiveLiquidityData[] {
  const included = new Map(payload.included?.map((item) => [item.id, item]) ?? []);

  return (payload.data ?? [])
    .map((pool) => {
      const attributes = pool.attributes;
      const poolAddress = normalizeAddress(attributes?.address);

      if (!attributes || !poolAddress) {
        return undefined;
      }

      const baseToken = getIncludedAttributes(pool.relationships?.base_token?.data?.id, included);
      const quoteToken = getIncludedAttributes(pool.relationships?.quote_token?.data?.id, included);
      const dex = getIncludedAttributes(pool.relationships?.dex?.data?.id, included);
      const baseTokenSymbol = readString(baseToken?.symbol) ?? parsePoolSymbols(attributes.name).base;
      const quoteTokenSymbol = readString(quoteToken?.symbol) ?? parsePoolSymbols(attributes.name).quote;
      const dexName = readString(dex?.name);
      const liquidityUsd = parseUsd(attributes.reserve_in_usd);
      const dailyVolumeUsd = parseUsd(attributes.volume_usd?.h24);

      const livePool: MantleLiveLiquidityData = {
        id: `live-${poolAddress.slice(2).toLowerCase()}`,
        name: attributes.name || `${baseTokenSymbol} / ${quoteTokenSymbol}`,
        symbol: baseTokenSymbol,
        address: poolAddress,
        type: "live-pool" as const,
        liquidityUsd,
        dailyVolumeUsd,
        routes: 1,
        apy: 0,
        riskTag: "Live pool" as const,
        route: [dexName ? `${dexName} pool` : "GeckoTerminal Mantle pool"],
        assetClass: "defi-pool" as const,
        kycRequirement: "unknown" as const,
        jurisdictionRestriction: "unknown" as const,
        accreditedInvestorRequired: "unknown" as const,
        complianceNotes: [
          "Live pool metadata comes from GeckoTerminal and does not verify compliance requirements.",
          "Protocol terms, frontend access, and jurisdiction eligibility should be checked separately.",
        ],
        poolAddress,
        baseTokenSymbol,
        quoteTokenSymbol,
        chainId: mantleMainnetReadConfig.chainId,
        rpcUrl: mantleMainnetReadConfig.rpcUrl,
        geckoTerminalNetworkId: mantleMainnetReadConfig.geckoTerminalNetworkId,
        fetchedAt,
      };

      if (dexName) {
        livePool.dexName = dexName;
      }

      return livePool;
    })
    .filter((pool): pool is MantleLiveLiquidityData => Boolean(pool));
}

function getIncludedAttributes(id: string | undefined, included: Map<string, GeckoTerminalIncluded>) {
  if (!id) {
    return undefined;
  }

  return included.get(id)?.attributes;
}

function parseUsd(value: string | null | undefined) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }

  return Math.round(parsed);
}

function normalizeAddress(value: string | undefined): `0x${string}` | undefined {
  if (!value || !/^0x[a-fA-F0-9]{40}$/.test(value)) {
    return undefined;
  }

  return value.toLowerCase() as `0x${string}`;
}

function readString(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function parsePoolSymbols(name: string | undefined) {
  const [base = "POOL", quote = "UNKNOWN"] = (name ?? "").split("/").map((part) => part.trim().split(" ")[0]);

  return {
    base,
    quote,
  };
}

type GeckoTerminalPoolsResponse = {
  data?: GeckoTerminalPool[];
  included?: GeckoTerminalIncluded[];
};

type GeckoTerminalPool = {
  id: string;
  type: "pool";
  attributes?: {
    address?: string;
    name?: string;
    reserve_in_usd?: string | null;
    volume_usd?: {
      h24?: string | null;
    };
  };
  relationships?: {
    base_token?: GeckoTerminalRelationship;
    quote_token?: GeckoTerminalRelationship;
    dex?: GeckoTerminalRelationship;
  };
};

type GeckoTerminalRelationship = {
  data?: {
    id?: string;
    type?: string;
  };
};

type GeckoTerminalIncluded = {
  id: string;
  type: "token" | "dex" | string;
  attributes?: {
    address?: string;
    name?: string;
    symbol?: string;
  };
};
