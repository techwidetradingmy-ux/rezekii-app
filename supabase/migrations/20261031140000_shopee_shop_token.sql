-- Owner, 31 Oct 2026: a seller's sign-in renews into two separate chains (Livestream/Video guide 669: a refresh token is "valid
-- for each shop_id and user_id respectively"). The user_id chain (access_token_enc, refresh_token_enc) is for Video calls; this
-- shop_id chain is for the shop's own calls (its product list). Empty for affiliates, and filled again when it runs out.
alter table public.shopee_connections
  add column shop_access_token_enc text,
  add column shop_access_expires_at timestamptz,
  add column shop_refresh_token_enc text,
  add column shop_refresh_expires_at timestamptz;
