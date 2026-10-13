-- Rankings: helpers that read TikTok's best-seller lists (market_snapshots) inside the database, so only small rows leave it.

-- One day's lists matching a slot pattern, each item without its heavy photo object (a product keeps one photo URL as "img").
create or replace function public.rank_items(p_dataset text, p_as_of date, p_like text)
returns table(slot text, item jsonb)
language sql
stable
security definer
set search_path = ''
as $$
  select s.slot,
         (e - 'product_image') || case when e ? 'product_image' then jsonb_build_object('img', e->'product_image'->'urls'->>0) else '{}'::jsonb end
    from public.market_snapshots s, jsonb_array_elements(s.items) e
   where s.dataset = p_dataset and s.as_of = p_as_of and s.slot like p_like;
$$;

-- TikTok's daily (1D) lists between two days, added up per creator or product: amounts in RM (TikTok's RM figure when the
-- RM list has the entry, otherwise its US$ figure times the median RM/US$ rate of that day's list pair), plus how many days.
-- A creator in several creator-type lists on one day counts once, with the highest figure. `grp` = category or creator type.
-- `meta` = the newest name, shop, rating and photo (products) or username, nickname, followers and likes (creators).
create or replace function public.rank_daily_sums(p_dataset text, p_from date, p_to date)
returns table(id text, grp text, lo numeric, hi numeric, conv boolean, days int, meta jsonb)
language sql
stable
security definer
set search_path = ''
as $$
  with lists as (
    select s.as_of, split_part(s.slot, '|', 2) as grp, split_part(s.slot, '|', 3) as cur, s.items
      from public.market_snapshots s
     where s.dataset = p_dataset and s.as_of between p_from and p_to and s.slot like '1D|%'
  ), items as (
    select l.as_of, l.grp, l.cur, coalesce(e->>'id', e->>'open_id') as id,
           (regexp_match(e->>'gmv_range', '([0-9.]+)[^0-9.]+([0-9.]+)'))::numeric[] as r,
           case when l.cur = 'USD' then jsonb_strip_nulls(jsonb_build_object(
             'name', e->>'name', 'shop', e->>'shop_name', 'rating', e->>'rating', 'img', e->'product_image'->'urls'->>0,
             'user', e->>'user_name', 'nick', e->>'nick_name', 'fol', e->'followers_count', 'likes', e->'likes_count')) end as meta
      from lists l, jsonb_array_elements(l.items) e
  ), paired as (
    -- the US$ and RM entries of each list pair side by side, in one pass
    select as_of, grp, id,
           max(r[1]) filter (where cur = 'USD') as ulo, max(r[2]) filter (where cur = 'USD') as uhi,
           max(r[1]) filter (where cur = 'LOCAL') as llo, max(r[2]) filter (where cur = 'LOCAL') as lhi,
           (array_agg(meta) filter (where meta is not null))[1] as meta
      from items where r is not null group by as_of, grp, id
    having count(*) filter (where cur = 'USD') > 0
  ), rates as (
    select as_of, grp, percentile_cont(0.5) within group (order by llo / ulo) as rate
      from paired where llo is not null and ulo > 0 group by as_of, grp
  ), rm as (
    select p.as_of, p.grp, p.id, p.meta,
           coalesce(p.llo, p.ulo * coalesce(r.rate, 4.08)) as lo, coalesce(p.lhi, p.uhi * coalesce(r.rate, 4.08)) as hi, p.llo is null as conv
      from paired p left join rates r on r.as_of = p.as_of and r.grp = p.grp
  ), one_per_day as (
    select distinct on (as_of, id) as_of, grp, id, lo, hi, conv, meta from rm order by as_of, id, hi desc
  )
  select id, min(grp), round(sum(lo)), round(sum(hi)), bool_or(conv), count(*)::int, (array_agg(meta order by as_of desc))[1]
    from one_per_day group by id;
$$;

-- Creator Marketplace entries (from the nightly marketplace pass), only the fields Find creators shows.
create or replace function public.rank_find()
returns table(m jsonb)
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_strip_nulls(jsonb_build_object(
           'username', c.market->>'username', 'nickname', c.market->>'nickname', 'follower_count', c.market->'follower_count',
           'gmv', c.market->'gmv', 'video_gmv', c.market->'video_gmv', 'live_gmv', c.market->'live_gmv', 'gmv_range', c.market->'gmv_range',
           'avg_ec_video_view_count', c.market->'avg_ec_video_view_count', 'avatar', c.market->'avatar'))
    from public.market_creators c
   where c.market is not null and c.market ? 'username';
$$;

revoke all on function public.rank_items(text, date, text), public.rank_daily_sums(text, date, date), public.rank_find() from public, anon, authenticated;
grant execute on function public.rank_items(text, date, text), public.rank_daily_sums(text, date, date), public.rank_find() to service_role;
