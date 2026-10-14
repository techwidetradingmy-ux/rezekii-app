-- The rankings build was getting at most 1,000 rows from each helper call (the API's row limit), so TikTok's best-seller lists,
-- the 7- and 30-day sums and the Creator Marketplace list were cut short. These return each result as one JSON array instead.
create or replace function public.rank_items_json(p_dataset text, p_as_of date, p_like text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object('slot', r.slot, 'item', r.item)), '[]'::jsonb) from public.rank_items(p_dataset, p_as_of, p_like) r;
$$;

create or replace function public.rank_daily_sums_json(p_dataset text, p_from date, p_to date)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb) from public.rank_daily_sums(p_dataset, p_from, p_to) r;
$$;

create or replace function public.rank_find_json()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(r.m), '[]'::jsonb) from public.rank_find() r;
$$;

revoke all on function public.rank_items_json(text, date, text), public.rank_daily_sums_json(text, date, date), public.rank_find_json() from public, anon, authenticated;
grant execute on function public.rank_items_json(text, date, text), public.rank_daily_sums_json(text, date, date), public.rank_find_json() to service_role;
