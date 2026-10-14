-- Each linked creator's own TikTok Shop affiliate orders (all shops), one row per order line, saved by the daily refresh.
-- They feed the creator's Sales page, admin Stats and the monthly Rankings by real GMV.
create table public.creator_orders (
  order_id text not null,
  line_id text not null,                 -- TikTok's SKU line id within the order
  user_id uuid not null references public.app_users(id) on delete cascade,
  product_id text,
  product_name text,
  shop_name text,
  price numeric(12, 2) not null default 0,   -- what the buyer paid for the line, in RM
  quantity integer not null default 0,
  refunded_quantity integer not null default 0,
  returned_quantity integer not null default 0,
  commission_estimated numeric(12, 2),
  commission_actual numeric(12, 2),
  campaign_id text,                      -- set when the sale came through a TAP campaign
  link_tag text,                         -- the tag on the affiliate link, when it had one
  content_type text,                     -- VIDEO, LIVE, SHOWCASE ...
  content_id text,                       -- the video or LIVE that made the sale
  status text,                           -- TikTok's order status (To-SETTLE, SETTLED, REFUNDED ...)
  created_at timestamptz not null,
  updated_at timestamptz,
  synced_at timestamptz not null default now(),
  primary key (order_id, line_id)
);
create index creator_orders_user on public.creator_orders (user_id, created_at desc);
alter table public.creator_orders enable row level security;
revoke all on public.creator_orders from anon, authenticated;
