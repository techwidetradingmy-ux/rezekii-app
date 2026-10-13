-- Creator levels (Bronze, Silver, Gold) and what they are worked out from.

-- One row per Rezekii creator per day: lifetime totals from TikTok's TAP campaign data (tap_creator_products).
-- A month's sales = the last total of that month minus the last total of the month before.
create table public.creator_daily (
  username text not null,
  day date not null,
  paid numeric not null default 0,
  sample_videos int not null default 0,   -- samples TikTok marks completed (the creator posted for them)
  videos int not null default 0,
  lives int not null default 0,
  samples_shipping int not null default 0,
  samples_delivered int not null default 0,
  primary key (username, day)
);

create table public.creator_levels (
  user_id uuid primary key references public.app_users(id) on delete cascade,
  level text not null default 'bronze' check (level in ('bronze', 'silver', 'gold')),
  level_since date,
  gold_invited boolean not null default false,  -- Gold is by invitation (set by Techwide)
  demoted_at date,                              -- after a demotion, Silver comes back only at a month end
  checked_month text,                           -- the last month-end that was applied, 'YYYY-MM'
  celebrated text not null default 'bronze',    -- the highest level whose level-up screen the creator has seen
  updated_at timestamptz not null default now()
);

-- Settings Techwide edits in the app (for example the level benefits list).
create table public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.app_users(id) on delete set null
);

-- Today's totals for every Rezekii creator signed in with TikTok.
create or replace function public.record_creator_daily(d date)
returns int
language sql
security definer
set search_path = ''
as $$
  with s as (
    select t.username, t.paid, t.videos, t.lives,
           upper(regexp_replace(coalesce(t.sample_status, ''), '([a-z])([A-Z])', '\1_\2', 'g')) as st
      from public.tap_creator_products t
      join public.app_users u on lower(u.tiktok_username) = t.username
  ), up as (
    insert into public.creator_daily as c (username, day, paid, sample_videos, videos, lives, samples_shipping, samples_delivered)
    select username, d, sum(paid), count(*) filter (where st like '%COMPLETED%'), sum(videos), sum(lives),
           count(*) filter (where st similar to '%(SHIPPED|AWAITING_COLLECTION)%'), count(*) filter (where st like '%CONTENT_PENDING%')
      from s group by username
    on conflict (username, day) do update set paid = excluded.paid, sample_videos = excluded.sample_videos, videos = excluded.videos,
      lives = excluded.lives, samples_shipping = excluded.samples_shipping, samples_delivered = excluded.samples_delivered
    returning 1
  )
  select count(*)::int from up;
$$;
revoke all on function public.record_creator_daily(date) from public, anon, authenticated;
grant execute on function public.record_creator_daily(date) to service_role;

alter table public.creator_daily enable row level security;
alter table public.creator_levels enable row level security;
alter table public.app_settings enable row level security;
revoke all on public.creator_daily, public.creator_levels, public.app_settings from anon, authenticated;
