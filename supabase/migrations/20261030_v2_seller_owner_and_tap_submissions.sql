-- Rezekii 2.0 preview (owner, 30 Oct 2026): who authorized each seller shop, and sellers' requests to join Techwide's TAP.
-- Applied to the test database (rezekii-test) only.
alter table seller_connections add column if not exists connected_by uuid references app_users(id) on delete set null;

create table if not exists tap_submissions (
  id uuid primary key default gen_random_uuid(),
  shop_id text not null references seller_connections(shop_id) on delete cascade,
  product_id text not null,
  product_name text not null,
  product_image text,
  submitted_by uuid references app_users(id) on delete set null,
  raise_pct numeric(5,2) not null check (raise_pct >= 2),
  samples_per_sku integer not null check (samples_per_sku > 0),
  creator_conditions jsonb not null default '{}'::jsonb,
  status text not null default 'submitted' check (status in ('submitted', 'in_review', 'with_tiktok', 'live', 'not_approved', 'withdrawn')),
  reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- One open request per product: a second Submit can't double it.
create unique index if not exists tap_submissions_one_open on tap_submissions (shop_id, product_id) where status in ('submitted', 'in_review', 'with_tiktok', 'live');
create index if not exists tap_submissions_shop on tap_submissions (shop_id, created_at desc);
alter table tap_submissions enable row level security;

-- Admin TAP pipeline on real requests (same day). approved = Techwide's review passed, waiting to be sent to TikTok.
alter table tap_submissions drop constraint if exists tap_submissions_status_check;
alter table tap_submissions add constraint tap_submissions_status_check check (status in ('submitted', 'in_review', 'approved', 'with_tiktok', 'live', 'not_approved', 'withdrawn'));
drop index if exists tap_submissions_one_open;
create unique index tap_submissions_one_open on tap_submissions (shop_id, product_id) where status in ('submitted', 'in_review', 'approved', 'with_tiktok', 'live');
-- The shop's Techwide TAP campaign, the commission proposed in it (%), and TikTok's total rate once approved (×100).
alter table tap_submissions add column if not exists campaign_id text;
alter table tap_submissions add column if not exists commission_pct numeric(5,2);
alter table tap_submissions add column if not exists total_rate integer;
alter table tap_submissions add column if not exists owner_name text;
alter table tap_submissions add column if not exists notes jsonb not null default '[]'::jsonb;
-- Each step: { at, stage, what, who }.
alter table tap_submissions add column if not exists history jsonb not null default '[]'::jsonb;

-- The product's public (open plan) commission when the seller submitted it, ×100. Null when it had none.
alter table tap_submissions add column if not exists public_rate integer;
