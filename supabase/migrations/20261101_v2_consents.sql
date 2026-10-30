-- Consent log (owner, 31 Oct 2026): every agreement to the Terms and Privacy Policy before linking TikTok Shop, and every
-- withdrawal (unlinking), with the versions shown and where it came from. Never edited or deleted.
create table if not exists consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role text not null check (role in ('creator', 'seller')),
  action text not null check (action in ('agreed', 'withdrawn')),
  terms text not null,
  privacy text not null,
  ip text,
  user_agent text,
  created_at timestamptz not null default now()
);
create index if not exists consents_user on consents (user_id, created_at desc);
alter table consents enable row level security;
