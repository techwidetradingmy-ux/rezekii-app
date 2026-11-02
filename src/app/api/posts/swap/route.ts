import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { swapPost } from "@/modules/posting/edit.ts";
import { supabaseRest } from "@/integrations/supabase/rest.ts";
import { canPay, chargePosts, postSide } from "@/modules/rewards/post-credits.ts";
import { getLang, tFor } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

/** Saving an edit: { old, new } puts the held, changed post in place of the old one, if the old one hasn't started sending. */
export async function POST(req: NextRequest) {
  const t = tFor(await getLang());
  const origin = req.headers.get("origin");
  if (origin && origin !== req.nextUrl.origin) return NextResponse.json({ error: t("Please do this from rezekii.com.") }, { status: 403 });
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: t("Sign in first.") }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { old?: string; new?: string; side?: string };
  const next = String(b.new ?? "");
  // The edited post's channels with a time get charged once it's in place; the old ones get their credits back (owner, 31 Oct 2026).
  const timed = /^[0-9a-f-]{36}$/.test(next) ? await heldChannels(user.id, next) : [];
  const side = postSide(b.side);
  if (timed.length && !(await canPay(user.id, side, timed.length))) return NextResponse.json({ error: t("Not enough credits to schedule these channels. Earn more or save as a draft.") }, { status: 402 });
  const r = await swapPost(user.id, String(b.old ?? ""), next);
  if (!r.ok) return NextResponse.json({ error: t(r.error) }, { status: r.status });
  if (timed.length) {
    const paid = await chargePosts(user.id, side, timed, t);
    if (!paid.ok) {
      // Keep the changes, as a draft.
      await supabaseRest(`posts?id=eq.${next}&user_id=eq.${user.id}&status=eq.scheduled`, { method: "PATCH", headers: { prefer: "return=minimal" }, body: JSON.stringify({ status: "draft" }) });
      await supabaseRest(`social_posts?group_id=eq.${next}&user_id=eq.${user.id}&status=eq.scheduled`, { method: "PATCH", headers: { prefer: "return=minimal" }, body: JSON.stringify({ status: "draft" }) });
      return NextResponse.json({ error: t("Your changes were saved as a draft: not enough credits to schedule them.") }, { status: 402 });
    }
  }
  return NextResponse.json({ ok: true });
}

/** The held (draft with a time) channels of an edited post: its TikTok post or its group of other channels. */
async function heldChannels(userId: string, key: string): Promise<{ id: string; app: string }[]> {
  const social = (await (await supabaseRest(`social_posts?group_id=eq.${key}&user_id=eq.${userId}&status=eq.draft&scheduled_at=not.is.null&select=id,platform,tiktok_post_id`)).json()) as { id: string; platform: string; tiktok_post_id: string | null }[];
  // A group's TikTok post is linked from its channels; a TikTok-only post is the key itself.
  const ttId = social.find((p) => p.tiktok_post_id)?.tiktok_post_id ?? key;
  const tt = (await (await supabaseRest(`posts?id=eq.${ttId}&user_id=eq.${userId}&status=eq.draft&scheduled_at=not.is.null&select=id`)).json()) as { id: string }[];
  return [...tt.map((p) => ({ id: p.id, app: "tiktok" })), ...social.map((p) => ({ id: p.id, app: p.platform }))];
}
