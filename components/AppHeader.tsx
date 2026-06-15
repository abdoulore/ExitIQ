import Link from "next/link";
import type { ReactNode } from "react";

type AppHeaderProps = {
  active?: "home" | "check" | "result" | "watchlist" | "api-docs" | "report";
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: ReactNode;
};

const navItems = [
  { href: "/check", label: "Check", key: "check" },
  { href: "/watchlist", label: "Watchlist", key: "watchlist" },
  { href: "/api-docs", label: "API Docs", key: "api-docs" },
] as const;

export function AppHeader({ active = "home", title, description, eyebrow, actions }: AppHeaderProps) {
  return (
    <header className="mb-5">
      <div className="relative left-1/2 w-screen -translate-x-1/2 border-b border-[var(--line)] bg-[var(--header-bg)] px-4 text-white sm:px-5">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/"
            className="inline-flex w-fit items-center gap-2 text-sm font-bold tracking-tight text-white transition hover:text-white/80"
          >
            <span className="inline-block h-4 w-4 rounded-[5px] bg-[var(--accent)]" />
            ExitIQ
          </Link>
          <nav className="flex flex-wrap gap-2" aria-label="Primary">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`inline-flex h-9 items-center border-b-2 px-1 text-sm font-semibold transition active:translate-y-px sm:px-2 ${
                  active === item.key
                    ? "border-[var(--accent)] text-white"
                    : "border-transparent text-white/55 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      <div className="relative left-1/2 w-screen -translate-x-1/2 border-b border-[var(--line)] bg-[var(--background)] px-4 sm:px-5">
        <div className="mx-auto grid max-w-7xl gap-4 py-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div className="min-w-0">
            {eyebrow ? <p className="data-label">{eyebrow}</p> : null}
            <h1 className="mt-2 max-w-4xl text-3xl font-semibold leading-tight tracking-normal text-[var(--foreground)] sm:text-4xl">
              {title}
            </h1>
            {description ? (
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">{description}</p>
            ) : null}
          </div>
          {actions ? <div className="min-w-0 lg:justify-self-end">{actions}</div> : null}
        </div>
      </div>
    </header>
  );
}
