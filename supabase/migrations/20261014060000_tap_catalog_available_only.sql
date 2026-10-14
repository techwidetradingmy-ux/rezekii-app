-- TAP Marketplace shows only products creators can actually take: available in the campaign and in stock (owner, 14 Oct 2026).
-- Same as before except the two conditions in `rows`, and products that drop out on a same-day rebuild also leave.
create or replace function public.rebuild_tap_catalog()
returns integer
language plpgsql
security definer
set search_path = ''
as $function$
declare
  d date;
  n int;
begin
  select max(as_of) into d from public.market_snapshots where dataset = 'tap_products';
  if d is null then return 0; end if;

  with rows as (
    select p, coalesce((p->>'partner_commission_rate')::int, 0) as pr
      from public.market_snapshots s, jsonb_array_elements(s.items) p
     where s.dataset = 'tap_products' and s.as_of = d and p->>'campaign_status' = 'ONGOING'
       -- TikTok marks products creators can't add (is_available false); out-of-stock products can't sell
       and coalesce((p->>'is_available')::boolean, true)
       and coalesce((p->>'inventory')::bigint, 0) > 0
  ), counts as (
    select p->>'id' as id, count(distinct p->>'campaign_id')::int as c from rows group by 1
  ), best as (
    select distinct on (p->>'id') p from rows order by p->>'id', pr desc
  )
  insert into public.tap_catalog as t (product_id, name, shop, category, image, price_lo, price_hi, open_rate, silver_rate, total_rate,
                                       sold, sold_today, samples, stock, campaign_count, campaign_id, campaign_name, campaign_end, variants, as_of, updated_at)
  select b.p->>'id',
         left(regexp_replace(b.p->>'name', '\s+', ' ', 'g'), 160),
         b.p->>'shop_name',
         coalesce(b.p->'category'->>'name', 'Other'),
         regexp_replace(b.p->>'main_image_url', '~tplv-([a-z0-9]+)-origin-jpeg\.jpeg', '~tplv-\1-resize-webp:300:300.webp'),
         (b.p->'lowest_price'->>'amount')::numeric,
         coalesce((b.p->'highest_price'->>'amount')::numeric, (b.p->'lowest_price'->>'amount')::numeric),
         (b.p->>'open_collaboration_commission_rate')::int,
         least(coalesce((b.p->>'open_collaboration_commission_rate')::int, 0) + 100,
               coalesce((b.p->>'total_commission_rate')::int, coalesce((b.p->>'open_collaboration_commission_rate')::int, 0) + 100)),
         (b.p->>'total_commission_rate')::int,
         coalesce((b.p->>'product_sales')::bigint, 0),
         0,
         coalesce((b.p->>'sample_quota')::int, 0),
         (b.p->>'inventory')::bigint,
         c.c,
         b.p->>'campaign_id',
         b.p->>'campaign_name',
         (b.p->>'campaign_end_time')::bigint,
         coalesce((select jsonb_agg(jsonb_build_array(
                    coalesce(nullif((select string_agg(pp->>'value_name', ' / ') from jsonb_array_elements(sk->'properties') pp), ''), sk->>'sku_name', 'Default'),
                    (sk->'base_price'->>'sale_price')::numeric,
                    coalesce((sk->'inventory'->>'available_quantity')::int, 0)))
                    from (select sk from jsonb_array_elements(coalesce(b.p->'sku_information_list', '[]')) sk limit 6) x), '[]'),
         d,
         now()
    from best b join counts c on c.id = b.p->>'id'
  on conflict (product_id) do update set
    name = excluded.name, shop = excluded.shop, category = excluded.category, image = excluded.image,
    price_lo = excluded.price_lo, price_hi = excluded.price_hi, open_rate = excluded.open_rate, silver_rate = excluded.silver_rate,
    total_rate = excluded.total_rate,
    sold_today = case when t.as_of < excluded.as_of then greatest(excluded.sold - t.sold, 0) else t.sold_today end,
    sold = excluded.sold, samples = excluded.samples, stock = excluded.stock, campaign_count = excluded.campaign_count,
    campaign_id = excluded.campaign_id, campaign_name = excluded.campaign_name, campaign_end = excluded.campaign_end,
    variants = excluded.variants, as_of = excluded.as_of, updated_at = now();

  -- products no longer in an ongoing campaign, unavailable or out of stock leave the marketplace (rows this run didn't touch)
  delete from public.tap_catalog where as_of < d or updated_at < now();
  select count(*) into n from public.tap_catalog;
  return n;
end;
$function$;
