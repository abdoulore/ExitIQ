export type AssetClass = "rwa" | "liquid-staking" | "stable" | "defi-pool";
export type KycRequirement = "required" | "not_required" | "unknown";
export type JurisdictionRestriction = "low" | "medium" | "high" | "unknown";
export type AccreditedInvestorRequirement = "yes" | "no" | "unknown";

export type ExitAsset = {
  id: string;
  name: string;
  symbol: string;
  address: `0x${string}`;
  type: "LST" | "Native" | "Stable" | "Yield" | "RWA" | "live-pool";
  liquidityUsd: number;
  dailyVolumeUsd: number;
  routes: number;
  apy: number;
  riskTag: "Deep liquidity" | "Balanced" | "Stable" | "Thin liquidity" | "RWA redemption" | "Live pool";
  route: string[];
  assetClass: AssetClass;
  kycRequirement: KycRequirement;
  jurisdictionRestriction: JurisdictionRestriction;
  accreditedInvestorRequired: AccreditedInvestorRequirement;
  complianceNotes: string[];
  demoAddress?: `0x${string}`;
  poolAddress?: `0x${string}`;
  baseTokenSymbol?: string;
  quoteTokenSymbol?: string;
  dexName?: string;
};

// Real Mantle mainnet assets. Token addresses and the seeded liquidity/volume
// ballparks below are taken from GeckoTerminal Mantle pool data so demo-mode
// scoring reflects how these assets actually exit on-chain. Live mode pulls the
// same pools in real time.
export const demoAssets: ExitAsset[] = [
  {
    id: "meth",
    name: "Mantle Staked Ether",
    symbol: "mETH",
    address: "0xcDA86A272531e8640cD7F1a92c01839911B90bb0",
    demoAddress: "0xcDA86A272531e8640cD7F1a92c01839911B90bb0",
    type: "LST",
    liquidityUsd: 1050000,
    dailyVolumeUsd: 98000,
    routes: 2,
    apy: 4,
    riskTag: "Balanced",
    route: ["Merchant Moe cmETH/mETH", "mETH/WETH pool"],
    assetClass: "liquid-staking",
    kycRequirement: "not_required",
    jurisdictionRestriction: "low",
    accreditedInvestorRequired: "no",
    complianceNotes: [
      "mETH is a liquid staking token; exits route through Mantle DEX pools or the staking withdrawal path.",
      "ExitIQ does not verify protocol, frontend, or regional eligibility.",
    ],
    poolAddress: "0x3d887ce4988fb46aec6e0027171f65db3526e5f1",
    baseTokenSymbol: "cmETH",
    quoteTokenSymbol: "mETH",
    dexName: "Merchant Moe",
  },
  {
    id: "usde",
    name: "Ethena USDe",
    symbol: "USDe",
    address: "0x5d3a1Ff2b6BAb83b63cd9AD0787074081a52ef34",
    demoAddress: "0x5d3a1Ff2b6BAb83b63cd9AD0787074081a52ef34",
    type: "Stable",
    liquidityUsd: 6400000,
    dailyVolumeUsd: 40000,
    routes: 3,
    apy: 5.1,
    riskTag: "Deep liquidity",
    route: ["AUSD/USDe pool", "sUSDe/USDe pool", "Aave USDe withdrawal"],
    assetClass: "stable",
    kycRequirement: "not_required",
    jurisdictionRestriction: "low",
    accreditedInvestorRequired: "no",
    complianceNotes: [
      "USDe is a synthetic dollar with deep Mantle pool liquidity across multiple venues.",
      "ExitIQ does not verify issuer terms or regional eligibility.",
    ],
    poolAddress: "0x5a59359a1ad9b0a59aa70145dfeceb6d9ee07253",
    baseTokenSymbol: "AUSD",
    quoteTokenSymbol: "USDe",
    dexName: "Merchant Moe",
  },
  {
    id: "usdy",
    name: "Ondo U.S. Dollar Yield",
    symbol: "USDY",
    address: "0x5be26527e817998a7206475496fde1e68957c5a6",
    demoAddress: "0x5be26527e817998a7206475496fde1e68957c5a6",
    type: "RWA",
    liquidityUsd: 3400,
    dailyVolumeUsd: 60,
    routes: 1,
    apy: 3.55,
    riskTag: "RWA redemption",
    route: ["Ondo redemption (KYC-gated, multi-day settlement)"],
    assetClass: "rwa",
    kycRequirement: "required",
    jurisdictionRestriction: "high",
    accreditedInvestorRequired: "no",
    complianceNotes: [
      "USDY is a tokenized RWA: on-chain DEX exit liquidity is only a few thousand dollars, so any size exit must route through Ondo's redemption.",
      "Redemption is KYC-gated, settles over multiple days, and restricts U.S. persons.",
      "ExitIQ flags this access and timing risk but does not confirm legal eligibility.",
    ],
    poolAddress: "0x20a2602e3e8f2fd13c374630de0545bf0ece435b",
    baseTokenSymbol: "USDC",
    quoteTokenSymbol: "USDY",
    dexName: "Merchant Moe",
  },
];

export const sampleAssets = demoAssets;

export function getAssetById(assetId: string) {
  return demoAssets.find((asset) => asset.id === assetId);
}
