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
