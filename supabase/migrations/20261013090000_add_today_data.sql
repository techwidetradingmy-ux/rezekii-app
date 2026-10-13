-- Today page: when each TAP product first appeared (for "+N new this week") and a log of every link creators make on Rezekii
-- (TAP links and TikTok Shop affiliate links) for "Links made this week" and the link history.

alter table public.tap_catalog add column first_seen date;
-- Backfill from the oldest saved TAP snapshot that lists the product.
update public.tap_catalog t
   set first_seen = s.first
  from (select p->>'id' as id, min(m.as_of) as first
          from public.market_snapshots m, jsonb_array_elements(m.items) p
         where m.dataset = 'tap_products'
         group by 1) s
 where s.id = t.product_id;
update public.tap_catalog set first_seen = as_of where first_seen is null;
-- New rows get today's date; the daily rebuild never overwrites it.
alter table public.tap_catalog alter column first_seen set default current_date, alter column first_seen set not null;
create index tap_catalog_first_seen on public.tap_catalog (first_seen desc);

create table public.tap_links (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.app_users(id) on delete cascade,
  product_id text not null,
  product_name text,
  image text,
  tag text,
  link text not null,
  made_at timestamptz not null default now()
);
create index tap_links_user on public.tap_links (user_id, made_at desc);
alter table public.tap_links enable row level security;
