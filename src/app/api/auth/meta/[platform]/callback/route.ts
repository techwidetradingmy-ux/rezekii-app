import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { exchangeFacebookCode, facebookPages } from "@/integrations/meta/facebook.ts";
import { exchangeInstagramCode, instagramProfile } from "@/integrations/meta/instagram.ts";
import { exchangeThreadsCode, threadsProfile } from "@/integrations/meta/threads.ts";
import { saveAccount } from "@/modules/social/accounts.ts";
import { canUseSocial, isPlatform } from "@/modules/social/access.ts";
import { stateMatches } from "../../../tiktokshop/state.ts";
import { appBase } from "../../../oauth.ts";
import { backToComposer, metaCallbackUrl, metaCookie } from "../../meta.ts";

export const dynamic = "force-dynamic";

/** Instagram accounts Rezekii can post to (personal accounts can't use Meta's publishing API). */
const PROFESSIONAL = new Set(["BUSINESS", "MEDIA_CREATOR"]);

/** Meta sends the person back here after its own sign-in (the return address registered in the Meta app). */
export async function GET(req: NextRequest, { params }: { params: Promise<{ platform: string }> }) {
  const { platform } = await params;
  if (!isPlatform(platform)) return NextResponse.redirect(`${appBase(req)}/app/new`);
  const q = req.nextUrl.searchParams;
  if (q.get("error") || q.get("error_reason")) return backToComposer(req, platform, "cancelled");
  const code = q.get("code");
  if (!code) return backToComposer(req, platform, "cancelled");
  if (!stateMatches(q.get("state"), req.cookies.get(metaCookie(platform))?.value)) return backToComposer(req, platform, "expired");
  const user = await currentUser();
  if (!user) return NextResponse.redirect(`${appBase(req)}/signin`);
  if (!canUseSocial(user)) return NextResponse.redirect(`${appBase(req)}/app/new`);
  const redirectUri = metaCallbackUrl(req, platform);
  try {
    if (platform === "facebook") {
      const pages = await facebookPages(await exchangeFacebookCode(code, redirectUri));
      if (!pages.length) return backToComposer(req, platform, "no_pages");
      for (const p of pages) await saveAccount(user.id, { platform, externalId: p.id, name: p.name, avatarUrl: p.picture?.data?.url, token: p.access_token, expiresIn: null });
      return backToComposer(req, platform, "ok");
    }
    if (platform === "instagram") {
      const t = await exchangeInstagramCode(code, redirectUri);
      const me = await instagramProfile(t.token);
      if (me.account_type && !PROFESSIONAL.has(me.account_type)) return backToComposer(req, platform, "personal");
      await saveAccount(user.id, { platform, externalId: me.user_id, name: me.name || me.username, username: me.username, avatarUrl: me.profile_picture_url, accountType: me.account_type, token: t.token, expiresIn: t.expiresIn });
      return backToComposer(req, platform, "ok");
    }
    const t = await exchangeThreadsCode(code, redirectUri);
    const me = await threadsProfile(t.token);
    await saveAccount(user.id, { platform, externalId: me.id, name: me.name || me.username, username: me.username, avatarUrl: me.threads_profile_picture_url, token: t.token, expiresIn: t.expiresIn });
    return backToComposer(req, platform, "ok");
  } catch (err) {
    console.error(`[meta] ${platform} callback failed`, err instanceof Error ? err.message : err);
    return backToComposer(req, platform, "failed");
  }
}
