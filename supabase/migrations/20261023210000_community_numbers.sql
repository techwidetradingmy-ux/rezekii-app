-- Community → Numbers (owner, 23 Oct 2026): each connected Facebook Page, Instagram account and Threads profile's numbers,
-- read once a day. Small on purpose (the database is on the free plan's 500 MB): one row per channel per day, and one row per
-- post from the last 30 days, both cleared when the channel is disconnected.

-- A channel's day: followers when read, and that day's views, reach and engagement ({ followers, views, reach, engagement,
-- follows, unfollows }, whichever the platform gives). Kept 400 days.
create table public.social_stats (
  account_id uuid not null references public.social_accounts (id) on delete cascade,
  day date not null,
  numbers jsonb not null default '{}'::jsonb,
  fetched_at timestamptz not null default now(),
  primary key (account_id, day)
);

-- A post's latest numbers ({ views, reach, likes, comments, shares, saves, reposts, quotes }, whichever the platform gives).
create table public.social_post_stats (
  account_id uuid not null references public.social_accounts (id) on delete cascade,
  media_id text not null,
  posted_at timestamptz,
  permalink text,
  caption text,
  thumb text,
  numbers jsonb not null default '{}'::jsonb,
  fetched_at timestamptz not null default now(),
  primary key (account_id, media_id)
);
create index social_post_stats_by_posted on public.social_post_stats (posted_at);

alter table public.social_stats enable row level security;
alter table public.social_post_stats enable row level security;
revoke all on public.social_stats, public.social_post_stats from anon, authenticated;

-- Old days and posts go with the daily prune (market data's own prune runs first).
create or replace function public.prune_community(today date)
returns void
language sql
security definer
set search_path to ''
as $function$
  delete from public.social_stats where day < today - 400;
  delete from public.social_post_stats where posted_at < today - 35;
$function$;
revoke all on function public.prune_community(date) from public, anon, authenticated;
grant execute on function public.prune_community(date) to service_role;
