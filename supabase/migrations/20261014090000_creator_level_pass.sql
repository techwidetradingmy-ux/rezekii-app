-- TikTok's creator level (0-8), from the month's level-split marketplace search planned on the 1st (owner, 14 Oct 2026).
alter table public.market_creators add column tt_level smallint;

-- That search takes more than a day: its tasks stay open for 3 days instead of closing at the next day's plan.
create or replace function public.prune_market_data(today date)
returns void
language sql
security definer
set search_path to ''
as $function$
  update public.refresh_tasks set status = 'failed', last_error = 'Not finished before the next day''s plan', updated_at = now()
   where run_date < today and status in ('pending', 'running')
     and not (key like 'marketplace|lv%' and run_date >= today - 3);
  delete from public.market_snapshots where as_of < today - 40;
  delete from public.market_snapshots where as_of < today - 7 and (slot not like '1D|%' or dataset like 'tap_%');
  delete from public.refresh_tasks where run_date < today - 14;
$function$;
