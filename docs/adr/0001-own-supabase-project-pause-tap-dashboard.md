# Rezekii gets its own Supabase project; the TAP dashboard project is paused

Rezekii's data lives in a new, dedicated Supabase project rather than inside an existing one. Techwide's Supabase organisation is on the free plan, which allows two active projects, and both slots were taken (`tremayne-threads`, `techwide-tap-dashboard`). The owner chose to pause `techwide-tap-dashboard` to free a slot instead of sharing its database with Rezekii or paying for the Pro plan, because the budget is free-tier only and mixing two products in one database makes both harder to change later.

## Considered options

- **Share `techwide-tap-dashboard`'s database** (Rezekii tables in a separate schema): free and keeps the dashboard running, but couples two products' data, limits, backups and outages together, and shares one 500 MB / 1 GB free allowance.
- **Supabase Pro** (~USD 25/month): keeps everything active, rejected for now on budget.
- **Own project, pause `techwide-tap-dashboard`** — chosen.

## Consequences

- The owner chose to pause **both** `techwide-tap-dashboard` and `tremayne-threads` (2026-10-10), freeing both free slots.
- The Techwide TAP dashboard and anything using the Tremayne Threads project stop working while paused; restoring either later needs a free slot (pause another project or upgrade).
- Rezekii has the full free allowance (500 MB database, 1 GB storage) to itself.
