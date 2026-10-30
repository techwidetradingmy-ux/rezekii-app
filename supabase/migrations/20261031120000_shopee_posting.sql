-- Shopee Video posting (step 2 of Shopee, owner 30 Oct 2026): a New post can go to connected Shopee accounts too, as one
-- more channel post in social_posts. The Shopee account lives in shopee_connections (not social_accounts), so the post
-- points there instead; container_id holds Shopee's video_upload_id while Shopee processes the video.
alter table public.social_posts drop constraint social_posts_platform_check;
alter table public.social_posts add constraint social_posts_platform_check
  check (platform in ('facebook', 'instagram', 'threads', 'shopee'));

-- Kept as history when the Shopee account is disconnected (its scheduled posts are cancelled first).
alter table public.social_posts add column shopee_connection_id uuid references public.shopee_connections (id) on delete set null;
