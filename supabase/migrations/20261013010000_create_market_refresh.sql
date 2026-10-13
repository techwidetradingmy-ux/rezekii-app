-- Daily refresh of TikTok Shop market data: TAP campaign products, TikTok's best-seller lists and the Creator Marketplace.
-- The every-minute timer works through `refresh_tasks` a little at a time, within TikTok's rate limits.

-- One list as TikTok returned it. `slot` names the list inside the dataset, e.g. '30D|ALL|LOCAL' or a campaign id.
-- `as_of` is TikTok's data date for best-seller lists and the refresh day for everything else.
create table public.market_snapshots (
  dataset text not null,
  slot text not null,
  as_of date not null,
  items jsonb not null default '[]',
  item_count int generated always as (jsonb_array_length(items)) stored,
  fetched_at timestamptz not null default now(),
  primary key (dataset, slot, as_of)
);

-- Every creator seen in a best-seller list or the Creator Marketplace. `best` and `market` keep the latest row
-- from each source; `detail` is the full Creator Marketplace profile, fetched once for each new creator.
create table public.market_creators (
  creator_key text primary key,
  open_id text,
  username text,
  best_rank int,
  best jsonb,
  market jsonb,
  detail jsonb,
  detail_at timestamptz,
  detail_error text,
  seen_at timestamptz not null default now()
);
create index market_creators_need_detail on public.market_creators (best_rank nulls last) where detail_at is null and open_id is not null;

-- The day's work. Tasks are planned once a day (06:00 Malaysia time); multi-page tasks keep their page token in `cursor`.
create table public.refresh_tasks (
  run_date date not null,
  key text not null,
  kind text not null,
  params jsonb not null default '{}',
  priority int not null default 5,
  status text not null default 'pending' check (status in ('pending', 'running', 'done', 'failed')),
  attempts int not null default 0,
  cursor text,
  result_count int not null default 0,
  last_error text,
  next_attempt_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (run_date, key)
);
create index refresh_tasks_due on public.refresh_tasks (status, kind, priority, next_attempt_at);

-- RLS on with no policies: only the server's secret key can read or write. TAP rows hold seller and partner rates.
alter table public.market_snapshots enable row level security;
alter table public.market_creators enable row level security;
alter table public.refresh_tasks enable row level security;
revoke all on public.market_snapshots, public.market_creators, public.refresh_tasks from anon, authenticated;

-- Hands the timer the next due task of the given kinds and marks it running, so two runs never take the same one.
-- A task left running for 10 minutes (the run died) is handed out again.
create or replace function public.claim_refresh_task(kinds text[])
returns setof public.refresh_tasks
language sql
security definer
set search_path = ''
as $$
  update public.refresh_tasks t
     set status = 'running', attempts = t.attempts + 1, updated_at = now()
   where (t.run_date, t.key) in (
     select run_date, key from public.refresh_tasks
      where kind = any(kinds)
        and ((status = 'pending' and next_attempt_at <= now()) or (status = 'running' and updated_at < now() - interval '10 minutes'))
      order by priority, run_date, next_attempt_at
      limit 1
      for update skip locked
   )
  returning t.*;
$$;
revoke all on function public.claim_refresh_task(text[]) from public, anon, authenticated;
grant execute on function public.claim_refresh_task(text[]) to service_role;

-- Data dates whose daily (1D) creator and product lists are all saved, so the planner only fills in missing days.
create or replace function public.complete_daily_days(expected int)
returns setof date
language sql
stable
security definer
set search_path = ''
as $$
  select as_of from public.market_snapshots
   where dataset in ('creators', 'products') and slot like '1D|%' and as_of >= current_date - 40
   group by as_of
  having count(*) >= expected;
$$;
revoke all on function public.complete_daily_days(int) from public, anon, authenticated;
grant execute on function public.complete_daily_days(int) to service_role;

-- Runs when a new day is planned (`today` = that day in Malaysia). Leftovers from earlier days are closed, since
-- every day's plan fetches everything again. Keeps the database small: daily lists for 40 days, 7- and 30-day
-- lists and TAP products for 7 days, tasks for 14 days.
create or replace function public.prune_market_data(today date)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.refresh_tasks set status = 'failed', last_error = 'Not finished before the next day''s plan', updated_at = now()
   where run_date < today and status in ('pending', 'running');
  delete from public.market_snapshots where as_of < today - 40;
  delete from public.market_snapshots where as_of < today - 7 and (slot not like '1D|%' or dataset like 'tap_%');
  delete from public.refresh_tasks where run_date < today - 14;
$$;
revoke all on function public.prune_market_data(date) from public, anon, authenticated;
grant execute on function public.prune_market_data(date) to service_role;

-- The per-environment schedule is set separately (same Vault token as the posting timer):
--   select cron.schedule('rezekii-refresh', '* * * * *', $$ select net.http_post(
--     url := '<site>/api/cron/refresh',
--     headers := jsonb_build_object('content-type', 'application/json', 'authorization',
--       'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'posts_timer_token')),
--     body := '{}'::jsonb, timeout_milliseconds := 60000) $$);
