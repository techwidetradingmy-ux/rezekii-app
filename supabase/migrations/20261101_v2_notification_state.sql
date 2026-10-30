-- What each person has read in Notifications (owner, 31 Oct 2026). Notifications themselves are built from real events
-- (credits, invites, posts, connections, sample requests); only the read state is stored. One row per person and side.
create table if not exists notification_state (
  user_id uuid not null,
  side text not null check (side in ('creator', 'seller')),
  seen_at timestamptz not null default 'epoch',
  read_ids text[] not null default '{}',
  updated_at timestamptz not null default now(),
  primary key (user_id, side)
);
alter table notification_state enable row level security;
