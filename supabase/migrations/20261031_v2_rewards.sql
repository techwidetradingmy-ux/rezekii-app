-- Rezekii 2.0 preview (owner, 31 Oct 2026): Rewards on real data. Credits, missions, streaks, referrals and saved profiles.
-- Applied to the test database (rezekii-test) only.

-- Every credit in and out. The balance is the sum. `ref` makes each grant or spend happen once (a second tap does nothing).
-- Earned credits last 12 months; the oldest are used first, and what's left of an old grant is written off as an 'expired' row.
-- A creator wallet and a seller wallet are kept apart, even for one account that is both.
create table if not exists credit_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users(id) on delete cascade,
  side text not null default 'creator' check (side in ('creator', 'seller')),
  amount integer not null check (amount <> 0),
  kind text not null check (kind in ('welcome', 'mission', 'chest', 'streak', 'referral', 'post', 'refund', 'expired', 'admin')),
  what text not null,
  ref text not null,
  -- The Malaysian business day a daily mission counted for.
  day date,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  constraint credit_ledger_user_side_ref_key unique (user_id, side, ref)
);
create index if not exists credit_ledger_user on credit_ledger (user_id, side, created_at);
alter table credit_ledger enable row level security;

-- Spends credits only if the balance covers it; one spend per ref. Locked per account so two taps can't both pass.
create or replace function spend_credits(p_user uuid, p_side text, p_amount integer, p_ref text, p_what text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare bal integer;
begin
  if p_amount <= 0 then return jsonb_build_object('ok', false, 'error', 'bad amount'); end if;
  perform pg_advisory_xact_lock(hashtext(p_user::text || p_side));
  if exists (select 1 from credit_ledger where user_id = p_user and side = p_side and ref = p_ref) then
    return jsonb_build_object('ok', true, 'again', true);
  end if;
  select coalesce(sum(amount), 0) into bal from credit_ledger where user_id = p_user and side = p_side;
  if bal < p_amount then return jsonb_build_object('ok', false, 'balance', bal); end if;
  insert into credit_ledger (user_id, side, amount, kind, what, ref) values (p_user, p_side, -p_amount, 'post', p_what, p_ref);
  return jsonb_build_object('ok', true, 'balance', bal - p_amount);
end $$;
revoke execute on function spend_credits(uuid, text, integer, text, text) from public, anon, authenticated;

-- Things a mission counts that leave no other trace: a shared card, results opened. One per kind per business day.
create table if not exists reward_events (
  user_id uuid not null references app_users(id) on delete cascade,
  kind text not null check (kind in ('share', 'results')),
  day date not null,
  created_at timestamptz not null default now(),
  primary key (user_id, kind, day)
);
alter table reward_events enable row level security;

-- Each account's invite code (the same code for the creator and seller links).
create table if not exists referral_codes (
  user_id uuid primary key references app_users(id) on delete cascade,
  code text not null unique check (code ~ '^[A-Z0-9]{4,12}$'),
  created_at timestamptz not null default now()
);
alter table referral_codes enable row level security;

-- Who brought whom. One inviter per account, set when the account is made, never changed.
-- Successful = the friend links TikTok Shop (creators) or connects Seller Center (sellers) and saves their details within 14
-- days. `qualified_with` is that shop, so one shop can't earn twice.
create table if not exists referrals (
  friend_id uuid primary key references app_users(id) on delete cascade,
  inviter_id uuid not null references app_users(id) on delete cascade,
  side text not null check (side in ('creator', 'seller')),
  via text not null check (via in ('link', 'code')),
  clicked_at timestamptz,
  joined_at timestamptz not null default now(),
  qualified_at timestamptz,
  qualified_with text,
  check (friend_id <> inviter_id)
);
create index if not exists referrals_inviter on referrals (inviter_id, joined_at desc);
create unique index if not exists referrals_one_shop on referrals (side, qualified_with) where qualified_with is not null;
alter table referrals enable row level security;

-- Saved details: the creator profile, or the seller's contact name and phone. Locked once saved; changes go through support.
create table if not exists profiles (
  user_id uuid not null references app_users(id) on delete cascade,
  side text not null check (side in ('creator', 'seller')),
  details jsonb not null default '{}'::jsonb,
  complete boolean not null default false,
  saved_at timestamptz not null default now(),
  primary key (user_id, side)
);
alter table profiles enable row level security;

-- The creator's commission earned so far (refunded lines left out), for the "First RM 1,000" badge (owner, 31 Oct 2026).
create or replace function commission_total(p_user uuid) returns numeric
language sql stable security definer set search_path = public as $$
  select coalesce(sum(coalesce(commission_earned_actual, commission_earned_estimated, commission_actual, commission_estimated, 0)), 0)
  from creator_orders where user_id = p_user and coalesce(status, '') <> 'REFUNDED';
$$;
revoke execute on function commission_total(uuid) from public, anon, authenticated;
