-- What was typed in New post, kept with each post so Reuse can fill New post in again (M7).
-- post_key: the social post group's id, or the TikTok post's id when it went out on its own.
create table public.post_recipes (
  post_key text primary key,
  user_id uuid not null references public.app_users (id) on delete cascade,
  recipe jsonb not null,
  created_at timestamptz not null default now()
);
create index post_recipes_by_user on public.post_recipes (user_id, created_at desc);

alter table public.post_recipes enable row level security;
revoke all on public.post_recipes from anon, authenticated;
