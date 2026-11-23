-- Instagram through Facebook (owner, 23 Nov 2026): an Instagram account can also be connected with Facebook Login, through
-- the Facebook Page it's linked to. Only that way can a Reel get a licensed song (Meta's Instagram Audio API). Such an account
-- keeps its Page's token (no expiry) and talks to graph.facebook.com; null = Instagram Login (graph.instagram.com), as before.
alter table public.social_accounts add column if not exists connected_via text check (connected_via in ('facebook'));
