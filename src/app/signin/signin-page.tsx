import { Roboto } from "next/font/google";
import Link from "next/link";
import { Suspense } from "react";
import { LangProvider } from "@/lib/i18n/client.tsx";
import { makeT, type Lang } from "@/lib/i18n/lang.ts";
import { wordsFor } from "@/lib/i18n/translate.ts";
import { TikTokLogo } from "../site";
import { Splash } from "../splash";
import { EmailSignin } from "./email-signin";
import { SigninStatus } from "./signin-status";

const roboto = Roboto({ subsets: ["latin"], weight: ["500"], display: "swap" });

function GoogleG() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

/** Sign in, in English at /signin and in Chinese at /zh/signin (static; 中文 visitors get /zh/signin at /signin too). */
export function SignInPage({ lang }: { lang: Lang }) {
  const words = wordsFor(lang);
  const t = makeT(words);
  const legal = t("By continuing you agree to our {terms} and {privacy}.").split(/(\{terms\}|\{privacy\})/);
  return (
    <LangProvider lang={lang} words={words}>
    <Splash lang={lang}>
      <div className="signin">
        <h1>{t("Sign in to Rezekii")}</h1>
        <p>{t("Post smarter. Sell more. Earn more.")}</p>
        <Suspense fallback={null}>
          <SigninStatus />
        </Suspense>
        <a href="/api/auth/tiktok/start" className="btn-tiktok signin-btn">
          <TikTokLogo />
          {t("Continue with TikTok")}
        </a>
        <a href="/api/auth/google/start" className={`btn-google signin-btn ${roboto.className}`}>
          <GoogleG />
          {t("Continue with Google")}
        </a>
        <EmailSignin />
        <p className="signin-note">{t("Creators: continue with TikTok to post from your own account, or use email. Techwide team: continue with Google.")}</p>
        <p className="signin-legal">
          {legal.map((part, i) => (part === "{terms}" ? <Link key={i} href="/terms">{t("Terms of Service")}</Link> : part === "{privacy}" ? <Link key={i} href="/privacy">{t("Privacy Policy")}</Link> : part))}
        </p>
      </div>
    </Splash>
    </LangProvider>
  );
}
