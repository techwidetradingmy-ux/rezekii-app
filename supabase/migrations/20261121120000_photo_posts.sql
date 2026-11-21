-- Photo posts (owner, 21 Nov 2026): one or more photos instead of a video, on TikTok, Facebook, Instagram and Threads.
-- photo_paths lists the photos in order (in bucket post-media); null for a video post. storage_path holds the first photo,
-- so the "an upload has a file" checks still hold and code that looks at one file still finds it.
alter table public.posts add column if not exists photo_paths text[];
alter table public.social_posts add column if not exists photo_paths text[];
