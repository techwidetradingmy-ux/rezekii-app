-- Sign-in from the Home Screen app (owner, 3 Nov 2026). The app keeps its own sign-in, apart from the phone's browser, so Google
-- and TikTok sign-in open in the browser, which leaves a one-time hand-back here; the app claims it and gets its own session.
-- `id_hash` is the SHA-256 of the app's random code (the code itself is never stored); it works once, within 10 minutes.
-- Read and written by the server only.
create table if not exists public.auth_handoffs (
  id_hash text primary key,
  user_id uuid not null references public.app_users(id) on delete cascade,
  next text,
  created_at timestamptz not null default now(),
  used_at timestamptz
);
create index if not exists auth_handoffs_created on public.auth_handoffs (created_at);
alter table public.auth_handoffs enable row level security;
