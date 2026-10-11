-- Phase 1 sign-in: Rezekii accounts (Google or TikTok), their sessions, and each account's TikTok connection for posting.
-- Tokens are encrypted by the app (AES-256-GCM) before they reach the database.
create table public.app_users (
  id uuid primary key default gen_random_uuid(),
  role text not null check (role in ('admin', 'creator')),
  display_name text,
  avatar_url text,
  email text unique,
  google_sub text unique,
  tiktok_open_id text unique,
  tiktok_username text,
  created_at timestamptz not null default now(),
  last_sign_in_at timestamptz not null default now()
);

-- Only a SHA-256 hash of each session token is stored; the token itself lives in the browser's HTTP-only cookie.
create table public.app_sessions (
  token_hash text primary key,
  user_id uuid not null references public.app_users (id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index app_sessions_user_id_idx on public.app_sessions (user_id);

-- TikTok for Developers (Login Kit + Content Posting) connection, one per TikTok account.
create table public.tiktok_connections (
  open_id text primary key,
  user_id uuid not null references public.app_users (id) on delete cascade,
  username text,
  display_name text,
  avatar_url text,
  access_token_enc text not null,
  access_token_expires_at timestamptz not null,
  refresh_token_enc text not null,
  refresh_token_expires_at timestamptz not null,
  scopes text[],
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index tiktok_connections_user_id_idx on public.tiktok_connections (user_id);

-- RLS on with no policies: browser keys can't read or write; only the server's secret key can.
alter table public.app_users enable row level security;
alter table public.app_sessions enable row level security;
alter table public.tiktok_connections enable row level security;
revoke all on public.app_users, public.app_sessions, public.tiktok_connections from anon, authenticated;
