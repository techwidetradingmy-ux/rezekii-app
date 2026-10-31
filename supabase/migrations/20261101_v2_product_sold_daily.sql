-- Each product's all-time units sold on TikTok, as read on a day (owner, 31 Oct 2026). The difference between two reads a day
-- apart is how many sold across TikTok in that day, for products outside TikTok's daily top-100 lists. Kept 14 days.
create table if not exists public.product_sold_daily (
  product_id text not null,
  day date not null,
  sold bigint not null,
  price numeric,
  at timestamptz not null default now(),
  primary key (product_id, day)
);
create index if not exists product_sold_daily_day_idx on public.product_sold_daily (day);
alter table public.product_sold_daily enable row level security;
