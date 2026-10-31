-- How many creators promote products in Techwide's TAP campaigns (owner, 31 Oct 2026: "1,900+ creators" in a shop's campaign text).
create or replace function public.tap_creator_count() returns integer
language sql stable
set search_path = ''
as $$ select count(distinct username)::int from public.tap_creator_products $$;
revoke execute on function public.tap_creator_count() from public, anon, authenticated;
