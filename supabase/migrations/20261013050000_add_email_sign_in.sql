-- Email and password sign-in (creator accounts only; Techwide admins keep signing in with Google).
-- Only a salted scrypt hash is stored. An email account never joins a Google account with the same address,
-- because the email is not verified and that would let anyone take over the Google account.
alter table public.app_users
  add column password_hash text,
  add column failed_logins int not null default 0,
  add column locked_until timestamptz;

create unique index app_users_email_login on public.app_users (lower(email)) where password_hash is not null;
