-- Connect Shopee (step 1 of Shopee Video, owner 28 Oct 2026): a seller's shop or an affiliate's own account, connected on
-- Posts → Channels. Posting comes later; this only keeps the sign-in working. Kept apart from social_accounts (Meta channels)
-- so nothing in posting changes until Shopee posting is built.
create table public.shopee_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users (id) on delete cascade,
  -- Shopee's user_id: Video API calls are made with it, for sellers and affiliates alike.
  shopee_user_id text not null,
  -- Sellers only (they sign in as their shop); null for affiliates.
  shop_id text,
  role text not null check (role in ('seller', 'affiliate')),
  name text,
  avatar_url text,
  -- Access token: 4 hours. Refresh token: 30 days, works once, replaced on every refresh.
  access_token_enc text not null,
  access_expires_at timestamptz not null,
  refresh_token_enc text not null,
  refresh_expires_at timestamptz not null,
  status text not null default 'active' check (status in ('active', 'reconnect')),
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, shopee_user_id)
);
create index shopee_connections_to_renew on public.shopee_connections (refresh_expires_at) where status = 'active';

-- RLS on with no policies: browser keys can't read or write; only the server's secret key can.
alter table public.shopee_connections enable row level security;
revoke all on public.shopee_connections from anon, authenticated;
