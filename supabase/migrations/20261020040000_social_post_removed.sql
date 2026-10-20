-- Accurate status after posting (docs/flows/social-posting.md P11): the timer asks each app whether a recent post still
-- exists; a post deleted in the app becomes "removed". live_checked_at is when it was last asked.
alter table public.social_posts drop constraint social_posts_status_check;
alter table public.social_posts add constraint social_posts_status_check
  check (status in ('draft', 'scheduled', 'publishing', 'processing', 'posted', 'failed', 'cancelled', 'removed'));
alter table public.social_posts add column live_checked_at timestamptz;
