-- WhatsApp Inbox (owner, 23 Nov 2026): customers' WhatsApp messages to Techwide's own numbers, read and answered in Admin ›
-- Support › WhatsApp Inbox. Meta sends each message to /api/whatsapp/webhook; replies go out through the WhatsApp Cloud API.
-- One row per message (`wamid` is Meta's id, so a message Meta sends twice is kept once) and one per chat (our number + the
-- customer's WhatsApp number). `last_in_at` is the customer's latest message: replies are free for 24 hours after it.
-- `seen_at` is when an admin last opened the chat; their messages after it are unread. Read and written by the server only.
create table if not exists public.wa_messages (
  id uuid primary key default gen_random_uuid(),
  wamid text not null unique,
  number_id text not null,
  contact text not null,
  direction text not null check (direction in ('in', 'out')),
  kind text not null,
  body text,
  media_id text,
  media_type text,
  status text,
  error text,
  sent_by text,
  at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists wa_messages_chat on public.wa_messages (number_id, contact, at desc);
alter table public.wa_messages enable row level security;

create table if not exists public.wa_chats (
  number_id text not null,
  contact text not null,
  name text,
  last_at timestamptz not null,
  last_in_at timestamptz,
  last_text text,
  seen_at timestamptz,
  primary key (number_id, contact)
);
create index if not exists wa_chats_last on public.wa_chats (last_at desc);
alter table public.wa_chats enable row level security;
