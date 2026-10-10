-- v0.1 proof: a Creator Account's Affiliate Connection (TikTok Shop creator login).
-- Tokens are encrypted by the app (AES-256-GCM) before they reach the database.
create table public.affiliate_connections (
  creator_user_open_id text primary key,
  username text not null unique,
  avatar_url text,
  access_token_enc text not null,
  access_token_expires_at timestamptz not null,
  refresh_token_enc text not null,
  refresh_token_expires_at timestamptz not null,
  granted_scopes text[],
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS on with no policies: browser keys can't read or write; only the server's secret key can.
alter table public.affiliate_connections enable row level security;
revoke all on public.affiliate_connections from anon, authenticated;
