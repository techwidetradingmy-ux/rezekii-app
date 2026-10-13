-- Every creator promoting a product in Techwide's TAP campaigns, from TikTok's campaign data (refreshed daily).
-- My TAP products shows a creator the rows with their TikTok username; amounts are lifetime totals from TikTok.
create table public.tap_creator_products (
  campaign_id text not null,
  product_id text not null,
  username text not null,          -- TikTok username, lowercase
  nick_name text,
  temp_id text,                    -- TikTok's creator_temp_id, valid for about an hour
  temp_id_at timestamptz,
  affiliate_product_id text,
  paid numeric not null default 0, -- what buyers paid through this creator's links (RM)
  videos int not null default 0,
  lives int not null default 0,
  sample_status text,              -- e.g. NotRequested, AwaitingShipment, Shipped, ContentPending, Completed
  commission int,                  -- creator rate ×100
  product_name text,
  shop text,
  image text,
  as_of date not null,
  updated_at timestamptz not null default now(),
  primary key (campaign_id, product_id, username)
);
create index tap_creator_products_user on public.tap_creator_products (username);

alter table public.tap_creator_products enable row level security;
revoke all on public.tap_creator_products from anon, authenticated;
