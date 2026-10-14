-- A linked creator's TikTok creator level (0-8), found when they link TikTok Shop and again after each 1st (owner, 14 Oct 2026).
alter table public.affiliate_connections add column tt_level smallint;
alter table public.affiliate_connections add column tt_level_at timestamptz;
