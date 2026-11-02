import { NextResponse, type NextRequest } from "next/server";
import { detailsMissing } from "@/modules/rewards/profiles.ts";
import { currentUser } from "@/app/current-user";
import { approvedCreatorToken } from "@/modules/creator-accounts/access.ts";
import { levelOf } from "@/modules/levels/store.ts";
import { listDay, type Channel, type Idea } from "@/modules/picks/today.ts";
import { ideasFor, ideasKey, savedIdeas } from "@/modules/picks/ideas-cache.ts";
import { herOffers } from "@/modules/tap/for-creator.ts";
import { getLang, tFor } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const NO_STORE = { headers: { "cache-control": "private, no-store" } };

/**
 * Today's Ideas (owner, 31 Oct 2026): ?source=market|showcase&channel=all|video|others&cat=<category>. What's selling most on
 * TikTok Shop on the newest day TikTok has published. Saved per creator and view (owner, 1 Nov 2026): prepared ahead by the daily
 * refresh and shown at once until TikTok's next list; ?fresh=1 makes it again.
 */
export async function GET(req: NextRequest) {
  const t = tFor(await getLang());
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: t("Sign in first.") }, { status: 401 });
  const q = req.nextUrl.searchParams;
  const source = q.get("source") === "showcase" ? "showcase" : "market";
  // Overall by default; Video from TikTok's top-selling videos (owner, 31 Oct 2026).
  const c = q.get("channel");
  const channel: Channel = c === "video" || c === "others" ? c : "all";
  const cat = source === "market" ? (q.get("cat") || "").slice(0, 60) || null : null;
  const blank = { source, channel, day: null, listAt: null, rows: [], gold: false, at: new Date().toISOString() };
  const [token, missing, level, day, saved, her] = await Promise.all([
    approvedCreatorToken(user.id),
    detailsMissing(user.id).catch(() => null),
    levelOf(user.id).catch(() => "bronze" as const),
    listDay(),
    savedIdeas(user.id, ideasKey(source, channel, cat)),
    herOffers(user.id),
  ]);
  if (!token) return NextResponse.json({ linked: false, ...blank });
  // Locked until her details are complete (owner, 31 Oct 2026).
  if (missing) return NextResponse.json({ linked: true, locked: missing, ...blank });
  // Free samples from her own TikTok check, as the Marketplace shows them, and no product TikTok refused to add for her
  // (owner, 2 Nov 2026), applied to saved lists too.
  const forHer = (rows: Idea[]) => rows
    .filter((x) => source !== "market" || !her.refused[x.id])
    .map((x) => (x.rezekii && her.offers ? { ...x, sample: her.offers[x.id] === 2 } : x));
  // The saved list while TikTok hasn't published a newer one, made for her current level; a Marketplace list saved before it
  // carried her own categories is made again once (owner, 3 Nov 2026).
  if (saved && !q.get("fresh") && saved.day === day && saved.level === level && (source !== "market" || saved.data.herCats))
    return NextResponse.json({ linked: true, ...saved.data, rows: forHer(saved.data.rows), saved: true }, NO_STORE);
  const r = await ideasFor(user.id, token, level, source, channel, cat);
  return NextResponse.json({ linked: true, ...r, rows: forHer(r.rows) }, NO_STORE);
}
