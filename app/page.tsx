import Link from "next/link";
import { Reveal } from "@/components/Reveal";
import { ScoreBadge } from "@/components/ScoreBadge";
import { actionLabel, buildDeterministicDecision } from "@/lib/agentDecision";
import { runExitCheck, type ExitCheckResult } from "@/lib/scoring";

const registryAddress = "0x160493BC227713b256344E382f02d2adbFD0555e";
const explorerUrl = `https://explorer.mantle.xyz/address/${registryAddress}`;

function check(assetId: string, amountUsd: number): ExitCheckResult {
  return runExitCheck({ assetId, amountUsd, riskProfile: "balanced", timeHorizonDays: 7, mode: "demo" });
}

// Real engine output, computed at render. Deterministic, so the page tells the
// truth and never depends on a live model call.
const usdyCheck = check("usdy", 100000);
const usdyDecision = buildDeterministicDecision(usdyCheck);
const methSmall = check("meth", 1000);
const methLarge = check("meth", 50000);
const assetShowcase = ["usdy", "meth", "usde"].map((id) => check(id, 100000));

const decisionSnippet = `POST /api/agent-decision

{
  "action": "${usdyDecision.action}",
  "confidence": ${usdyDecision.confidence},
  "reasons": [
    "USDY on-chain exit liquidity is only ~$3,400",
    "Exit at size forces KYC-gated Ondo redemption"
  ],
  "requiredAction": "Consider Ethena USDe (B exit grade)",
  "source": "deterministic"
}`;

const assetClassLabel: Record<string, string> = {
  rwa: "Tokenized RWA",
  "liquid-staking": "Liquid staking",
  stable: "Synthetic dollar",
  "defi-pool": "DeFi pool",
};

export default function Home() {
  return (
    <div className="min-h-[100dvh] text-[var(--foreground)]">
      <LandingNav />

      <main className="mx-auto max-w-7xl px-4 sm:px-6">
        <Hero />
        <TrustStrip />
        <ProblemSection />
        <HowItWorks />
        <SizeShowcase />
        <AssetShowcase />
        <AgentSection />
        <FinalCta />
      </main>

      <Footer />
    </div>
  );
}

function LandingNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--line)] bg-[var(--header-bg)]/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold tracking-tight text-white">
          <span className="inline-block h-4 w-4 rounded-[5px] bg-[var(--accent)]" />
          ExitIQ
        </Link>
        <nav className="hidden items-center gap-7 text-sm font-medium text-white/55 md:flex">
          <a href="#how" className="transition hover:text-white">How it works</a>
          <a href="#assets" className="transition hover:text-white">Assets</a>
          <Link href="/api-docs" className="transition hover:text-white">Agent API</Link>
        </nav>
        <Link
          href="/check"
          className="inline-flex h-10 items-center justify-center rounded-full bg-[var(--accent)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--accent-strong)] active:translate-y-px"
        >
          Open app
        </Link>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="grid gap-12 pt-16 pb-12 lg:grid-cols-[minmax(0,1fr)_440px] lg:items-center lg:pt-24 lg:pb-16">
      <div>
        <span className="fade-up inline-flex items-center gap-2 rounded-full border border-[var(--accent-line)] bg-[var(--accent-bg)] px-3 py-1 text-xs font-semibold text-[var(--accent)]">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
          Mantle AI x RWA
        </span>
        <h1 className="fade-up delay-1 mt-6 text-5xl font-semibold leading-[1.04] tracking-tight sm:text-6xl">
          Check the exit before you chase the yield.
        </h1>
        <p className="fade-up delay-2 mt-6 max-w-md text-lg leading-8 text-[var(--muted)]">
          Everyone checks APY. ExitIQ scores whether you can actually get out, at size, on real Mantle liquidity.
        </p>
        <div className="fade-up delay-3 mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/check"
            className="inline-flex h-12 items-center justify-center rounded-full bg-[var(--accent)] px-6 text-sm font-semibold text-white transition hover:bg-[var(--accent-strong)] active:translate-y-px"
          >
            Run an exit check
          </Link>
          <Link
            href="/api-docs"
            className="inline-flex h-12 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--surface)] px-6 text-sm font-semibold text-[var(--foreground)] transition hover:border-[var(--accent)] hover:bg-[var(--card)] active:translate-y-px"
          >
            Read the agent API
          </Link>
        </div>
      </div>

      <div className="fade-up delay-2">
        <VerdictCard />
      </div>
    </section>
  );
}

function VerdictCard() {
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--card)] p-5 shadow-[var(--shadow)]">
      <div className="flex items-center justify-between">
        <p className="data-label">AI agent decision</p>
        <span className="inline-flex items-center rounded-full border border-[var(--line)] bg-[var(--surface)] px-2.5 py-1 text-xs font-semibold text-[var(--muted)]">
          {usdyDecision.confidence}% confidence
        </span>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <span className="inline-flex h-12 items-center justify-center rounded-xl bg-[var(--danger)] px-4 text-base font-bold text-white">
          {actionLabel(usdyDecision.action).toUpperCase()}
        </span>
        <div>
          <p className="text-sm font-semibold">{usdyCheck.asset.name}</p>
          <p className="text-xs text-[var(--muted)]">${usdyCheck.amountUsd.toLocaleString("en-US")} exit</p>
        </div>
        <div className="ml-auto">
          <ScoreBadge grade={usdyCheck.exitScore} size="lg" />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <Stat label="Slippage" value={`${usdyCheck.estimatedSlippagePct}%`} tone="danger" />
        <Stat label="Max safe" value={`$${usdyCheck.maxSafeSizeUsd.toLocaleString("en-US")}`} />
        <Stat label="Routes" value={usdyCheck.routeDiversity} />
      </div>

      <ul className="mt-4 grid gap-2">
        {usdyDecision.reasons.slice(0, 2).map((reason) => (
          <li key={reason} className="flex gap-2 text-xs leading-5 text-[var(--muted)]">
            <span aria-hidden className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--danger)]" />
            <span>{reason}</span>
          </li>
        ))}
      </ul>

      <p className="mono mt-4 rounded-lg border border-[var(--line)] bg-[var(--surface)] p-3 text-xs leading-5 text-[var(--muted)]">
        Real on-chain exit liquidity: ~$3,400. The deep yield hides a trapped exit.
      </p>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "danger" }) {
  return (
    <div className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-2.5">
      <p className="data-label">{label}</p>
      <p className={`mt-1 text-sm font-bold capitalize ${tone === "danger" ? "text-[var(--danger)]" : ""}`}>{value}</p>
    </div>
  );
}

function TrustStrip() {
  return (
    <Reveal>
      <div className="flex flex-col gap-3 border-y border-[var(--line)] py-4 text-sm text-[var(--muted)] sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-6">
        <TrustItem label="Settlement" value="Mantle mainnet" />
        <Divider />
        <TrustItem label="Live data" value="GeckoTerminal pools" />
        <Divider />
        <TrustItem label="Scoring" value="Deterministic, auditable" />
        <a
          href={explorerUrl}
          target="_blank"
          rel="noreferrer"
          className="mono ml-auto truncate text-xs font-semibold text-[var(--accent)] hover:underline"
        >
          {registryAddress}
        </a>
      </div>
    </Reveal>
  );
}

function TrustItem({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="data-label">{label}</span>
      <span className="font-semibold text-[var(--foreground)]">{value}</span>
    </span>
  );
}

function Divider() {
  return <span aria-hidden className="hidden h-1 w-1 rounded-full bg-[var(--line)] sm:inline-block" />;
}

function ProblemSection() {
  return (
    <section className="py-16 lg:py-24">
      <Reveal>
        <h2 className="max-w-3xl text-3xl font-semibold leading-tight sm:text-4xl">
          APY tells you what you earn. It says nothing about whether you can leave.
        </h2>
      </Reveal>

      <div className="mt-10 grid gap-4 lg:grid-cols-2">
        <Reveal className="lg:row-span-2">
          <div className="flex h-full flex-col justify-between rounded-2xl border border-[var(--line)] bg-[var(--card)] p-6 transition hover:border-[var(--accent)]">
            <div>
              <p className="text-xs font-semibold text-[var(--accent)]">The trap</p>
              <h3 className="mt-3 text-2xl font-semibold leading-snug">
                A tokenized RWA can show millions in TVL while its real exit liquidity is a few thousand dollars.
              </h3>
            </div>
            <p className="mt-8 text-sm leading-6 text-[var(--muted)]">
              USDY on Mantle carries deep yield, yet its on-chain exit liquidity is about $3,400. The rest leaves
              through KYC-gated, multi-day redemption. APY never shows that.
            </p>
          </div>
        </Reveal>

        <Reveal delay={80}>
          <ProblemCard
            title="Size changes everything"
            body="The same pool can be a clean exit at $1,000 and a trapped position at $100,000. The yield number does not move."
          />
        </Reveal>
        <Reveal delay={140}>
          <ProblemCard
            title="Redemption gates are real risk"
            body="RWA exits often route through KYC-gated, multi-day redemption with jurisdiction limits, not an instant swap."
          />
        </Reveal>
      </div>
    </section>
  );
}

function ProblemCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--card)] p-6 transition hover:border-[var(--accent)]">
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{body}</p>
    </div>
  );
}

function HowItWorks() {
  const steps = [
    {
      title: "Score the exit",
      body: "Six weighted signals, slippage, liquidity depth, route diversity, volume, stress resilience, and concentration, produce an A to F exit grade.",
    },
    {
      title: "AI agent decides",
      body: "An AI agent reads those signals and returns allow, warn, or reject with grounded reasons. The deterministic report is the auditable evidence.",
    },
    {
      title: "Anchor the proof",
      body: "Hash the report and write it to the ExitReportRegistry on Mantle mainnet, so the decision and its evidence are verifiable on-chain.",
    },
  ];

  return (
    <section id="how" className="py-16 lg:py-24">
      <Reveal>
        <p className="data-label text-[var(--accent)]">How it works</p>
        <h2 className="mt-3 text-3xl font-semibold leading-tight sm:text-4xl">From signals to a decision you can prove.</h2>
      </Reveal>

      <ol className="relative mt-12 grid gap-10 md:grid-cols-3 md:gap-6">
        <div aria-hidden className="absolute inset-x-0 top-5 hidden h-px bg-[var(--line)] md:block" />
        {steps.map((step, index) => (
          <Reveal key={step.title} delay={index * 90}>
            <li className="relative">
              <span className="relative z-10 inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--accent-line)] bg-[var(--background)] text-sm font-bold text-[var(--accent)]">
                {index + 1}
              </span>
              <h3 className="mt-5 text-lg font-semibold">{step.title}</h3>
              <p className="mt-2 max-w-xs text-sm leading-6 text-[var(--muted)]">{step.body}</p>
            </li>
          </Reveal>
        ))}
      </ol>
    </section>
  );
}

function SizeShowcase() {
  return (
    <Reveal>
      <section className="overflow-hidden rounded-3xl border border-[var(--line)] bg-[var(--card)] p-6 sm:p-10">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-center">
          <div>
            <h2 className="text-3xl font-semibold leading-tight sm:text-4xl">Same pool. Different exit.</h2>
            <p className="mt-4 max-w-lg text-base leading-7 text-[var(--muted)]">
              ExitIQ reruns the same scoring engine across position sizes. {methSmall.asset.name} stays clean small
              and degrades fast at scale, on real Mantle liquidity.
            </p>
            <Link
              href="/check"
              className="mt-7 inline-flex h-11 items-center justify-center rounded-full bg-[var(--accent)] px-5 text-sm font-semibold text-white transition hover:bg-[var(--accent-strong)] active:translate-y-px"
            >
              Try it on your size
            </Link>
          </div>
          <div className="grid gap-3">
            <SizeBlock label="$1,000" result={methSmall} />
            <SizeBlock label="$50,000" result={methLarge} />
          </div>
        </div>
      </section>
    </Reveal>
  );
}

function SizeBlock({ label, result }: { label: string; result: ExitCheckResult }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 transition hover:border-[var(--accent)]">
      <div>
        <p className="text-sm font-semibold">{label}</p>
        <p className="mt-1 text-xs capitalize text-[var(--muted)]">{result.verdict.replaceAll("_", " ")}</p>
        <p className="mt-2 text-xs text-[var(--muted)]">{result.estimatedSlippagePct}% est. slippage</p>
      </div>
      <ScoreBadge grade={result.exitScore} size="lg" />
    </div>
  );
}

function AssetShowcase() {
  return (
    <section id="assets" className="py-16 lg:py-24">
      <Reveal>
        <p className="data-label text-[var(--accent)]">Real Mantle assets</p>
        <h2 className="mt-3 text-3xl font-semibold leading-tight sm:text-4xl">
          Three real assets. One $100,000 exit. Three answers.
        </h2>
        <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--muted)]">
          Scored on real GeckoTerminal pool data. The highest-yield name is the worst exit, exactly the risk an APY
          dashboard misses.
        </p>
      </Reveal>
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {assetShowcase.map((result, index) => (
          <Reveal key={result.asset.id} delay={index * 90}>
            <AssetCard result={result} highlight={result.asset.id === "usdy"} />
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function AssetCard({ result, highlight }: { result: ExitCheckResult; highlight: boolean }) {
  return (
    <div
      className={`flex h-full flex-col rounded-2xl border bg-[var(--card)] p-5 transition hover:-translate-y-0.5 ${
        highlight
          ? "border-[var(--danger-line)] ring-1 ring-[var(--danger-line)]"
          : "border-[var(--line)] hover:border-[var(--accent)]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-[var(--accent)]">{result.asset.symbol}</p>
          <h3 className="mt-1 text-lg font-semibold leading-tight">{result.asset.name}</h3>
          <p className="mt-1 text-xs text-[var(--muted)]">
            {assetClassLabel[result.asset.assetClass] ?? result.asset.assetClass}
          </p>
        </div>
        <ScoreBadge grade={result.exitScore} size="lg" />
      </div>

      {highlight ? (
        <span className="mt-3 inline-flex w-fit items-center rounded-full border border-[var(--danger-line)] bg-[var(--danger-bg)] px-2.5 py-1 text-xs font-semibold text-[var(--danger)]">
          Highest yield, worst exit
        </span>
      ) : null}

      <div className="mt-4 grid grid-cols-2 gap-2">
        <AssetStat label="Verdict" value={result.verdict.replaceAll("_", " ")} />
        <AssetStat label="APY" value={`${result.asset.apy}%`} />
        <AssetStat label="Slippage" value={`${result.estimatedSlippagePct}%`} />
        <AssetStat label="Liquidity" value={`$${result.asset.liquidityUsd.toLocaleString("en-US")}`} />
      </div>

      <p className="mt-4 text-xs leading-5 text-[var(--muted)]">Exit via {result.asset.route[0]}</p>
    </div>
  );
}

function AssetStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-2.5">
      <p className="data-label">{label}</p>
      <p className="mt-1 text-sm font-semibold capitalize">{value}</p>
    </div>
  );
}

function AgentSection() {
  return (
    <section className="grid gap-8 py-16 lg:grid-cols-2 lg:items-center lg:py-24">
      <Reveal>
        <div>
          <p className="data-label text-[var(--accent)]">Agent-ready</p>
          <h2 className="mt-3 text-3xl font-semibold leading-tight sm:text-4xl">Agents call ExitIQ before they allocate.</h2>
          <p className="mt-4 max-w-lg text-base leading-7 text-[var(--muted)]">
            One endpoint returns a structured allow, warn, or reject decision with confidence and grounded reasons.
            The AI can confirm or override the model baseline, and falls back to the deterministic baseline if the
            model is unavailable, so an agent always gets an answer.
          </p>
          <Link
            href="/api-docs"
            className="mt-6 inline-flex h-11 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--surface)] px-5 text-sm font-semibold text-[var(--foreground)] transition hover:border-[var(--accent)] hover:bg-[var(--card)] active:translate-y-px"
          >
            View API docs
          </Link>
        </div>
      </Reveal>
      <Reveal delay={100}>
        <pre className="mono overflow-x-auto rounded-2xl border border-[var(--line)] bg-[var(--code-bg)] p-5 text-xs leading-6 text-[var(--code-fg)] shadow-[var(--shadow)]">
          {decisionSnippet}
        </pre>
      </Reveal>
    </section>
  );
}

function FinalCta() {
  return (
    <Reveal>
      <section className="my-10 overflow-hidden rounded-3xl border border-[var(--line)] bg-[var(--card)] p-8 text-center sm:p-14">
        <h2 className="mx-auto max-w-2xl text-3xl font-semibold leading-tight sm:text-4xl">
          Check the exit before you chase the yield.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-[var(--muted)]">
          Run an exit-risk check on a real Mantle position in seconds. No wallet required to start.
        </p>
        <Link
          href="/check"
          className="mt-8 inline-flex h-12 items-center justify-center rounded-full bg-[var(--accent)] px-7 text-sm font-semibold text-white transition hover:bg-[var(--accent-strong)] active:translate-y-px"
        >
          Run your first exit check
        </Link>
      </section>
    </Reveal>
  );
}

function Footer() {
  return (
    <footer className="border-t border-[var(--line)] py-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-2 text-sm font-bold tracking-tight">
          <span className="inline-block h-4 w-4 rounded-[5px] bg-[var(--accent)]" />
          ExitIQ
        </div>
        <nav className="flex flex-wrap gap-5 text-sm font-medium text-[var(--muted)]">
          <Link href="/check" className="transition hover:text-[var(--foreground)]">Check</Link>
          <Link href="/watchlist" className="transition hover:text-[var(--foreground)]">Watchlist</Link>
          <Link href="/api-docs" className="transition hover:text-[var(--foreground)]">API Docs</Link>
          <a href={explorerUrl} target="_blank" rel="noreferrer" className="transition hover:text-[var(--foreground)]">Contract</a>
        </nav>
        <p className="text-xs text-[var(--muted)]">Built for the Mantle AI x RWA Hackathon</p>
      </div>
    </footer>
  );
}
