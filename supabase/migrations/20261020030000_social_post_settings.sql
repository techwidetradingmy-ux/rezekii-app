-- Post settings per channel post (docs/flows/social-posting.md S1–S5): Facebook draft; Instagram feed, collaborators,
-- trial reel; Threads who can reply and topic. Shapes are checked by src/modules/social/settings.ts.
alter table public.social_posts add column settings jsonb not null default '{}'::jsonb;
