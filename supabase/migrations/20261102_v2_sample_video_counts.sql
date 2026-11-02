-- Videos a creator posted for Rezekii samples, per Malaysia month, from TikTok's per-product content records (10 in a month
-- makes Silver). Each video counted once. Read again after 6 hours.
create table if not exists public.sample_video_counts (
  username text primary key,
  months jsonb not null default '{}'::jsonb,
  at timestamptz not null default now()
);
alter table public.sample_video_counts enable row level security;
