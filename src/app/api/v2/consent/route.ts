import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { supabaseRest } from "@/integrations/supabase/rest.ts";

export const dynamic = "force-dynamic";

/** The versions shown in the consent sheet before linking TikTok Shop. */
const TERMS = "1.0";
const PRIVACY = "1.0";

/** Records her consent before linking TikTok Shop ({ role, action: "agreed" }) or its withdrawal when she unlinks. */
export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { role?: unknown; action?: unknown };
  const res = await supabaseRest("consents", {
    method: "POST",
    headers: { "content-type": "application/json", prefer: "return=minimal" },
    body: JSON.stringify({
      user_id: user.id, role: b.role === "seller" ? "seller" : "creator", action: b.action === "withdrawn" ? "withdrawn" : "agreed", terms: TERMS, privacy: PRIVACY,
      ip: (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim().slice(0, 64) || null, user_agent: (req.headers.get("user-agent") ?? "").slice(0, 300) || null,
    }),
  });
  return res.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Didn't save." }, { status: 500 });
}
