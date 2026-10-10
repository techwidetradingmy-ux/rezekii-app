-- v0.1 proof: Techwide's Partner Connection (TikTok Shop Partner Center login, for TAP campaigns).
-- Tokens are encrypted by the app (AES-256-GCM) before they reach the database.
create table public.partner_connections (
  partner_open_id text primary key,
  name text not null,
  category_assets jsonb,
  access_token_enc text not null,
  access_token_expires_at timestamptz not null,
  refresh_token_enc text not null,
  refresh_token_expires_at timestamptz not null,
  granted_scopes text[],
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS on with no policies: browser keys can't read or write; only the server's secret key can.
alter table public.partner_connections enable row level security;
revoke all on public.partner_connections from anon, authenticated;
