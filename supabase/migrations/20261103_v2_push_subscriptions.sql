-- Phone notifications (owner, 3 Nov 2026): Rezekii on a phone's Home Screen gets her notifications as push notifications. One
-- row per device (a browser's push address, `endpoint`, is unique), saved when she turns Phone Notifications on in Settings, for
-- the app she turned it on in (creator or seller) and the language that device uses. The quarter-hour timer pushes what's new:
-- `sent_ids` are the notifications already pushed to this device, so none goes twice. A device that answers 404/410 has
-- unsubscribed and is removed; `fail_count` counts other failures in a row (back to 0 after one goes through).
-- Read and written by the server only.
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  app text not null check (app in ('creator', 'seller')),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  lang text not null default 'en' check (lang in ('en', 'ms', 'zh')),
  user_agent text,
  created_at timestamptz not null default now(),
  last_ok_at timestamptz,
  fail_count integer not null default 0,
  sent_ids text[] not null default '{}'
);
create index if not exists push_subscriptions_user on public.push_subscriptions (user_id, app);
alter table public.push_subscriptions enable row level security;
