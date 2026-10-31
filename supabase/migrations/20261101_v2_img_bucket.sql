-- Saved creator photos and video covers (owner, 31 Oct 2026): the practice database was missing the bucket rezekii.com has, so
-- photos were linked instead of saved and broke (Google photos refuse other sites; TikTok addresses expire).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('img', 'img', false, 2097152, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do nothing;
