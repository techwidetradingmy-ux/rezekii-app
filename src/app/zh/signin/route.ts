import { NextResponse, type NextRequest } from "next/server";
import { LANG_COOKIE } from "@/lib/i18n/lang";

/** rezekii.com/zh/signin was the Chinese sign-in page; it now picks Chinese and opens the sign-in page. */
export function GET(req: NextRequest) {
  const res = NextResponse.redirect(new URL("/signin", req.url), 307);
  res.cookies.set(LANG_COOKIE, "zh", { path: "/", maxAge: 31_536_000, sameSite: "lax" });
  return res;
}
