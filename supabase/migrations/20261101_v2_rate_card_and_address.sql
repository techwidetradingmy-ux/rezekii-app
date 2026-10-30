-- Her delivery address (owner, 29 Oct 2026: optional at sign-up, needed for the Rate Card so sellers can send products for
-- paid reviews) and her Rate Card: prices per app, up to 3 packages and what sellers see. Real storage 31 Oct 2026.
create table if not exists delivery_addresses (
  user_id uuid primary key,
  address jsonb not null,
  updated_at timestamptz not null default now()
);
alter table delivery_addresses enable row level security;

create table if not exists rate_cards (
  user_id uuid primary key,
  card jsonb not null,
  updated_at timestamptz not null default now()
);
alter table rate_cards enable row level security;
