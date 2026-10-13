-- Creator approval. A creator links TikTok Shop from My accounts; Techwide then approves the account (or it is approved straight
-- away while "Approve new creators automatically" is on). Rezekii's Partner Center app allows 25 linked creators while in beta:
-- when they are taken, new creators join a waitlist and are invited in turn as places free up.

-- Which Rezekii account linked each TikTok Shop creator account.
alter table public.affiliate_connections add column user_id uuid references public.app_users(id) on delete set null;
create index affiliate_connections_user on public.affiliate_connections (user_id);

create table public.creator_access (
  user_id uuid primary key references public.app_users(id) on delete cascade,
  status text not null check (status in ('waiting', 'approved', 'rejected', 'waitlist', 'invited')),
  username text,              -- the TikTok Shop handle, lowercase
  reason text,                -- why it was rejected (the creator sees it)
  requested_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by text
);
create index creator_access_status on public.creator_access (status, requested_at);

-- Links made before approval existed (the test handles) stay approved.
update public.affiliate_connections a set user_id = u.id
  from public.app_users u
 where a.user_id is null and lower(u.tiktok_username) = a.username;
insert into public.creator_access (user_id, status, username, decided_at, decided_by)
select user_id, 'approved', username, now(), 'linked before approval'
  from public.affiliate_connections where user_id is not null
on conflict (user_id) do nothing;

alter table public.creator_access enable row level security;
revoke all on public.creator_access from anon, authenticated;

-- The activity log also records TAP decisions (approving or declining shops' campaign products).
alter table public.admin_activity drop constraint admin_activity_kind_check;
alter table public.admin_activity add constraint admin_activity_kind_check check (kind in ('Posts', 'Creators', 'Admins', 'Connections', 'TAP'));
