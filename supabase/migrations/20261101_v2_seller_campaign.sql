-- Each connected shop's own Techwide campaign (owner, 31 Oct 2026): made when the shop connects Seller Center, so the seller
-- registers products straight into it in Seller Center.
alter table public.seller_connections add column if not exists campaign_id text;

-- Shops that already have a campaign from earlier requests keep it.
update public.seller_connections sc
set campaign_id = t.campaign_id
from (
  select distinct on (shop_id) shop_id, campaign_id
  from public.tap_submissions
  where campaign_id is not null
  order by shop_id, updated_at desc
) t
where t.shop_id = sc.shop_id and sc.campaign_id is null;
