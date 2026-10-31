-- Replies inside Rezekii: the team answers a message or change request in Admin, and she reads the reply in the app
-- (Settings › My Messages), not on WhatsApp.
alter table public.feedback add column if not exists reply text;
alter table public.feedback add column if not exists replied_at timestamptz;
alter table public.feedback add column if not exists replied_by text;
alter table public.feedback add column if not exists seen_at timestamptz;
alter table public.feedback drop constraint if exists feedback_reply_by_check;
alter table public.feedback add constraint feedback_reply_by_check check (reply_by = any (array['WhatsApp'::text, 'Email'::text, 'No need'::text, 'In app'::text]));
