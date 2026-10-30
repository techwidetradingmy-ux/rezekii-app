import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { facebookAuthUrl } from "@/integrations/meta/facebook.ts";
import { instagramAuthUrl } from "@/integrations/meta/instagram.ts";
import { threadsAuthUrl } from "@/integrations/meta/threads.ts";
import { canUseSocial, isPlatform } from "@/modules/social/access.ts";
import { newState } from "../../../tiktokshop/state.ts";
import { OAUTH_COOKIE_OPTIONS, appBase, canonicalRedirect } from "../../../oauth.ts";
import { metaCallbackUrl, metaCookie } from "../../meta.ts";

export const dynamic = "force-dynamic";

/**
 * Connect a Facebook Page, Instagram account or Threads profile: sends the signed-in account to that app's own sign-in. Admins
 * are also asked for Community's permissions (numbers, comments, messages), which work for people with a role on the Meta app.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ platform: string }> }) {
  const { platform } = await params;
  if (!isPlatform(platform)) return NextResponse.redirect(`${appBase(req)}/app/new`);
  const moved = canonicalRedirect(req);
  if (moved) return moved;
  const user = await currentUser();
  if (!user) return NextResponse.redirect(`${appBase(req)}/signin`);
  if (!canUseSocial(user)) return NextResponse.redirect(`${appBase(req)}/app/new`);
  const state = newState();
  const redirectUri = metaCallbackUrl(req, platform);
  let url: string;
  try {
    const community = user.role === "admin";
    url = platform === "facebook" ? facebookAuthUrl(state, redirectUri, community) : platform === "instagram" ? instagramAuthUrl(state, redirectUri, community) : threadsAuthUrl(state, redirectUri, community);
  } catch (err) {
    console.error(`[meta] ${platform} not configured`, err instanceof Error ? err.message : err);
    return NextResponse.redirect(`${appBase(req)}/app/new?channel=${platform}&connect=config`);
  }
  const res = NextResponse.redirect(url);
  res.cookies.set(metaCookie(platform), state, OAUTH_COOKIE_OPTIONS);
  return res;
}
