-- Beginner guide (owner, 4 Nov 2026): the Welcome Tour shows once per account and the Getting Started card can be closed, on
-- any device. Keys: tour_creator, tour_seller, list_creator, list_seller, each the time it was seen or closed.
alter table public.app_users add column if not exists guide_seen jsonb not null default '{}'::jsonb;
