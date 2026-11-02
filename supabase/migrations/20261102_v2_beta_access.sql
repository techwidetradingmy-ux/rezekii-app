-- Beta sign-up approval (owner, 2 Nov 2026): every new account waits for Techwide to let it in. Creators get 50 places (the limit
-- is in app_settings beta_cap); sellers can sign up but wait on a waitlist. One row per account and side (creator or seller app).
create table if not exists public.beta_access (
  user_id uuid not null references public.app_users(id) on delete cascade,
  side text not null check (side in ('creator', 'seller')),
  status text not null default 'waiting' check (status in ('waiting', 'approved', 'declined')),
  requested_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by text,
  reason text,
  -- When they tapped Join Our WhatsApp Group on the waiting screen.
  group_at timestamptz,
  primary key (user_id, side)
);
create index if not exists beta_access_queue on public.beta_access (side, status, requested_at);
alter table public.beta_access enable row level security;

-- Accounts made before the beta keep working (both sides), and don't take one of the 50 places.
insert into public.beta_access (user_id, side, status, decided_at, decided_by)
select id, s.side, 'approved', now(), 'before beta' from public.app_users cross join (values ('creator'), ('seller')) as s(side)
on conflict do nothing;

insert into public.app_settings (key, value, updated_at) values ('beta_cap', '50'::jsonb, now()) on conflict (key) do nothing;
