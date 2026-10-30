-- AI Video waitlist (owner, 31 Oct 2026: real storage): what each creator would make, and her place in the queue by when she
-- joined. Changing her answers keeps her place.
create table if not exists ai_video_waitlist (
  user_id uuid primary key,
  types text[] not null,
  videos integer not null check (videos between 1 and 300),
  platforms text[] not null,
  note text check (char_length(note) <= 200),
  joined_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table ai_video_waitlist enable row level security;
