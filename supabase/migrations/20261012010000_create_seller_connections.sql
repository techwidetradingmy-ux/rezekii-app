-- A seller shop that authorized Rezekii (first: Zemvello Wellness, owned by Techwide), for TikTok's seller-only
-- creator data: marketplace creator search and bestselling creators. Tokens are encrypted by the app (AES-256-GCM).
create table public.seller_connections (
  shop_id text primary key,
  shop_name text not null,
  shop_code text,
  shop_cipher text not null,
  region text,
  seller_open_id text,
  access_token_enc text not null,
  access_token_expires_at timestamptz not null,
  refresh_token_enc text not null,
  refresh_token_expires_at timestamptz not null,
  granted_scopes text[],
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS on with no policies: browser keys can't read or write; only the server's secret key can.
alter table public.seller_connections enable row level security;
revoke all on public.seller_connections from anon, authenticated;
