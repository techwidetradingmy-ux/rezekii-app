-- The two Supabase timers call Rezekii only when there is work (owner, 23 Oct 2026: they were most of Rezekii's Vercel use).
-- Every quarter hour they call anyway, for the upkeep that runs on that rhythm: sign-in renewals, profile pictures and
-- posted-post checks (posts timer); the day's plan, TikTok's late lists and the warm-up (refresh timer).

-- Posting work waiting now: due posts, posts TikTok or Meta is processing, a stuck try to retry, or a first comment to add.
create or replace function public.posting_work_due() returns boolean
language sql stable security definer set search_path to '' as $$
  select exists (
           select 1 from public.posts
            where (status = 'scheduled' and next_attempt_at <= now()) or status = 'processing'
               or (status = 'publishing' and updated_at < now() - interval '10 minutes'))
      or exists (
           select 1 from public.social_posts
            where (status = 'scheduled' and next_attempt_at <= now()) or status = 'processing'
               or (status = 'publishing' and updated_at < now() - interval '10 minutes')
               or (status = 'posted' and comment_status = 'pending'));
$$;

-- Refresh work waiting now: a task due, or one whose run stopped (the same rule as claim_refresh_task).
create or replace function public.refresh_work_due() returns boolean
language sql stable security definer set search_path to '' as $$
  select exists (
    select 1 from public.refresh_tasks
     where (status = 'pending' and next_attempt_at <= now()) or (status = 'running' and updated_at < now() - interval '10 minutes'));
$$;

revoke all on function public.posting_work_due() from public, anon, authenticated;
revoke all on function public.refresh_work_due() from public, anon, authenticated;

-- The timers then call only when these say so, or on the quarter hour (run once per project, <site> = its address):
--   select cron.alter_job((select jobid from cron.job where jobname = 'rezekii-posts'), command := $c$
--     select net.http_post(url := '<site>/api/cron/posts', headers := jsonb_build_object('content-type', 'application/json',
--       'authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'posts_timer_token')),
--       body := '{}'::jsonb, timeout_milliseconds := 290000)
--     where public.posting_work_due() or extract(minute from now())::int % 15 = 0 $c$);
--   select cron.alter_job((select jobid from cron.job where jobname = 'rezekii-refresh'), command := $c$
--     select net.http_post(url := '<site>/api/cron/refresh', headers := jsonb_build_object('content-type', 'application/json',
--       'authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'posts_timer_token')),
--       body := '{}'::jsonb, timeout_milliseconds := 60000)
--     where public.refresh_work_due() or extract(minute from now())::int % 15 = 0 $c$);
-- The practice copy's posts timer stays off except while testing: select cron.alter_job(<jobid>, active := false);
