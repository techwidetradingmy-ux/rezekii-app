-- A video's views when it is about 1, 7 and 30 days old (owner, 3 Nov 2026: Best Time to Post can compare videos at the same
-- age once a month of data exists). Written when her videos are read from TikTok (modules/admin/videos.ts: the nightly read and
-- the read when she opens a page), no extra TikTok calls, only for an age just reached: 1 day (before 2), 7 days (before 9),
-- 30 days (before 33). The first reading in each window is kept; `at` says exactly when it was taken. `open_id` and `posted_at`
-- are kept here because tiktok_videos drops videos after 90 days.
create table if not exists public.video_views_at (
  video_id text not null,
  age_days smallint not null,
  open_id text not null,
  posted_at timestamptz not null,
  views bigint not null,
  at timestamptz not null default now(),
  primary key (video_id, age_days)
);
create index if not exists video_views_at_open_id_idx on public.video_views_at (open_id, age_days);
alter table public.video_views_at enable row level security;

-- When TikTok's daily top-100 best-selling videos were posted, per main category ('ALL' = every category), for Best Time to Post
-- (owner, 3 Nov 2026). Worked out once per daily list (`day` = the newest saved video list) and read from here until the next.
create table if not exists public.best_time_market (
  key text primary key,
  day date not null,
  data jsonb not null,
  at timestamptz not null default now()
);
alter table public.best_time_market enable row level security;
