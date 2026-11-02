-- Ended TAP campaigns aren't read from TikTok again (owner, 2 Nov 2026): their last products, totals and sales are kept as
-- today's copy, so the admin TAP pages keep showing them and the daily prune doesn't delete them.
create or replace function public.carry_tap_snapshots(p_slots text[], p_to date)
returns integer
language sql
security definer
set search_path to ''
as $$
  with src as (
    select distinct on (dataset, slot) dataset, slot, items, fetched_at
      from public.market_snapshots
     where dataset in ('tap_products', 'tap_product_sums', 'tap_stats') and slot = any(p_slots) and as_of < p_to
     order by dataset, slot, as_of desc
  ), ins as (
    insert into public.market_snapshots (dataset, slot, as_of, items, fetched_at)
    select dataset, slot, p_to, items, fetched_at from src
    on conflict (dataset, slot, as_of) do nothing
    returning 1
  )
  select count(*)::int from ins;
$$;
revoke all on function public.carry_tap_snapshots(text[], date) from public, anon, authenticated;
grant execute on function public.carry_tap_snapshots(text[], date) to service_role;
