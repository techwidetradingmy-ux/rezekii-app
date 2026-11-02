import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { supabaseRest } from "@/integrations/supabase/rest.ts";
import { getLang, tFor } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

/** The form's types, and Request a Change from My Account (owner, 1 Nov 2026: it goes to the same Feedback Inbox). */
const KINDS = ["Idea", "Something's broken", "Question", "Compliment", "Change request"];
const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const NO_STORE = { headers: { "cache-control": "private, no-store" } };

/**
 * Her messages and change requests, newest first, with the team's reply (owner, 1 Nov 2026: replies are read in the app).
 * Opening them marks the replies seen.
 */
export async function GET() {
  const t = tFor(await getLang());
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: t("Sign in first.") }, { status: 401 });
  const rows = (await (await supabaseRest(`feedback?user_id=eq.${user.id}&select=id,kind,message,status,reply,replied_at,seen_at,created_at&order=created_at.desc&limit=30`)).json().catch(() => [])) as { id: string; reply: string | null; seen_at: string | null }[];
  const unseen = rows.filter((r) => r.reply && !r.seen_at).map((r) => r.id);
  if (unseen.length) await supabaseRest(`feedback?id=in.(${unseen.join(",")})`, { method: "PATCH", headers: { prefer: "return=minimal" }, body: JSON.stringify({ seen_at: new Date().toISOString() }) }).catch(() => null);
  return NextResponse.json({ messages: rows, newReplies: unseen.length }, NO_STORE);
}

/** Feedback from the form, or a change request (owner, 31 Oct and 1 Nov 2026: saved for the team's Feedback Inbox). */
export async function POST(req: NextRequest) {
  const t = tFor(await getLang());
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: t("Sign in first.") }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { kind?: unknown; message?: unknown; mood?: unknown; page?: unknown; screenshot?: unknown };
  const message = text(b.message, 500);
  if (!message) return NextResponse.json({ error: t("Write a few words first.") }, { status: 400 });
  const shot = typeof b.screenshot === "string" && /^data:image\/(png|jpeg|webp);base64,/.test(b.screenshot) && b.screenshot.length <= 700_000 ? b.screenshot : null;
  const mood = Number(b.mood);
  const res = await supabaseRest("feedback", {
    method: "POST",
    headers: { "content-type": "application/json", prefer: "return=minimal" },
    body: JSON.stringify({
      user_id: user.id, kind: KINDS.includes(String(b.kind)) ? b.kind : "Idea", message, mood: mood >= 1 && mood <= 5 ? Math.round(mood) : null,
      reply_by: "In app", page: text(b.page, 300) || null,
      device: (req.headers.get("user-agent") ?? "").slice(0, 300) || null, screenshot: shot,
    }),
  });
  return res.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: t("Didn't send. Please try again.") }, { status: 500 });
}
