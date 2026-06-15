import { actionLabel, type AgentExitDecision } from "@/lib/agentDecision";

export function AgentVerdictPanel({ decision }: { decision: AgentExitDecision }) {
  return (
    <section className={`overflow-hidden rounded-xl border shadow-[var(--shadow)] ${toneClass(decision.action)}`}>
      <div className="p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex h-12 min-w-12 items-center justify-center rounded-xl px-3 text-base font-bold ${badgeClass(
                decision.action,
              )}`}
            >
              {actionLabel(decision.action).toUpperCase()}
            </span>
            <div>
              <p className="data-label">AI agent decision</p>
              <p className="mt-1 text-lg font-semibold leading-6">{decision.headline}</p>
            </div>
          </div>
          <div className="flex flex-col items-start gap-2 sm:items-end">
            <span className="inline-flex items-center rounded-full border border-[var(--line)] bg-[var(--card)] px-3 py-1 text-xs font-semibold text-[var(--muted)]">
              {decision.confidence}% confidence
            </span>
            <SourceTag decision={decision} />
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div>
            <p className="data-label">Why</p>
            <ul className="mt-2 grid gap-2">
              {decision.reasons.map((reason) => (
                <li key={reason} className="flex gap-2 text-sm leading-6 text-[var(--foreground)]">
                  <span aria-hidden className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--muted)]" />
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="grid content-start gap-3">
            <div className="rounded-lg border border-[var(--line)] bg-[var(--card)] p-3">
              <p className="data-label">Required action</p>
              <p className="mt-1 text-sm font-semibold leading-6">{decision.requiredAction}</p>
            </div>
            <div className="rounded-lg border border-[var(--line)] bg-[var(--card)] p-3">
              <p className="data-label">Monitoring trigger</p>
              <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{decision.monitoringTrigger}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function SourceTag({ decision }: { decision: AgentExitDecision }) {
  if (decision.source === "deterministic") {
    return (
      <span className="inline-flex items-center rounded-full border border-[var(--line)] bg-[var(--card)] px-3 py-1 text-xs font-semibold text-[var(--muted)]">
        Deterministic baseline
      </span>
    );
  }

  if (!decision.agreesWithBaseline) {
    return (
      <span className="inline-flex items-center rounded-full border border-[var(--warning-line)] bg-[var(--warning-bg)] px-3 py-1 text-xs font-semibold text-[var(--warning)]">
        AI override of {decision.modelBaselineAction} baseline
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-full border border-[var(--line)] bg-[var(--card)] px-3 py-1 text-xs font-semibold text-[var(--muted)]">
      AI agent · confirms model baseline
    </span>
  );
}

function toneClass(action: AgentExitDecision["action"]) {
  if (action === "allow") {
    return "border-[var(--success-line)] bg-[var(--success-bg)]";
  }

  if (action === "reject") {
    return "border-[var(--danger-line)] bg-[var(--danger-bg)]";
  }

  return "border-[var(--warning-line)] bg-[var(--warning-bg)]";
}

function badgeClass(action: AgentExitDecision["action"]) {
  if (action === "allow") {
    return "bg-[var(--success)] text-white";
  }

  if (action === "reject") {
    return "bg-[var(--danger)] text-white";
  }

  return "bg-[var(--warning)] text-white";
}
