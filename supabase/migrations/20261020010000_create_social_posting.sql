-- Social posting: Facebook Pages, Instagram and Threads next to TikTok (docs/flows/social-posting.md).
-- One row per connected account, one row per channel post. TikTok posting (public.posts) is unchanged.

create table public.social_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users (id) on delete cascade,
  platform text not null check (platform in ('facebook', 'instagram', 'threads')),
  -- Facebook Page id, Instagram user id or Threads user id.
  external_id text not null,
  name text,
  username text,
  avatar_url text,
  -- Instagram: BUSINESS or MEDIA_CREATOR (personal accounts can't be connected).
  account_type text,
  token_enc text not null,
  -- null = doesn't expire (Facebook Page tokens). Instagram and Threads tokens last 60 days and are renewed.
  token_expires_at timestamptz,
  status text not null default 'active' check (status in ('active', 'reconnect')),
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, platform, external_id)
);
create index social_accounts_by_user on public.social_accounts (user_id);

create table public.social_posts (
  id uuid primary key default gen_random_uuid(),
  -- Every channel post made from one New post shares a group (and the TikTok post, when there is one).
  group_id uuid not null,
  tiktok_post_id uuid references public.posts (id) on delete set null,
  user_id uuid not null references public.app_users (id) on delete cascade,
  -- Kept as history when the channel is disconnected (its scheduled posts are cancelled first).
  account_id uuid references public.social_accounts (id) on delete set null,
  account_name text,
  platform text not null check (platform in ('facebook', 'instagram', 'threads')),
  source text not null check (source in ('upload', 'link')),
  -- A copy of the upload for these channels, so TikTok deleting its file never takes it away.
  storage_path text,
  link_url text,
  duration_sec numeric,
  caption text not null default '',
  first_comment text not null default '',
  -- Facebook: remind the owner to add the product link in Facebook (Monetization) until they tick Done.
  link_reminder boolean not null default false,
  link_done boolean not null default false,
  status text not null default 'draft'
    check (status in ('draft', 'scheduled', 'publishing', 'processing', 'posted', 'failed', 'cancelled')),
  scheduled_at timestamptz,
  next_attempt_at timestamptz,
  attempts int not null default 0,
  -- Instagram/Threads media container or Facebook video id while the channel processes the video.
  container_id text,
  external_post_id text,
  permalink text,
  comment_status text not null default 'none' check (comment_status in ('none', 'pending', 'posted', 'failed')),
  comment_id text,
  comment_error text,
  last_error text,
  posted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (source <> 'upload' or storage_path is not null),
  check (source <> 'link' or link_url is not null)
);
create index social_posts_due on public.social_posts (status, next_attempt_at);
create index social_posts_by_user on public.social_posts (user_id, scheduled_at desc);
create index social_posts_by_group on public.social_posts (group_id);

-- RLS on with no policies: browser keys can't read or write; only the server's secret key can.
alter table public.social_accounts enable row level security;
alter table public.social_posts enable row level security;
revoke all on public.social_accounts, public.social_posts from anon, authenticated;

-- Hands the timer up to `max_posts` due channel posts (marked publishing, try +1), so two runs never take the same one.
-- A post stuck in "publishing" for 10 minutes counts as a failed try first, as for TikTok posts.
create or replace function public.claim_due_social_posts(max_posts int)
returns setof public.social_posts
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.social_posts
     set status = case when attempts >= 3 then 'failed' else 'scheduled' end,
         next_attempt_at = case when attempts >= 3 then null else now() end,
         last_error = 'The last try stopped before finishing (it took too long).',
         updated_at = now()
   where status = 'publishing' and updated_at < now() - interval '10 minutes';

  return query
  update public.social_posts p
     set status = 'publishing', attempts = p.attempts + 1, updated_at = now()
   where p.id in (
     select id from public.social_posts
      where status = 'scheduled' and next_attempt_at <= now()
      order by next_attempt_at
      limit max_posts
      for update skip locked
   )
  returning p.*;
end;
$$;
revoke all on function public.claim_due_social_posts(int) from public, anon, authenticated;
grant execute on function public.claim_due_social_posts(int) to service_role;
