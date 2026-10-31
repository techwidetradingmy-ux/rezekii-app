-- Techwide's decisions on products shops register in their campaigns (owner, 31 Oct 2026): made in Rezekii (with the reason the
-- shop sees) or seen as made in Partner Center (TikTok doesn't share that reason). The seller is notified of each one.
create table if not exists public.product_reviews (
  id uuid primary key default gen_random_uuid(),
  campaign_id text not null,
  product_id text not null,
  shop_id text,
  product_name text,
  decision text not null check (decision in ('approved', 'declined')),
  reason text,
  decided_by text,
  decided_at timestamptz not null default now()
);
create index if not exists product_reviews_product on public.product_reviews (campaign_id, product_id, decided_at desc);
create index if not exists product_reviews_shop on public.product_reviews (shop_id, decided_at desc);
alter table public.product_reviews enable row level security;

-- Products already live are kept as decided earlier ('backfill'), so they don't come back as new notifications.
insert into public.product_reviews (campaign_id, product_id, shop_id, product_name, decision, reason, decided_by, decided_at)
select t.campaign_id, t.product_id, t.shop_id, t.product_name, 'approved', null, 'backfill', t.updated_at
from public.tap_submissions t
where t.status = 'live' and t.campaign_id is not null
  and not exists (select 1 from public.product_reviews r where r.campaign_id = t.campaign_id and r.product_id = t.product_id);
