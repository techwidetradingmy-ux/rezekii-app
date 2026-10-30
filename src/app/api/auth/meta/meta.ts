import { NextResponse, type NextRequest } from "next/server";
import type { Platform } from "@/modules/social/rules.ts";
import { OAUTH_COOKIE_OPTIONS, appBase } from "../oauth.ts";

/** Anti-forgery cookie per Meta channel (10 minutes, only sent to /api/auth). */
export const metaCookie = (p: Platform) => `rz_oauth_meta_${p}`;
/** Which New Post page to go back to: the creator's or the seller's (owner, 31 Oct 2026). */
export const META_BACK = "rz_meta_back";
/** The return address registered in the Meta app for each channel. */
export const metaCallbackUrl = (req: NextRequest, p: Platform) => `${appBase(req)}/api/auth/meta/${p}/callback`;
export const composerPath = (req: NextRequest) => (req.cookies.get(META_BACK)?.value === "seller" ? "/seller/app/publish" : "/app/publish");

/** Back to New Post with the result, e.g. ?channel=instagram&connect=ok (shown there as a message). */
export function backToComposer(req: NextRequest, p: Platform, result: string): NextResponse {
  const res = NextResponse.redirect(`${appBase(req)}${composerPath(req)}?channel=${p}&connect=${result}`);
  res.cookies.set(metaCookie(p), "", { ...OAUTH_COOKIE_OPTIONS, maxAge: 0 });
  res.cookies.set(META_BACK, "", { ...OAUTH_COOKIE_OPTIONS, maxAge: 0 });
  return res;
}
