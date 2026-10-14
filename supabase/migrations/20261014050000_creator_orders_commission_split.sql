-- Commission split per order line. TikTok's estimated/actual commission is what the creator keeps; when the creator works with
-- a partner (an agency), part or all of the commission goes to the partner, and TikTok reports the full commission in its
-- standard / shop-ads / bonus fields and the partner's part in shared_with_partner.
alter table public.creator_orders
  add column if not exists commission_earned_estimated numeric(12, 2),  -- the full commission before any partner share
  add column if not exists commission_earned_actual numeric(12, 2),     -- the same once settled
  add column if not exists partner_share numeric(12, 2);                -- the partner's part (estimated until settled)
