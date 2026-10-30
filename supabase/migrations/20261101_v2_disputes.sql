-- Disputes between creators and sellers (owner, 31 Oct 2026: real records). Staff open a case from WhatsApp, email or the
-- feedback inbox, move it along and close it with an outcome. Every change goes to the staff log.
create table if not exists disputes (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('Sample not received', 'Creator overdue', 'Seller complaint', 'Creator complaint', 'Other')),
  creator text,
  shop text,
  product text,
  detail text not null check (char_length(detail) between 1 and 1000),
  status text not null default 'open' check (status in ('open', 'waiting', 'resolved')),
  outcome text check (char_length(outcome) <= 500),
  owner text,
  opened_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists disputes_open on disputes (status, created_at desc);
alter table disputes enable row level security;
