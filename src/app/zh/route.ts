import { NextResponse, type NextRequest } from "next/server";
import { LANG_COOKIE } from "@/lib/i18n/lang";

/** rezekii.com/zh was the Chinese homepage; the site now switches language in place, so this picks Chinese and opens it. */
export function GET(req: NextRequest) {
  const res = NextResponse.redirect(new URL("/", req.url), 307);
  res.cookies.set(LANG_COOKIE, "zh", { path: "/", maxAge: 31_536_000, sameSite: "lax" });
  return res;
}
