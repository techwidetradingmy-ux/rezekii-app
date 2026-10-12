-- Phase 1 posting: one video per post, sent to the creator's own TikTok account (Content Posting API).
-- `mode`: direct = posted to the profile; inbox = sent to the creator's TikTok drafts to finish in the app.
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  tiktok_open_id text not null,
  mode text not null default 'direct' check (mode in ('direct', 'inbox')),
  source text not null check (source in ('upload', 'link')),
  storage_path text,
  link_url text,
  video_size bigint,
  duration_sec numeric,
  caption text not null default '',
  privacy_level text,
  allow_comments boolean not null default false,
  allow_duet boolean not null default false,
  allow_stitch boolean not null default false,
  brand_organic boolean not null default false,
  branded_content boolean not null default false,
  is_aigc boolean not null default false,
  status text not null default 'draft'
    check (status in ('draft', 'scheduled', 'publishing', 'processing', 'posted', 'sent_to_inbox', 'failed', 'cancelled')),
  scheduled_at timestamptz,
  next_attempt_at timestamptz,
  attempts int not null default 0,
  publish_id text,
  tiktok_post_id text,
  last_error text,
  posted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (source <> 'upload' or storage_path is not null),
  check (source <> 'link' or link_url is not null)
);
create index posts_due on public.posts (status, next_attempt_at);
create index posts_by_user on public.posts (user_id, scheduled_at desc);

-- RLS on with no policies: browser keys can't read or write; only the server's secret key can.
alter table public.posts enable row level security;
revoke all on public.posts from anon, authenticated;

-- Hands the timer up to `max_posts` due posts and marks them publishing, so two runs never take the same post.
create or replace function public.claim_due_posts(max_posts int)
returns setof public.posts
language sql
security definer
set search_path = ''
as $$
  update public.posts p
     set status = 'publishing', attempts = p.attempts + 1, updated_at = now()
   where p.id in (
     select id from public.posts
      where status = 'scheduled' and next_attempt_at <= now()
      order by next_attempt_at
      limit max_posts
      for update skip locked
   )
  returning p.*;
$$;
revoke all on function public.claim_due_posts(int) from public, anon, authenticated;
grant execute on function public.claim_due_posts(int) to service_role;

-- Private bucket for uploaded videos. 50 MB is Supabase's free-plan limit per file; bigger videos use a link.
-- Files are deleted once TikTok confirms the post.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('post-media', 'post-media', false, 52428800, array['video/mp4', 'video/quicktime', 'video/webm'])
on conflict (id) do nothing;

-- The timer's token lives only in Vault (created here, never shown). The timer sends it; the app asks the database to check it.
create extension if not exists pg_net;
create extension if not exists pg_cron;
select vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'posts_timer_token', 'Sent by the posting timer to /api/cron/posts')
 where not exists (select 1 from vault.secrets where name = 'posts_timer_token');

create or replace function public.check_posts_timer_token(token text)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select exists (select 1 from vault.decrypted_secrets where name = 'posts_timer_token' and decrypted_secret = token);
$$;
revoke all on function public.check_posts_timer_token(text) from public, anon, authenticated;
grant execute on function public.check_posts_timer_token(text) to service_role;

-- The per-environment schedule (which site the timer calls every minute) is set separately:
--   select cron.schedule('rezekii-posts', '* * * * *', $$ select net.http_post(
--     url := '<site>/api/cron/posts',
--     headers := jsonb_build_object('content-type', 'application/json', 'authorization',
--       'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'posts_timer_token')),
--     body := '{}'::jsonb, timeout_milliseconds := 290000) $$);
