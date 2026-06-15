import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";

const exampleRequest = `POST /api/exit-check
Content-Type: application/json

{
  "assetId": "usdy",
  "amountUsd": 100000,
  "riskProfile": "balanced",
  "timeHorizonDays": 7,
  "mode": "demo"
}`;

const exampleResponse = `{
  "asset": {
    "id": "usdy",
    "name": "Ondo U.S. Dollar Yield",
    "symbol": "USDY",
    "address": "0x5be26527e817998a7206475496fde1e68957c5a6",
    "liquidityUsd": 3400,
    "dailyVolumeUsd": 60,
    "routes": 1,
    "apy": 3.55
  },
  "amountUsd": 100000,
  "exitScore": "F",
  "verdict": "avoid",
  "estimatedSlippagePct": 96.71,
  "maxSafeSizeUsd": 87,
  "bestRoute": "Ondo redemption (KYC-gated, multi-day settlement)",
  "routeDiversity": "low",
  "liquidityDepthUsd": 3400,
  "volumeSupport": "weak",
  "stress": {
    "liquidityDown20": { "exitScore": "F" },
    "liquidityDown50": { "exitScore": "F" },
    "bestRouteUnavailable": { "exitScore": "F" }
  },
  "complianceStatus": {
    "level": "unknown",
    "label": "Eligibility review required",
    "summary": "USDY exit is KYC-gated Ondo redemption that restricts U.S. persons. Verify access rules before allocation."
  },
  "alternative": {
    "asset": "Ethena USDe",
    "reason": "Better route depth and lower exit slippage at the same size",
    "exitScore": "B",
    "maxSafeSizeUsd": 164102
  }
}`;

const exampleDecisionRequest = `POST /api/agent-decision
Content-Type: application/json

{
  "result": { /* the /api/exit-check response */ }
}`;

const exampleDecisionResponse = `{
  "decision": {
    "action": "reject",
    "confidence": 95,
    "headline": "Exit of $100,000 THIN rejected due to extreme slippage.",
    "reasons": [
      "Estimated slippage of 45.45% far exceeds safe thresholds.",
      "Max safe size is only $3,076 for a $100,000 exit."
    ],
    "requiredAction": "Do not execute exit. Consider Ethena USDe (B grade).",
    "monitoringTrigger": "Re-evaluate if liquidity depth falls 20%.",
    "modelBaselineAction": "reject",
    "agreesWithBaseline": true,
    "source": "llm"
  }
}`;

export default function ApiDocsPage() {
  return (
    <main className="min-h-[100dvh] bg-[var(--background)] px-4 py-5 pb-10 text-[var(--foreground)] sm:px-5">
      <div className="mx-auto max-w-6xl">
        <AppHeader
          active="api-docs"
          eyebrow="Agent workflow"
          title="Agent API docs"
          description="AI agents can call ExitIQ before recommending a yield opportunity. The exit-check returns deterministic, auditable signals; the agent-decision endpoint turns those signals into an allow/warn/reject call the agent can act on."
          actions={
            <Link
              href="/check"
              className="inline-flex h-10 w-full items-center justify-center rounded-md bg-[var(--accent)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--accent-strong)] active:translate-y-px sm:w-auto"
            >
              Run a check
            </Link>
          }
        />

        <section className="mt-6 grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_340px] [&>*]:min-w-0">
          <div className="grid min-w-0 gap-5">
            <DocCard eyebrow="Endpoint 1 · evidence" title="POST /api/exit-check">
              <p className="text-sm leading-7 text-[var(--muted)]">
                Submit an asset, amount, risk profile, time horizon, and mode. Live requests use
                GeckoTerminal Mantle pool data where available and fall back to seeded liquidity
                data when live data is unavailable. The response is the deterministic, auditable
                evidence the agent reasons over.
              </p>
            </DocCard>

            <CodeCard title="Example request" code={exampleRequest} />
            <CodeCard title="Example response" code={exampleResponse} />

            <DocCard eyebrow="Endpoint 2 · decision" title="POST /api/agent-decision">
              <p className="text-sm leading-7 text-[var(--muted)]">
                Pass an exit-check result and the AI agent returns the governing allow/warn/reject
                call with confidence, grounded reasons, and a required action. It may confirm or
                override the model baseline, and every decision stays backed by the auditable
                signals. If the model is unavailable, it falls back to the deterministic baseline
                (<span className="mono">source: &quot;deterministic&quot;</span>).
              </p>
            </DocCard>

            <CodeCard title="Decision request" code={exampleDecisionRequest} />
            <CodeCard title="Decision response" code={exampleDecisionResponse} />
          </div>

          <aside className="grid min-w-0 gap-5 lg:self-start">
            <DocCard eyebrow="Grades" title="Exit score meaning">
              <div className="mt-4 grid gap-3">
                <GradeRow grade="A" meaning="Enter" detail="Strong liquidity and low exit pressure." />
                <GradeRow grade="B" meaning="Monitor" detail="Usable, but conditions should be watched." />
                <GradeRow grade="C" meaning="Reduce" detail="Requested size is starting to crowd exits." />
                <GradeRow grade="D" meaning="Wait" detail="Exit quality is weak at this size." />
                <GradeRow grade="F" meaning="Avoid" detail="Exit could fail under normal stress." />
              </div>
            </DocCard>

            <DocCard eyebrow="Agent rule" title="Do not chase APY alone">
              <p className="text-sm leading-7 text-[var(--muted)]">
                Agents should compare APY against exit score, max safe size, and stress results.
                A higher APY opportunity can be rejected when exit quality is poor.
              </p>
            </DocCard>
          </aside>
        </section>
      </div>
    </main>
  );
}

function DocCard({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="min-w-0 rounded-lg border border-[var(--line)] bg-[var(--card)] p-5 shadow-[var(--shadow)]">
      <p className="data-label">{eyebrow}</p>
      <h2 className="mt-2 text-xl font-semibold">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function CodeCard({ title, code }: { title: string; code: string }) {
  return (
    <section className="min-w-0 rounded-lg border border-[var(--line)] bg-[var(--card)] p-5 shadow-[var(--shadow)]">
      <h2 className="text-xl font-semibold">{title}</h2>
      <pre className="mono mt-4 max-w-full overflow-x-auto rounded-md border border-[var(--line)] bg-[var(--code-bg)] p-4 text-xs leading-6 text-[var(--code-fg)]">
        {code}
      </pre>
    </section>
  );
}

function GradeRow({
  grade,
  meaning,
  detail,
}: {
  grade: string;
  meaning: string;
  detail: string;
}) {
  return (
    <div className="rounded-md border border-[var(--line)] bg-[var(--surface)] p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold">{grade}</p>
        <p className="text-xs font-semibold text-[var(--accent)]">{meaning}</p>
      </div>
      <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{detail}</p>
    </div>
  );
}
