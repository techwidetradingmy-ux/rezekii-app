import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { exchangeFacebookCode, facebookPages } from "@/integrations/meta/facebook.ts";
import { exchangeInstagramCode, instagramProfile, pagesInstagram } from "@/integrations/meta/instagram.ts";
import { exchangeThreadsCode, threadsProfile } from "@/integrations/meta/threads.ts";
import { saveAccount } from "@/modules/social/accounts.ts";
import { canUseSocial, isPlatform } from "@/modules/social/access.ts";
import { stateMatches } from "../../../tiktokshop/state.ts";
import { OAUTH_COOKIE_OPTIONS, appBase } from "../../../oauth.ts";
import { IG_VIA_FB, backToComposer, composerPath, metaCallbackUrl, metaCookie } from "../../meta.ts";
import { linkedPage, passAtReturn } from "../../../connect.ts";

export const dynamic = "force-dynamic";

/** Instagram accounts Rezekii can post to (personal accounts can't use Meta's publishing API). */
const PROFESSIONAL = new Set(["BUSINESS", "MEDIA_CREATOR"]);

/** Meta sends the person back here after its own sign-in (the return address registered in the Meta app). */
export async function GET(req: NextRequest, { params }: { params: Promise<{ platform: string }> }) {
  const { platform } = await params;
  if (!isPlatform(platform)) return NextResponse.redirect(`${appBase(req)}${composerPath(req)}`);
  const q = req.nextUrl.searchParams;
  // Signed in here, or (Home Screen app, owner 23 Nov 2026) the pass it opened this browser with: then every outcome ends on a
  // page saying to go back to the app.
  const session = await currentUser();
  const pass = session ? null : await passAtReturn(req);
  // Instagram connected through Facebook (see the start route) comes back here, to Facebook's address; it's told as Instagram.
  const igViaFacebook = platform === "facebook" && req.cookies.get(IG_VIA_FB)?.value === "1";
  const shown = igViaFacebook ? "instagram" : platform;
  const done = (result: string) => {
    const res = pass ? linkedPage(req, shown, result === "ok") : backToComposer(req, shown, result);
    if (igViaFacebook) res.cookies.set(metaCookie("facebook"), "", { ...OAUTH_COOKIE_OPTIONS, maxAge: 0 }).set(IG_VIA_FB, "", { ...OAUTH_COOKIE_OPTIONS, maxAge: 0 });
    return res;
  };
  if (q.get("error") || q.get("error_reason")) return done("cancelled");
  const code = q.get("code");
  if (!code) return done("cancelled");
  if (!stateMatches(q.get("state"), req.cookies.get(metaCookie(platform))?.value)) return done("expired");
  const user = session ?? pass;
  if (!user) return NextResponse.redirect(`${appBase(req)}/signin`);
  if (!canUseSocial(user)) return NextResponse.redirect(`${appBase(req)}${composerPath(req)}`);
  const redirectUri = metaCallbackUrl(req, platform);
  try {
    if (igViaFacebook) {
      const accounts = await pagesInstagram(await exchangeFacebookCode(code, redirectUri));
      if (!accounts.length) return done("no_instagram");
      for (const a of accounts) await saveAccount(user.id, { platform: "instagram", externalId: a.id, name: a.name || a.username, username: a.username, avatarUrl: a.profile_picture_url, token: a.pageToken, expiresIn: null, connectedVia: "facebook" });
      return done("ok");
    }
    if (platform === "facebook") {
      const pages = await facebookPages(await exchangeFacebookCode(code, redirectUri));
      if (!pages.length) return done("no_pages");
      for (const p of pages) await saveAccount(user.id, { platform, externalId: p.id, name: p.name, avatarUrl: p.picture?.data?.url, token: p.access_token, expiresIn: null });
      return done("ok");
    }
    if (platform === "instagram") {
      const t = await exchangeInstagramCode(code, redirectUri);
      const me = await instagramProfile(t.token);
      if (me.account_type && !PROFESSIONAL.has(me.account_type)) return done("personal");
      await saveAccount(user.id, { platform, externalId: me.user_id, name: me.name || me.username, username: me.username, avatarUrl: me.profile_picture_url, accountType: me.account_type, token: t.token, expiresIn: t.expiresIn });
      return done("ok");
    }
    const t = await exchangeThreadsCode(code, redirectUri);
    const me = await threadsProfile(t.token);
    await saveAccount(user.id, { platform, externalId: me.id, name: me.name || me.username, username: me.username, avatarUrl: me.threads_profile_picture_url, token: t.token, expiresIn: t.expiresIn });
    return done("ok");
  } catch (err) {
    console.error(`[meta] ${platform} callback failed`, err instanceof Error ? err.message : err);
    return done("failed");
  }
}
