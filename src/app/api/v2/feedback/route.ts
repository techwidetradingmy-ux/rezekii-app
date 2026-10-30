import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { supabaseRest } from "@/integrations/supabase/rest.ts";

export const dynamic = "force-dynamic";

const KINDS = ["Idea", "Something's broken", "Question", "Compliment"];
const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** Feedback from the form (owner, 31 Oct 2026: saved for the team's Feedback Inbox). */
export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { kind?: unknown; message?: unknown; mood?: unknown; reply?: unknown; page?: unknown; screenshot?: unknown };
  const message = text(b.message, 500);
  if (!message) return NextResponse.json({ error: "Write a few words first." }, { status: 400 });
  const shot = typeof b.screenshot === "string" && /^data:image\/(png|jpeg|webp);base64,/.test(b.screenshot) && b.screenshot.length <= 700_000 ? b.screenshot : null;
  const mood = Number(b.mood);
  const res = await supabaseRest("feedback", {
    method: "POST",
    headers: { "content-type": "application/json", prefer: "return=minimal" },
    body: JSON.stringify({
      user_id: user.id, kind: KINDS.includes(String(b.kind)) ? b.kind : "Idea", message, mood: mood >= 1 && mood <= 5 ? Math.round(mood) : null,
      reply_by: ["WhatsApp", "Email", "No need"].includes(String(b.reply)) ? b.reply : "No need", page: text(b.page, 300) || null,
      device: (req.headers.get("user-agent") ?? "").slice(0, 300) || null, screenshot: shot,
    }),
  });
  return res.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Didn't send. Please try again." }, { status: 500 });
}
