-- Brands: named groups of channels posted to together (New post → pick a brand, docs/flows/social-posting.md B1–B8).
-- A channel is a social_accounts id or "tiktok:<open_id>"; disconnected channels simply drop out when shown.
create table public.social_brands (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  channels text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);
create index social_brands_by_user on public.social_brands (user_id);

-- RLS on with no policies: browser keys can't read or write; only the server's secret key can.
alter table public.social_brands enable row level security;
revoke all on public.social_brands from anon, authenticated;

-- Facebook and Instagram picture links expire after a few days; the timer refreshes them (P10).
alter table public.social_accounts add column avatar_checked_at timestamptz not null default now();
