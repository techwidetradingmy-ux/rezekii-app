import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { supabaseRest } from "@/integrations/supabase/rest.ts";
import { listRankings } from "@/modules/rankings/query.ts";
import { rankings } from "@/modules/rankings/store.ts";
import { CAT } from "@/modules/rankings/build.ts";
import { creatorSearchTasks, mytDay } from "@/modules/refresh/plan.ts";
import { addTasks } from "@/modules/refresh/store.ts";

export const dynamic = "force-dynamic";

/** Tasks of a kind still waiting or running (any day), and when the newest one last moved. */
async function openOf(kind: "rankings" | "marketplace"): Promise<{ open: number; done: number; since: string | null }> {
  const rows = (await (await supabaseRest(`refresh_tasks?kind=eq.${kind}&run_date=gte.${mytDay(Date.now() - 3 * 86_400_000)}&select=status,updated_at&limit=500`)).json()) as { status: string; updated_at: string }[];
  const open = rows.filter((r) => r.status === "pending" || r.status === "running");
  return { open: open.length, done: rows.filter((r) => r.status === "done").length, since: open.map((r) => r.updated_at).sort()[0] ?? null };
}

async function status() {
  const [built, newest, search, building, searching] = await Promise.all([
    supabaseRest("market_snapshots?dataset=eq.rankings&slot=eq.built&select=as_of,fetched_at&order=as_of.desc&limit=1").then((r) => r.json() as Promise<{ as_of: string; fetched_at: string }[]>),
    supabaseRest("market_snapshots?dataset=eq.creators&select=as_of&order=as_of.desc&limit=1").then((r) => r.json() as Promise<{ as_of: string }[]>),
    supabaseRest("market_creators?market=not.is.null&select=creator_key", { headers: { prefer: "count=exact", range: "0-0" } }).then((r) => Number((r.headers.get("content-range") ?? "*/0").split("/")[1]) || 0),
    openOf("rankings"),
    openOf("marketplace"),
  ]);
  return {
    built: built[0] ? { day: built[0].as_of, at: built[0].fetched_at } : null,
    newestLists: newest[0]?.as_of ?? null,
    building: building.open > 0,
    search: { creators: search, running: searching.open > 0, left: searching.open },
  };
}

/**
 * Rankings for admins (owner, 31 Oct 2026): the last batch built from TikTok's best-seller lists, kept as it is until an admin
 * presses Refresh (no daily rebuild). ?view=0-3 (creators, products, videos, LIVEs)&slot=0-2 (1, 7, 30 days)&cat=&pg=.
 */
export async function GET(req: NextRequest) {
  const user = await currentUser();
  if (user?.role !== "admin") return NextResponse.json({ error: "Admins only." }, { status: 403 });
  const p = req.nextUrl.searchParams;
  const view = Number(p.get("view")) || 0;
  const [b, s] = await Promise.all([rankings(...(view === 1 ? (["pm"] as const) : [])), status()]);
  const list = b
    ? listRankings(b, { view, slot: p.has("slot") ? Number(p.get("slot")) : 0, cat: p.get("cat") || undefined, pg: Number(p.get("pg")) || 1 })
    : null;
  return NextResponse.json({ ...s, list, categories: Object.entries(CAT) }, { headers: { "cache-control": "private, no-store" } });
}

/** {what: "rankings"} builds a new batch from the newest saved lists; {what: "search"} runs the creator search again. */
export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (user?.role !== "admin") return NextResponse.json({ error: "Admins only." }, { status: 403 });
  const { what } = (await req.json().catch(() => ({}))) as { what?: string };
  const s = await status();
  const today = mytDay(Date.now());
  const run = `|m${Date.now()}`;
  if (what === "rankings") {
    if (s.building) return NextResponse.json({ error: "A new batch is already being built." }, { status: 409 });
    if (!s.newestLists) return NextResponse.json({ error: "No best-seller lists are saved yet." }, { status: 409 });
    await addTasks(today, [{ key: `rankings|${s.newestLists}${run}`, kind: "rankings", params: { day: s.newestLists, manual: true }, priority: 1 }]);
  } else if (what === "search") {
    if (s.search.running) return NextResponse.json({ error: "The creator search is already running." }, { status: 409 });
    await addTasks(today, creatorSearchTasks(run));
  } else return NextResponse.json({ error: "Say what to refresh." }, { status: 400 });
  return NextResponse.json(await status());
}
