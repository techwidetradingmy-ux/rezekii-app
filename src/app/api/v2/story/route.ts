import { NextResponse, type NextRequest } from "next/server";
import { keepFresh } from "@/modules/creator-accounts/fresh.ts";
import { currentUser } from "@/app/current-user";
import { supabaseRest } from "@/integrations/supabase/rest.ts";
import { storyIn, storyOf, type SavedPage } from "@/modules/story/story.ts";
import { getLang, tFor } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const key = (userId: string) => encodeURIComponent(`story:${userId}`);

/**
 * Her Daily Story (owner, 31 Oct 2026: real data), made once per story day (from 8 AM Malaysia time) and saved, so it opens at
 * once on every server (owner, 2 Nov 2026). The app shows its pages one at a time through the day. It's saved without a
 * language and written in hers each time it's read (owner, 3 Nov 2026), so switching language changes it straight away.
 */
export async function GET(req: NextRequest) {
  const lang = await getLang();
  const t = tFor(lang);
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: t("Sign in first.") }, { status: 401 });
  const day = new Date().toISOString().slice(0, 10);
  if (!req.nextUrl.searchParams.get("fresh")) {
    const [saved] = (await (await supabaseRest(`app_settings?key=eq.${key(user.id)}&select=value&limit=1`)).json().catch(() => [])) as { value: { day: string; pages: SavedPage[] } }[];
    if (saved?.value?.day === day) return NextResponse.json({ pages: storyIn(saved.value.pages, lang) }, { headers: { "cache-control": "private, no-store" } });
  }
  await keepFresh(user.id);
  const pages = await storyOf(user, req.nextUrl.origin);
  await supabaseRest("app_settings?on_conflict=key", { method: "POST", headers: { prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify({ key: `story:${user.id}`, value: { day, pages }, updated_at: new Date().toISOString() }) }).catch(() => null);
  return NextResponse.json({ pages: storyIn(pages, lang) }, { headers: { "cache-control": "private, no-store" } });
}
