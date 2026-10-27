-- Email sign-in gets its own address (owner, 27 Oct 2026): an account that also signs in with Google can sign in with any
-- email, which Google sign-in (which writes `email`) no longer overwrites. Accounts that sign in with email keep theirs.
alter table public.app_users add column login_email text;
update public.app_users set login_email = lower(email) where password_hash is not null and email is not null;

-- No two accounts share a sign-in email, in any letter case. This replaces app_users_email_login.
create unique index app_users_login_email on public.app_users (lower(login_email)) where login_email is not null;
drop index if exists public.app_users_email_login;

-- Whether another account already uses `p_email`, as its sign-in email or as its Google or sign-up email (any letter case),
-- so a sign-in email never clashes with another account's address.
create or replace function public.email_in_use(p_email text, p_except uuid default null) returns boolean
language sql stable set search_path = public as $$
  select exists (
    select 1 from public.app_users
    where id is distinct from p_except and (lower(login_email) = lower(p_email) or lower(email) = lower(p_email))
  );
$$;
revoke all on function public.email_in_use(text, uuid) from public, anon, authenticated;
grant execute on function public.email_in_use(text, uuid) to service_role;
