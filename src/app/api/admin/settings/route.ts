import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { actorName, logActivity } from "@/modules/admin/admins.ts";
import { savePostingTimes } from "@/modules/posting/times.ts";
import { saveSellerCampaignSettings } from "@/modules/tap/pipeline.ts";

export const dynamic = "force-dynamic";

/** Saves the recommended posting times: { times: ["06:00", ...] } (Malaysia time, at least one, at most 12). */
export async function PUT(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (origin && origin !== req.nextUrl.origin) return NextResponse.json({ error: "Please do this from rezekii.com." }, { status: 403 });
  const user = await currentUser();
  if (user?.role !== "admin") return NextResponse.json({ error: "Admins only." }, { status: 403 });
  const body = (await req.json().catch(() => ({}))) as { times?: unknown; campaign?: { name?: unknown; commission?: unknown; description?: unknown } };
  // New seller campaigns (owner, 31 Oct 2026): the commission and public description every new shop's campaign starts with.
  if (body.campaign) {
    const commission = Math.round(Number(body.campaign.commission) * 10) / 10;
    const description = String(body.campaign.description ?? "").trim();
    const name = String(body.campaign.name ?? "").trim();
    if (!name || name.replace("{shop}", "").length > 40) return NextResponse.json({ error: "Write a campaign name of up to 40 characters plus {shop}." }, { status: 400 });
    if (!(commission > 1 && commission < 80)) return NextResponse.json({ error: "Commission must be more than 1% and less than 80%." }, { status: 400 });
    if (!description || description.length > 900) return NextResponse.json({ error: "Write a description of up to 900 characters." }, { status: 400 });
    await saveSellerCampaignSettings({ name, commission, description }, user.id, actorName(user.email));
    return NextResponse.json({ ok: true, campaign: { name, commission, description } });
  }
  const { times } = body;
  const list = Array.isArray(times) ? [...new Set(times.filter((t): t is string => typeof t === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(t)))].sort() : [];
  if (!list.length || list.length > 12) return NextResponse.json({ error: "Keep between 1 and 12 posting times." }, { status: 400 });
  await savePostingTimes(list, user.id);
  await logActivity(actorName(user.email), "Posts", `set the recommended posting times to ${list.join(", ")}`);
  return NextResponse.json({ ok: true, times: list });
}
