-- The creator's showcase size, saved so Today shows it straight away instead of asking TikTok Shop on every visit.
-- Recounted from TikTok Shop at most once a day (in the background when Today opens) and nudged up after each + Showcase.
alter table public.affiliate_connections
  add column showcase_count integer,
  add column showcase_tap integer,
  add column showcase_more boolean,
  add column showcase_at timestamptz;
