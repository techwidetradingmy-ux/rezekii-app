-- Each creator's showcase as last read from TikTok, and her last Risk Check (owner, 1 Nov 2026): kept per account so a reload
-- shows them at once; read again only on "Check again" or after 6 hours. Removals made in Rezekii are taken out straight away.
create table if not exists public.showcase_cache (
  user_id uuid primary key references public.app_users(id) on delete cascade,
  items jsonb not null default '[]'::jsonb,
  more boolean not null default false,
  items_at timestamptz,
  ratings jsonb,
  ratings_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.showcase_cache enable row level security;

-- The creator level a TAP link was made at: a recent link is reused only at the same level, so it pays her current rate.
alter table public.tap_links add column if not exists level text;
create index if not exists tap_links_user_product_made on public.tap_links (user_id, product_id, made_at desc);

-- TikTok Shop's facts for one product page: kept 30 minutes so opening a product again is instant.
create table if not exists public.product_facts_cache (
  product_id text primary key,
  data jsonb not null,
  at timestamptz not null default now()
);
alter table public.product_facts_cache enable row level security;
