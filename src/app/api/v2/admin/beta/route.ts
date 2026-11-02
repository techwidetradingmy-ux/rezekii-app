import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { actorName } from "@/modules/admin/admins.ts";
import { betaList, decideBeta, setBetaSettings } from "@/modules/beta/access.ts";

export const dynamic = "force-dynamic";

const ID = /^[0-9a-f-]{36}$/;

/** Beta sign-ups waiting to be let in, the places taken and the WhatsApp group link (admins only; owner, 2 Nov 2026). */
export async function GET() {
  const user = await currentUser();
  if (user?.role !== "admin") return NextResponse.json({ error: "Admins only." }, { status: 403 });
  return NextResponse.json(await betaList(), { headers: { "cache-control": "private, no-store" } });
}

/** { user, side, approve, reason? } lets a sign-up in or declines it, and emails them. */
export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (origin && origin !== req.nextUrl.origin) return NextResponse.json({ error: "Please do this from Rezekii." }, { status: 403 });
  const user = await currentUser();
  if (user?.role !== "admin") return NextResponse.json({ error: "Admins only." }, { status: 403 });
  const b = (await req.json().catch(() => ({}))) as { user?: unknown; side?: unknown; approve?: unknown; reason?: unknown };
  if (typeof b.user !== "string" || !ID.test(b.user) || (b.side !== "creator" && b.side !== "seller") || typeof b.approve !== "boolean")
    return NextResponse.json({ error: "Choose a sign-up." }, { status: 400 });
  const r = await decideBeta(b.user, b.side, b.approve, typeof b.reason === "string" ? b.reason : "", actorName(user.email));
  return r.ok ? NextResponse.json({ ok: true, emailed: r.emailed }) : NextResponse.json({ error: r.error }, { status: 409 });
}

/** { cap, group } sets the number of creator places and the WhatsApp group link. */
export async function PUT(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (origin && origin !== req.nextUrl.origin) return NextResponse.json({ error: "Please do this from Rezekii." }, { status: 403 });
  const user = await currentUser();
  if (user?.role !== "admin") return NextResponse.json({ error: "Admins only." }, { status: 403 });
  const b = (await req.json().catch(() => ({}))) as { cap?: unknown; group?: unknown };
  const cap = Number(b.cap);
  const group = typeof b.group === "string" ? b.group.trim() : "";
  if (!Number.isInteger(cap) || cap < 0 || cap > 100000) return NextResponse.json({ error: "Enter the number of places." }, { status: 400 });
  if (group && !/^https:\/\/(chat\.whatsapp\.com|wa\.me|whatsapp\.com)\//.test(group)) return NextResponse.json({ error: "Paste the WhatsApp group's invite link." }, { status: 400 });
  await setBetaSettings({ cap, group }, user.id, actorName(user.email));
  return NextResponse.json({ ok: true });
}
