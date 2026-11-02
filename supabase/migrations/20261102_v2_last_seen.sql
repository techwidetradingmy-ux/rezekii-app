-- When each account last used Rezekii (owner, 2 Nov 2026): the nightly refresh does the most recently active creators first
-- and skips accounts not used for 14 days. Set by /api/v2/me at most once an hour; filled from sign-ins and sessions so far.
alter table app_users add column if not exists last_seen_at timestamptz;
update app_users u set last_seen_at = greatest(u.last_sign_in_at, (select max(s.created_at) from app_sessions s where s.user_id = u.id))
where u.last_seen_at is null;
