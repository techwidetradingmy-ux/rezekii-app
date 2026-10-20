import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { facebookPageInfo } from "@/integrations/meta/facebook.ts";
import { freshToken, getAccount } from "@/modules/social/accounts.ts";
import { canUseSocial } from "@/modules/social/access.ts";
import { pageRef } from "@/modules/social/settings.ts";

export const dynamic = "force-dynamic";

/** The Facebook Page to mention (S7): { accountId (the posting Page), page (a link or Page ID) } → { page: { id, name } }. */
export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (origin && origin !== req.nextUrl.origin) return NextResponse.json({ error: "Please do this from rezekii.com." }, { status: 403 });
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (!canUseSocial(user)) return NextResponse.json({ error: "Not available yet." }, { status: 403 });
  const b = (await req.json().catch(() => ({}))) as { accountId?: string; page?: string };
  const acc = /^[0-9a-f-]{36}$/.test(String(b.accountId)) ? await getAccount(String(b.accountId), user.id) : null;
  if (!acc || acc.platform !== "facebook" || acc.status !== "active") return NextResponse.json({ error: "Pick a Facebook Page to post to first." }, { status: 400 });
  const ref = pageRef(String(b.page ?? ""));
  if (!ref) return NextResponse.json({ error: "Paste a Facebook Page link or Page ID." }, { status: 400 });
  try {
    const page = await facebookPageInfo("id" in ref ? ref.id : ref.username, await freshToken(acc));
    return NextResponse.json({ page: { id: page.id, name: page.name } });
  } catch (err) {
    console.error("[meta] page lookup failed", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "id" in ref ? "Facebook couldn't find a Page with that ID." : "Facebook didn't give Rezekii that Page's ID. Paste the Page ID instead (on the Page: About → Page transparency)." }, { status: 404 });
  }
}
