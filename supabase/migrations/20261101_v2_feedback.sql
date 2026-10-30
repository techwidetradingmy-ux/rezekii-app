-- Feedback from creators and sellers (owner, 30 Oct 2026; real storage 31 Oct 2026): what it's about, their words, an optional
-- screenshot (a small image, kept as a data URL), how to reply, and the page and device it came from.
create table if not exists feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  kind text not null,
  message text not null check (char_length(message) between 1 and 500),
  mood integer check (mood between 1 and 5),
  reply_by text not null check (reply_by in ('WhatsApp', 'Email', 'No need')),
  page text,
  device text,
  screenshot text check (char_length(screenshot) <= 700000),
  status text not null default 'new' check (status in ('new', 'handled')),
  created_at timestamptz not null default now()
);
create index if not exists feedback_new on feedback (status, created_at desc);
alter table feedback enable row level security;
