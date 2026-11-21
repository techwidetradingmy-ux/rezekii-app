-- Owner, 31 Oct 2026: Shopee gives apps no username for an affiliate (only its user_id), so a Shopee account can be renamed in
-- Channels (double-click its name). Kept apart from name (the shop's name from Shopee), so connecting again never wipes it.
alter table public.shopee_connections add column nickname text check (char_length(nickname) <= 60);
