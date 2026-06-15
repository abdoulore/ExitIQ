# ExitIQ

**ExitIQ** is an AI-powered exit-risk engine for Mantle RWA and yield positions.

**Tagline:** Everyone checks APY. ExitIQ checks if you can survive the exit.

## Links

- Live app URL: `TBD`
- Contract address: [`0x160493BC227713b256344E382f02d2adbFD0555e`](https://explorer.mantle.xyz/address/0x160493BC227713b256344E382f02d2adbFD0555e) (Mantle mainnet)
- Demo video link: `TBD`
- X submission thread: `TBD`

## Problem

Yield users, treasuries, and AI agents often compare opportunities by APY first. That misses the harder question: can the position be exited safely at the intended size?

Thin liquidity, weak route diversity, poor volume support, and stressed market conditions can turn a high-yield position into a trapped position. This is especially important for RWA and yield strategies, where exits may depend on redemption routes, pool depth, or secondary market liquidity.

## Solution

ExitIQ checks exit quality before entry. A user or agent selects an asset, position size, and risk profile, then ExitIQ estimates whether the position can be exited safely.

The app produces an exit score, verdict, slippage estimate, max safe size, stress tests, alternative suggestions, and an AI-style memo. Agents can call the same engine before recommending or rejecting a yield opportunity.

## Features

- Exit-risk scoring for Mantle RWA and yield-style positions
- Position-size sensitivity across `$1,000`, `$10,000`, `$50,000`, and `$100,000`
- Risk profiles: conservative, balanced, aggressive
- Deterministic AI memo with no invented numbers
- Agent simulation that compares APY against exit quality
- Alternative suggestion when the selected opportunity is risky
- Shareable persisted report page
- Report hash generation with deterministic keccak hashing
- Mantle mainnet report registry contract
- Wallet flow for saving report hashes onchain when a registry address is configured
- Live mode connector for Mantle mainnet pool data through GeckoTerminal

## Scoring Methodology

The exit score is a weighted blend of six signals. Each signal is scored 0-100, the
weighted sum produces a 0-100 score, and that maps to a letter grade and verdict. The
weights are deliberately front-loaded on what an exit actually costs and whether the
market can absorb it, rather than on speculative projections.

| Signal | Weight | What it measures | Why this weight |
| --- | --- | --- | --- |
| Slippage | 35% | Estimated price impact of exiting at the requested size | The realized, unavoidable cost of a forced exit — the single number that most directly answers "what do I lose getting out now," so it carries the most weight. |
| Liquidity depth | 20% | Position size vs. pool reserves | The structural capacity behind the slippage estimate: can the market absorb the exit at all. |
| Route diversity | 15% | Number of independent exit venues | Resilience. Multiple routes survive a venue drying up or being exploited; a single route is a single point of failure. |
| Volume support | 15% | Exit size vs. 24h volume | Whether real counterparty flow exists to clear the exit over a reasonable window, not just instantaneous depth. |
| Stress resilience | 10% | Worst grade across liquidity −20%, −50%, and best-route-unavailable | Forward-looking robustness. Weighted lower because it is a scenario projection, not a current observation. |
| Concentration risk | 5% | Position as a share of total liquidity | Tail "you are the pool" risk. Kept lowest on purpose to avoid double-counting depth and slippage. |

Design principles:

- Weights sum to 100% and observed signals (current slippage and depth, 55% combined) outweigh projected ones (stress, 10%), keeping the score auditable rather than speculative.
- Concentration risk is intentionally capped at 5% because it overlaps with depth and slippage; the cap prevents the same weakness from being counted three times.
- Scoring is risk-profile-aware: the "safe" slippage threshold is 1% (conservative), 2.5% (balanced), or 5% (aggressive), and that threshold also defines the reported max safe size.

Grade thresholds and verdicts:

| Score | Grade | Verdict |
| --- | --- | --- |
| ≥ 85 | A | enter |
| ≥ 70 | B | enter with monitoring |
| ≥ 55 | C | reduce size |
| ≥ 40 | D | wait |
| < 40 | F | avoid |

A position has to be strong across most signals to earn an A, while a single severe
weakness (for example slippage scoring 0-20) pulls the weighted score down far enough
to force a monitor, reduce, or avoid verdict. The thresholds are intentionally strict
on the top grade so "enter" is reserved for genuinely survivable exits.

Calibration note: these weights and thresholds are expert-set heuristics tuned for a
deterministic, reproducible output that judges and agents can audit. They are not yet
back-tested against historical realized-exit slippage; calibrating the weights against
on-chain exit events is the clear next step and would convert the heuristic into an
empirically fitted model. The full implementation is in `lib/scoring.ts`.

## Live Data and Fallback Scenarios

Important disclosure: ExitIQ uses GeckoTerminal Mantle pool data where available. Seeded scenarios remain as an automatic fallback when live data is unavailable or when a stable judging walkthrough is needed.

Live data is the main product path. It fetches Mantle pool data, maps those pools into ExitIQ's internal pool shape, and runs the same deterministic exit-risk engine.

Fallback scenarios remain available when live data is unavailable. They clearly show the core product insight: the same asset can be safe at a small size and dangerous at a larger size.

The live connector lives in `lib/dex/mantleLive.ts`. It fetches Mantle pool data from the GeckoTerminal public API where available and falls back to seeded demo assets if the request fails.

```ts
{
  supported: true,
  reason: "GeckoTerminal Mantle pool data active",
  livePools
}
```

If the API is unavailable, the connector returns:

```ts
{
  supported: false,
  reason: "Live connector fallback active",
  fallbackAssetData
}
```

This keeps the app stable while showing the architecture for Mantle mainnet read-only data.

Mantle mainnet read target:

- RPC: `https://rpc.mantle.xyz`
- Chain ID: `5000`

## Architecture

```txt
app/
  page.tsx
  check/page.tsx
  report/[id]/page.tsx
  api/
    agent-simulate/route.ts
    assets/route.ts
    exit-check/route.ts
    report-hash/route.ts

components/
  ExitCheckClient.tsx
  ExitForm.tsx
  ExitScoreCard.tsx
  PositionSizeCurve.tsx
  StressTestPanel.tsx
  AgentDecisionPanel.tsx
  ReportRegistryPanel.tsx
  ReportPageClient.tsx

lib/
  assets.ts
  scoring.ts
  stress.ts
  ai.ts
  agent.ts
  hash.ts
  report-hash.ts
  report-storage.ts
  registry.ts
  dex/mantleLive.ts

contracts/
  src/ExitReportRegistry.sol
  script/DeployExitReportRegistry.s.sol
  foundry.toml
```

## Tech Stack

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- viem
- Solidity
- Foundry
- Mantle mainnet for report registry writes
- Mantle mainnet RPC interface for read-only liquidity data

## API Routes

### `GET /api/assets`

Returns supported demo assets.

### `POST /api/exit-check`

Runs the exit-risk engine.

Input:

```json
{
  "assetId": "usdy",
  "amountUsd": 100000,
  "riskProfile": "balanced",
  "timeHorizonDays": 7,
  "mode": "demo"
}
```

Output: `ExitCheckResult`

### `POST /api/agent-decision`

Takes an `ExitCheckResult` and returns the AI agent's governing `allow` / `warn` /
`reject` decision with confidence, grounded reasons, and a required action. The
deterministic report is the auditable evidence behind the call; the agent can
confirm or override the model baseline, and falls back to the deterministic
baseline if the model is unavailable.

### `POST /api/report-hash`

Returns a deterministic keccak hash for a report payload.

Output:

```json
{
  "reportHash": "0x..."
}
```

### `POST /api/agent-simulate`

Simulates an agent choosing among real Mantle assets:

- Ondo U.S. Dollar Yield (USDY) — tokenized RWA
- Mantle Staked Ether (mETH) — liquid staking
- Ethena USDe — synthetic dollar

The agent compares APY, exit score, max safe size, and stress result. It does not automatically choose the highest APY.

## Smart Contract

`contracts/src/ExitReportRegistry.sol` stores report hashes onchain.

Stored fields:

- `user`
- `asset`
- `amountUsd`
- `reportHash`
- `exitScore`
- `timestamp`

Grade mapping:

- `A = 5`
- `B = 4`
- `C = 3`
- `D = 2`
- `F = 1`

Mantle mainnet:

- RPC: `https://rpc.mantle.xyz`
- Chain ID: `5000`

Compile:

```powershell
cd contracts
forge build
```

Deploy:

```powershell
$env:PRIVATE_KEY="0x..."
forge script script/DeployExitReportRegistry.s.sol:DeployExitReportRegistry `
  --rpc-url mantle_mainnet `
  --chain-id 5000 `
  --broadcast
```

## How To Run Locally

Install dependencies:

```powershell
npm.cmd install
```

Run the app:

```powershell
npm.cmd run dev
```

Open:

```txt
http://localhost:3000
```

Useful checks:

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
```

Contract check:

```powershell
cd contracts
forge build
```

## Environment Variables

Create `.env.local` in the project root:

```env
NEXT_PUBLIC_EXIT_REPORT_REGISTRY_ADDRESS=0xYourDeployedRegistryAddress
```

If this variable is not set, the UI shows:

```txt
Registry contract not configured yet.
```

The report hash save flow remains disabled until a valid registry address is configured.

For contract deployment, set this in the shell from `contracts/`:

```powershell
$env:PRIVATE_KEY="0x..."
```

## Deployment Notes

- Deploy the Next.js app to Vercel or another Next-compatible host.
- Set `NEXT_PUBLIC_EXIT_REPORT_REGISTRY_ADDRESS` in the deployment environment after deploying the registry contract.
- `ExitReportRegistry` is deployed on Mantle mainnet at `0x160493BC227713b256344E382f02d2adbFD0555e`.
- Live data is read-only pool scoring. It is not a swap surface or DEX aggregator.
- Report pages use Supabase persistence when configured, with local development fallback when Supabase env vars are missing.

## Demo Flow

1. Open `/check`.
2. Select a live Mantle pool.
3. Compare `$1,000` vs `$50,000` using the quick-size buttons.
4. Show the position-size curve and the current exit score.
5. Click `Create shareable report`.
6. Review stress, compliance, memo, and proof details on the report page.
7. If a registry contract is configured, connect wallet and save the report hash on Mantle mainnet.

## Future Improvements

- Add Merchant Moe and Agni protocol-specific enrichment.
- Add GeckoTerminal or DefiLlama enrichment for pool liquidity and volume.
- Persist reports with a backend database.
- Add report verification by contract event lookup.
- Add wallet-aware user report history.
- Add real LLM memo generation with strict numeric grounding.
- Add automated agent API authentication and rate limiting.
- Expand RWA-specific redemption delay and liquidity risk models.
