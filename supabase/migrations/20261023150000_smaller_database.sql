-- A smaller database (owner, 23 Oct 2026: it was at 437 of the free plan's 500 MB).

-- 1. TAP lists: only the newest is read (admin TAP pages), so today's and yesterday's are kept, not 8 days, and the
--    newest always stays, even when a refresh has failed for days.
create or replace function public.prune_market_data(today date)
returns void
language sql
security definer
set search_path to ''
as $function$
  update public.refresh_tasks set status = 'failed', last_error = 'Not finished before the next day''s plan', updated_at = now()
   where run_date < today and status in ('pending', 'running')
     and not (key like 'marketplace|lv%' and run_date >= today - 10);
  delete from public.market_snapshots where as_of < today - 40;
  delete from public.market_snapshots where as_of < today - 7 and (slot not like '1D|%' or dataset like 'tap_%');
  delete from public.market_snapshots s where s.dataset like 'tap_%' and s.as_of < today - 1
     and s.as_of < (select max(n.as_of) from public.market_snapshots n where n.dataset = s.dataset);
  delete from public.refresh_tasks where run_date < today - 14;
$function$;
delete from public.market_snapshots s where s.dataset like 'tap_%' and s.as_of < current_date - 1
   and s.as_of < (select max(n.as_of) from public.market_snapshots n where n.dataset = s.dataset);

-- 2. Creator profiles: only what Rankings shows (the same rule as trimDetail in modules/refresh/store.ts).
update public.market_creators m
   set detail = coalesce(
         (select jsonb_object_agg(e.key, e.value) from jsonb_each(m.detail) e
           where e.key in ('nickname', 'bio_description', 'gmv', 'gmv_range', 'video_gmv', 'live_gmv', 'units_sold', 'avg_commission_rate', 'ec_video_count',
                           'ec_live_count', 'category_ids', 'category_gmv_distribution', 'content_gmv_distribution', 'follower_age', 'follower_gender',
                           'brand_collaboration_count', 'promoted_product_num', 'error')),
         '{}'::jsonb)
       || case when jsonb_typeof(m.detail->'avatar'->'url') = 'string' and m.detail->'avatar'->>'url' <> '' then jsonb_build_object('avatar', jsonb_build_object('url', m.detail->'avatar'->'url')) else '{}'::jsonb end
       || case when jsonb_typeof(m.detail->'follower_location') = 'array'
               then jsonb_build_object('follower_location', (select coalesce(jsonb_agg(x.v order by x.i), '[]'::jsonb)
                                                             from jsonb_array_elements(m.detail->'follower_location') with ordinality x(v, i) where x.i <= 6))
               else '{}'::jsonb end
 where jsonb_typeof(m.detail) = 'object';

-- 3. Timer history: 3 days are kept, cleared every night at 3:30 am Malaysia time.
delete from cron.job_run_details where end_time < now() - interval '3 days';
select cron.schedule('rezekii-cron-history', '30 19 * * *', $c$ delete from cron.job_run_details where end_time < now() - interval '3 days' $c$);

-- 4. Once, at 3 am Malaysia time: the two big tables are rewritten so the freed space goes back (a few seconds' lock each,
--    while nobody is using Rezekii); half an hour later both one-off jobs remove themselves.
select cron.schedule('rezekii-compact-once', '0 19 * * *', $c$ vacuum full public.market_snapshots, public.market_creators $c$);
select cron.schedule('rezekii-compact-done', '30 19 * * *', $c$ select cron.unschedule('rezekii-compact-once'); select cron.unschedule('rezekii-compact-done') $c$);
