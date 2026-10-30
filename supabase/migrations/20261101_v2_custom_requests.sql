-- Custom Service requests from sellers (owner, 29 Oct 2026; real storage 31 Oct 2026). The team replies on WhatsApp with a
-- plan and a quote; admin's Business > Custom Service will list these.
create table if not exists custom_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  shop text,
  services text[] not null,
  budget text,
  goal text check (char_length(goal) <= 1000),
  whatsapp text not null,
  status text not null default 'new' check (status in ('new', 'contacted', 'quoted', 'won', 'lost')),
  created_at timestamptz not null default now()
);
create index if not exists custom_requests_new on custom_requests (status, created_at desc);
alter table custom_requests enable row level security;
