-- Whether TikTok's Creator Marketplace shows a linked creator as agency managed or independent (TikTok gives no agency name),
-- checked every 2 weeks (owner, 14 Oct 2026). agency is null when TikTok's marketplace doesn't list the creator.
alter table public.affiliate_connections add column agency text check (agency in ('managed', 'independent'));
alter table public.affiliate_connections add column agency_at timestamptz;
