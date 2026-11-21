import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { facebookAuthUrl } from "@/integrations/meta/facebook.ts";
import { instagramAuthUrl } from "@/integrations/meta/instagram.ts";
import { threadsAuthUrl } from "@/integrations/meta/threads.ts";
import { canUseSocial, isPlatform, metaLevel } from "@/modules/social/access.ts";
import { newState } from "../../../tiktokshop/state.ts";
import { OAUTH_COOKIE_OPTIONS, appBase, canonicalRedirect } from "../../../oauth.ts";
import { META_BACK, metaCallbackUrl, metaCookie } from "../../meta.ts";

export const dynamic = "force-dynamic";

/**
 * Connect a Facebook Page, Instagram account or Threads profile: sends the signed-in account to that app's own sign-in, asking
 * for the permissions of its level (see metaLevel: Admins all of Community's, the accounts Meta reviews with views, reach and
 * Threads replies too).
 * From rezekii.com (owner, 31 Oct 2026); ?from=seller goes back to the seller's New Post.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ platform: string }> }) {
  const { platform } = await params;
  const from = req.nextUrl.searchParams.get("from");
  const back = from === "seller" ? "/seller/app/publish" : from === "seller-account" ? "/seller/app/account" : from === "account" ? "/app/account" : "/app/publish";
  if (!isPlatform(platform)) return NextResponse.redirect(`${appBase(req)}${back}`);
  const moved = canonicalRedirect(req);
  if (moved) return moved;
  const user = await currentUser();
  if (!user) return NextResponse.redirect(`${appBase(req)}/signin`);
  if (!canUseSocial(user)) return NextResponse.redirect(`${appBase(req)}${back}`);
  const state = newState();
  const redirectUri = metaCallbackUrl(req, platform);
  let url: string;
  try {
    const level = await metaLevel(user);
    url = platform === "facebook" ? facebookAuthUrl(state, redirectUri, level) : platform === "instagram" ? instagramAuthUrl(state, redirectUri, level) : threadsAuthUrl(state, redirectUri, level);
  } catch (err) {
    console.error(`[meta] ${platform} not configured`, err instanceof Error ? err.message : err);
    return NextResponse.redirect(`${appBase(req)}${back}?channel=${platform}&connect=config`);
  }
  const res = NextResponse.redirect(url);
  res.cookies.set(metaCookie(platform), state, OAUTH_COOKIE_OPTIONS);
  res.cookies.set(META_BACK, from === "seller" ? "seller" : from === "seller-account" ? "seller-account" : from === "account" ? "account" : "creator", OAUTH_COOKIE_OPTIONS);
  return res;
}
