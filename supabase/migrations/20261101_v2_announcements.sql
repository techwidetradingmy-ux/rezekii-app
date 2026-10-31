-- Announcements from Techwide (owner, 31 Oct 2026): e.g. "TikTok's data is late today". Shown in every user's notifications
-- under System while active.
create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  level text not null default 'info' check (level in ('info', 'important')),
  audience text not null default 'all' check (audience in ('all', 'creator', 'seller')),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_by text,
  created_at timestamptz not null default now()
);
create index if not exists announcements_active on public.announcements (starts_at desc);
alter table public.announcements enable row level security;
