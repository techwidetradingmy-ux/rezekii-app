-- Admin screens: admins added in Settings (besides the ADMIN_EMAILS list), the activity log, and video stats for every
-- connected TikTok account (refreshed daily, kept 90 days).

create table public.admin_emails (
  email text primary key check (email = lower(email)),
  added_by text,
  added_at timestamptz not null default now()
);

create table public.admin_activity (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor text not null,
  kind text not null check (kind in ('Posts', 'Creators', 'Admins', 'Connections')),
  what text not null
);
create index admin_activity_at on public.admin_activity (at desc);

create table public.tiktok_videos (
  video_id text primary key,
  open_id text not null,
  username text,
  title text,
  cover text,
  share_url text,
  duration int,
  created_at timestamptz,
  views bigint not null default 0,
  likes bigint not null default 0,
  comments bigint not null default 0,
  shares bigint not null default 0,
  updated_at timestamptz not null default now()
);
create index tiktok_videos_open_id on public.tiktok_videos (open_id, created_at desc);

alter table public.admin_emails enable row level security;
alter table public.admin_activity enable row level security;
alter table public.tiktok_videos enable row level security;
revoke all on public.admin_emails, public.admin_activity, public.tiktok_videos from anon, authenticated;
