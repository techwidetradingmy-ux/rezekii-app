-- A timer run that dies mid-upload (e.g. the 300 s limit) used to leave its post "publishing" forever.
-- Now, before handing out due posts, any post stuck in "publishing" for 10 minutes counts as a failed try:
-- it goes back to "scheduled" (tried again now) or, after the 3rd try, to "failed".
create or replace function public.claim_due_posts(max_posts int)
returns setof public.posts
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.posts
     set status = case when attempts >= 3 then 'failed' else 'scheduled' end,
         next_attempt_at = case when attempts >= 3 then null else now() end,
         last_error = 'The last try stopped before finishing (it took too long).',
         updated_at = now()
   where status = 'publishing' and updated_at < now() - interval '10 minutes';

  return query
  update public.posts p
     set status = 'publishing', attempts = p.attempts + 1, updated_at = now()
   where p.id in (
     select id from public.posts
      where status = 'scheduled' and next_attempt_at <= now()
      order by next_attempt_at
      limit max_posts
      for update skip locked
   )
  returning p.*;
end;
$$;
revoke all on function public.claim_due_posts(int) from public, anon, authenticated;
grant execute on function public.claim_due_posts(int) to service_role;
