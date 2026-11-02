import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { supabaseRest } from "@/integrations/supabase/rest.ts";
import { sellerAccessFor } from "@/modules/marketplace/seller-connection.ts";
import { getLang, tFor } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** A Custom Service request (owner, 31 Oct 2026: saved for the team, who reply on WhatsApp with a plan and a quote). */
export async function POST(req: NextRequest) {
  const t = tFor(await getLang());
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: t("Sign in first.") }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { services?: unknown; budget?: unknown; goal?: unknown; whatsapp?: unknown };
  const services = (Array.isArray(b.services) ? b.services : []).map((s) => text(s, 80)).filter(Boolean).slice(0, 12);
  const whatsapp = text(b.whatsapp, 24);
  if (!services.length) return NextResponse.json({ error: t("Pick at least one service.") }, { status: 400 });
  if (!/^\+\d[\d\s-]{7,20}$/.test(whatsapp)) return NextResponse.json({ error: t("Add your WhatsApp number.") }, { status: 400 });
  const shop = await sellerAccessFor(user).then((a) => a?.shop.name ?? null).catch(() => null);
  const res = await supabaseRest("custom_requests", {
    method: "POST",
    headers: { "content-type": "application/json", prefer: "return=minimal" },
    body: JSON.stringify({ user_id: user.id, shop, services, budget: text(b.budget, 40) || null, goal: text(b.goal, 1000) || null, whatsapp }),
  });
  if (!res.ok) return NextResponse.json({ error: t("Didn't send. Please try again.") }, { status: 500 });
  return NextResponse.json({ ok: true });
}
