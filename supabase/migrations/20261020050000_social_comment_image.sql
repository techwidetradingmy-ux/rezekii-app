-- One image in the first comment (C4d): Facebook and Threads take it; Instagram comments are text only.
alter table public.social_posts add column comment_image_path text;

-- The upload bucket also takes the comment image (JPG or PNG).
update storage.buckets
set allowed_mime_types = array['video/mp4', 'video/quicktime', 'video/webm', 'image/jpeg', 'image/png']
where id = 'post-media';
