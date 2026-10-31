-- 6-digit email codes (owner, 31 Oct 2026): confirm a new email account, sign in without a password, reset a password.
-- Only a keyed hash of each code is kept. Server only: no policies, so only the service key can read or write.
create table if not exists public.email_codes (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  purpose text not null check (purpose in ('signup', 'signin', 'reset')),
  code_hash text not null,
  expires_at timestamptz not null,
  attempts integer not null default 0,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists email_codes_email_idx on public.email_codes (email, created_at desc);
create index if not exists email_codes_day_idx on public.email_codes (created_at);
alter table public.email_codes enable row level security;
