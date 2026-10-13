-- TAP Marketplace: one compact row per product in Techwide's ongoing TAP campaigns, rebuilt from the daily refresh,
-- plus creators' free-sample requests (a queue for Techwide, which applies for the sample in TikTok Shop).

create table public.tap_catalog (
  product_id text primary key,
  name text not null,
  shop text,
  category text,
  image text,
  price_lo numeric,
  price_hi numeric,
  open_rate int,                 -- TikTok's Open Plan rate ×100 (Bronze earns this)
  silver_rate int,               -- Open Plan + 1%, capped at the campaign's total rate
  total_rate int,                -- the most a TAP link can give (server-only; never sent to browsers)
  sold bigint not null default 0,
  sold_today bigint not null default 0,  -- units sold since the previous day's refresh
  samples int not null default 0,
  stock bigint,
  campaign_count int not null default 1,
  campaign_id text,
  campaign_name text,
  campaign_end bigint,
  variants jsonb not null default '[]',
  as_of date not null,
  updated_at timestamptz not null default now()
);
create index tap_catalog_sold on public.tap_catalog (sold desc);
create index tap_catalog_today on public.tap_catalog (sold_today desc, sold desc);
create index tap_catalog_rate on public.tap_catalog (silver_rate desc, sold desc);
create index tap_catalog_category on public.tap_catalog (category);
create index tap_catalog_shop on public.tap_catalog (shop);

-- Builds tap_catalog from the latest TAP snapshot. A product in several campaigns keeps its best-paying one.
create or replace function public.rebuild_tap_catalog()
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  d date;
  n int;
begin
  select max(as_of) into d from public.market_snapshots where dataset = 'tap_products';
  if d is null then return 0; end if;

  with rows as (
    select p, coalesce((p->>'partner_commission_rate')::int, 0) as pr
      from public.market_snapshots s, jsonb_array_elements(s.items) p
     where s.dataset = 'tap_products' and s.as_of = d and p->>'campaign_status' = 'ONGOING'
  ), counts as (
    select p->>'id' as id, count(distinct p->>'campaign_id')::int as c from rows group by 1
  ), best as (
    select distinct on (p->>'id') p from rows order by p->>'id', pr desc
  )
  insert into public.tap_catalog as t (product_id, name, shop, category, image, price_lo, price_hi, open_rate, silver_rate, total_rate,
                                       sold, sold_today, samples, stock, campaign_count, campaign_id, campaign_name, campaign_end, variants, as_of, updated_at)
  select b.p->>'id',
         left(regexp_replace(b.p->>'name', '\s+', ' ', 'g'), 160),
         b.p->>'shop_name',
         coalesce(b.p->'category'->>'name', 'Other'),
         regexp_replace(b.p->>'main_image_url', '~tplv-([a-z0-9]+)-origin-jpeg\.jpeg', '~tplv-\1-resize-webp:300:300.webp'),
         (b.p->'lowest_price'->>'amount')::numeric,
         coalesce((b.p->'highest_price'->>'amount')::numeric, (b.p->'lowest_price'->>'amount')::numeric),
         (b.p->>'open_collaboration_commission_rate')::int,
         least(coalesce((b.p->>'open_collaboration_commission_rate')::int, 0) + 100,
               coalesce((b.p->>'total_commission_rate')::int, coalesce((b.p->>'open_collaboration_commission_rate')::int, 0) + 100)),
         (b.p->>'total_commission_rate')::int,
         coalesce((b.p->>'product_sales')::bigint, 0),
         0,
         coalesce((b.p->>'sample_quota')::int, 0),
         (b.p->>'inventory')::bigint,
         c.c,
         b.p->>'campaign_id',
         b.p->>'campaign_name',
         (b.p->>'campaign_end_time')::bigint,
         coalesce((select jsonb_agg(jsonb_build_array(
                    coalesce(nullif((select string_agg(pp->>'value_name', ' / ') from jsonb_array_elements(sk->'properties') pp), ''), sk->>'sku_name', 'Default'),
                    (sk->'base_price'->>'sale_price')::numeric,
                    coalesce((sk->'inventory'->>'available_quantity')::int, 0)))
                    from (select sk from jsonb_array_elements(coalesce(b.p->'sku_information_list', '[]')) sk limit 6) x), '[]'),
         d,
         now()
    from best b join counts c on c.id = b.p->>'id'
  on conflict (product_id) do update set
    name = excluded.name, shop = excluded.shop, category = excluded.category, image = excluded.image,
    price_lo = excluded.price_lo, price_hi = excluded.price_hi, open_rate = excluded.open_rate, silver_rate = excluded.silver_rate,
    total_rate = excluded.total_rate,
    sold_today = case when t.as_of < excluded.as_of then greatest(excluded.sold - t.sold, 0) else t.sold_today end,
    sold = excluded.sold, samples = excluded.samples, stock = excluded.stock, campaign_count = excluded.campaign_count,
    campaign_id = excluded.campaign_id, campaign_name = excluded.campaign_name, campaign_end = excluded.campaign_end,
    variants = excluded.variants, as_of = excluded.as_of, updated_at = now();

  -- products no longer in an ongoing campaign leave the marketplace
  delete from public.tap_catalog where as_of < d;
  select count(*) into n from public.tap_catalog;
  return n;
end;
$$;
revoke all on function public.rebuild_tap_catalog() from public, anon, authenticated;
grant execute on function public.rebuild_tap_catalog() to service_role;

-- A creator's free-sample request. Techwide applies for it in TikTok Shop; from then on the sample follows TikTok's status.
create table public.sample_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  product_id text not null,
  campaign_id text,
  product_name text not null,
  shop text,
  image text,
  status text not null default 'requested' check (status in ('requested', 'applied', 'rejected', 'cancelled')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- one open request per creator and product
create unique index sample_requests_open on public.sample_requests (user_id, product_id) where status in ('requested', 'applied');
create index sample_requests_queue on public.sample_requests (status, created_at);

alter table public.tap_catalog enable row level security;
alter table public.sample_requests enable row level security;
revoke all on public.tap_catalog, public.sample_requests from anon, authenticated;
