-- Wish list (owner, 29 Oct 2026; real storage 31 Oct 2026): a creator asks for a TikTok Shop product that isn't on Rezekii yet,
-- saying what she'll give each month if it launches. One wish per creator per product; the board adds them up per product.
create table if not exists wishes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  product_id text not null check (product_id ~ '^[0-9]{6,25}$'),
  name text not null,
  shop text,
  image text,
  category text,
  price numeric,
  -- Open-plan rate when she asked, ×100 (600 = 6%).
  rate integer,
  videos integer not null check (videos between 0 and 60),
  lives integer not null check (lives between 0 and 30),
  rights integer not null check (rights in (0, 90, 180)),
  months integer not null check (months in (1, 3, 6)),
  note text check (char_length(note) <= 200),
  -- Set by Techwide: the seller said no, or the extra rate agreed when it launched.
  declined_at timestamptz,
  -- When we first saw it on Rezekii (for her notification).
  launched_at timestamptz,
  raise numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, product_id),
  check (videos + lives > 0)
);
create index if not exists wishes_product on wishes (product_id);
alter table wishes enable row level security;
