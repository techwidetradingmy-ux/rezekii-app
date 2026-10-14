-- The monthly level pass now waits until every creator has a profile (owner, 14 Oct 2026: WhatsApp first), so its tasks stay
-- open for 10 days instead of 3.
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
  delete from public.refresh_tasks where run_date < today - 14;
$function$;
