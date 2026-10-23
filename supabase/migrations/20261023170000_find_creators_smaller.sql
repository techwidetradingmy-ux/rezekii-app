-- Find creators, smaller (owner, 23 Oct 2026): the Rankings build stopped at rank_find_json from 17 Oct. Its 25 MB answer took
-- 9.8 s, over the API's 8 s limit, and 40,686 of its 47,610 photo addresses had already expired.

-- 1. A photo only while TikTok's link still works (x-expires in the future).
create or replace function public.rank_find()
returns table(m jsonb)
language sql
stable security definer
set search_path to ''
as $function$
  select jsonb_strip_nulls(jsonb_build_object(
           'username', c.market->>'username', 'nickname', c.market->>'nickname', 'follower_count', c.market->'follower_count',
           'gmv', c.market->'gmv', 'video_gmv', c.market->'video_gmv', 'live_gmv', c.market->'live_gmv', 'gmv_range', c.market->'gmv_range',
           'avg_ec_video_view_count', c.market->'avg_ec_video_view_count',
           'avatar', case when coalesce(substring(c.market->'avatar'->>'url' from 'x-expires=(\d+)')::bigint, 9e15) > extract(epoch from now())
                          then c.market->'avatar' end))
    from public.market_creators c
   where c.market is not null and c.market ? 'username';
$function$;

-- 2. Saved Creator Marketplace entries: only what Find creators shows (the same rule as trimMarket in modules/refresh/store.ts).
--    Rows already trimmed are left alone: live was trimmed in batches first, with a vacuum after each.
with t as (
  select m.creator_key,
         coalesce(
           (select jsonb_object_agg(e.key, e.value) from jsonb_each(m.market) e
             where e.key in ('username', 'nickname', 'follower_count', 'gmv', 'video_gmv', 'live_gmv', 'gmv_range', 'avg_ec_video_view_count')),
           '{}'::jsonb)
         || case when jsonb_typeof(m.market->'avatar'->'url') = 'string' and m.market->'avatar'->>'url' <> '' then jsonb_build_object('avatar', jsonb_build_object('url', m.market->'avatar'->'url')) else '{}'::jsonb end as d
    from public.market_creators m
   where jsonb_typeof(m.market) = 'object')
update public.market_creators m set market = t.d from t where m.creator_key = t.creator_key and m.market is distinct from t.d;
