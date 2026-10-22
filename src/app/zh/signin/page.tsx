import type { Metadata } from "next";
import { SignInPage } from "../../signin/signin-page";

export const metadata: Metadata = { title: "登录 · Rezekii" };

/** Sign in, in Chinese (static). Visitors who picked 中文 get it at /signin too, through the rewrite in next.config.ts. */
export default function SignInZh() {
  return <SignInPage lang="zh" />;
}
