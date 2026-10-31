import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { supabaseRest } from "@/integrations/supabase/rest.ts";
import { actorName, logActivity } from "@/modules/admin/admins.ts";

export const dynamic = "force-dynamic";
const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** Announcements (owner, 31 Oct 2026): the last 20, newest first (admins only). */
export async function GET() {
  const user = await currentUser();
  if (user?.role !== "admin") return NextResponse.json({ error: "Admins only." }, { status: 403 });
  const list = await (await supabaseRest("announcements?select=*&order=created_at.desc&limit=20")).json();
  return NextResponse.json({ list }, { headers: { "cache-control": "private, no-store" } });
}

/** Post one: { title, body, level: info|important, audience: all|creator|seller }. It shows in everyone's notifications under System. */
export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (origin && origin !== req.nextUrl.origin) return NextResponse.json({ error: "Please do this from rezekii.com." }, { status: 403 });
  const user = await currentUser();
  if (user?.role !== "admin") return NextResponse.json({ error: "Admins only." }, { status: 403 });
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const title = text(b.title, 80), body = text(b.body, 300);
  if (title.length < 3 || body.length < 3) return NextResponse.json({ error: "Write a title and a message." }, { status: 400 });
  const level = b.level === "important" ? "important" : "info";
  const audience = b.audience === "creator" || b.audience === "seller" ? b.audience : "all";
  await supabaseRest("announcements", { method: "POST", headers: { prefer: "return=minimal" }, body: JSON.stringify({ title, body, level, audience, created_by: actorName(user.email) }) });
  await logActivity(actorName(user.email), "Admins", `posted an announcement: ${title}`);
  return NextResponse.json({ ok: true });
}

/** End one now: { id }. */
export async function PATCH(req: NextRequest) {
  const user = await currentUser();
  if (user?.role !== "admin") return NextResponse.json({ error: "Admins only." }, { status: 403 });
  const { id } = (await req.json().catch(() => ({}))) as { id?: string };
  if (!id || !/^[0-9a-f-]{36}$/.test(id)) return NextResponse.json({ error: "Which announcement?" }, { status: 400 });
  await supabaseRest(`announcements?id=eq.${id}`, { method: "PATCH", headers: { prefer: "return=minimal" }, body: JSON.stringify({ ends_at: new Date().toISOString() }) });
  await logActivity(actorName(user.email), "Admins", "ended an announcement");
  return NextResponse.json({ ok: true });
}
