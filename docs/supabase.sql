create table if not exists reports (
  id text primary key,
  report_json jsonb not null,
  report_hash text not null,
  tx_hash text null,
  created_at timestamptz not null default now()
);

create table if not exists watchlist (
  id text primary key,
  report_id text not null references reports(id) on delete cascade,
  status text not null,
  created_at timestamptz not null default now()
);

create index if not exists reports_created_at_idx on reports(created_at desc);
create index if not exists watchlist_created_at_idx on watchlist(created_at desc);
create index if not exists watchlist_report_id_idx on watchlist(report_id);
