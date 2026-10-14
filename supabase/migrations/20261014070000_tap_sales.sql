-- A creator's sales through Techwide's TAP campaigns between two times, from their own affiliate orders (owner, 14 Oct 2026:
-- levels come from last month's TAP sales). Counted as the Sales page counts GMV: refunded orders 0, refunded and returned
-- units left out. Techwide's campaigns = every campaign in the latest TAP campaign list (all statuses).
create or replace function public.tap_sales(p_user uuid, p_from timestamptz, p_to timestamptz)
returns numeric
language sql
stable
security definer
set search_path = ''
as $function$
  with tw as (
    select distinct c->>'id' as id
      from public.market_snapshots s, jsonb_array_elements(s.items) c
     where s.dataset = 'tap_campaigns' and s.as_of = (select max(as_of) from public.market_snapshots where dataset = 'tap_campaigns')
  )
  select coalesce(sum(case when o.status ilike '%refund%' then 0
                           else o.price * greatest(0, o.quantity - coalesce(o.refunded_quantity, 0) - coalesce(o.returned_quantity, 0)) end), 0)
    from public.creator_orders o
   where o.user_id = p_user and o.created_at >= p_from and o.created_at < p_to
     and o.campaign_id in (select id from tw);
$function$;

revoke all on function public.tap_sales(uuid, timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.tap_sales(uuid, timestamptz, timestamptz) to service_role;
