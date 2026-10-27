-- TikTok connections TikTok stopped accepting (Rezekii removed in TikTok's settings, or a new app key) show "Reconnect"
-- until they are connected again, as Facebook, Instagram and Threads channels do (owner, 27 Oct 2026).
alter table public.tiktok_connections add column status text not null default 'active' check (status in ('active', 'reconnect'));

-- TikTok's union_id stays the same for an account across Rezekii's TikTok apps; open_id changed when rezekii.com moved from
-- the Sandbox key to the Production key (26 Oct 2026). Kept so a reconnected account is recognised as the same one.
alter table public.tiktok_connections add column union_id text;
create index tiktok_connections_union_id on public.tiktok_connections (union_id) where union_id is not null;
