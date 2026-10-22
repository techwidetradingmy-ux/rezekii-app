import Image from "next/image";
import Link from "next/link";
import { currentUser } from "./current-user";
import { myPhoto } from "@/modules/photos/store.ts";
import { LangSwitch } from "@/lib/i18n/client.tsx";
import type { Lang } from "@/lib/i18n/lang.ts";
import { translate } from "@/lib/i18n/translate.ts";
import { getLang, tFor } from "@/lib/i18n/server.ts";
import { BottomNav } from "./bottom-nav";
import { MenuLinks } from "./menu-links";
import { NavAccount } from "./nav-account";

export const COMPANY = "Techwide Marketing Sdn Bhd";
export const COMPANY_NO = "202001017785";
export const SUPPORT_EMAIL = "support@rezekii.com";

export { TikTokLogo } from "./tiktok-logo";

/**
 * Top bar. "hero" sits on the homepage band; "plain" is for legal pages; "app" is the signed-in menu. Signed-in people get their
 * photo and Account (Settings for admins) instead of "Sign in". `lang` words the static pages (the homepage is / or /zh); the
 * signed-in menu follows the device's choice. The EN | 中文 switch shows on the homepage and in the creator app.
 */
export async function SiteNav({ variant, staticPage = false, lang = "en" }: { variant: "hero" | "plain" | "app"; staticPage?: boolean; lang?: Lang }) {
  // The homepage stays static (served from the CDN); its account button is checked in the browser.
  const clientAccount = variant === "hero" || staticPage;
  const user = clientAccount ? null : await currentUser();
  const photo = user ? myPhoto(user) : null;
  // The signed-in app is in English or Chinese for creators; everything else here stays English.
  const creatorApp = variant === "app" && !!user && user.role !== "admin";
  const t = tFor(creatorApp ? await getLang() : lang);
  const nav = (
    <nav className={`site-nav site-wrap${variant === "app" ? " site-nav-app" : ""}`} aria-label="Main">
      <Link href="/" className="site-brand">
        <span>
          <Image src="/master-logo-transparent.png" alt="" width={30} height={30} priority />
        </span>
        Rezekii
      </Link>
      <span className="site-spacer" />
      {variant === "hero" ? (
        <>
          <a href="#earn">{t("Earn more")}</a>
          <a href="#compare">{t("Compare")}</a>
          <a href="#levels">{t("Levels")}</a>
          <a href="#faq">{t("FAQ")}</a>
        </>
      ) : variant === "app" ? (
        <MenuLinks admin={user?.role === "admin"} />
      ) : (
        <>
          <Link href="/privacy">Privacy Policy</Link>
          <Link href="/terms">Terms of Service</Link>
        </>
      )}
      {(creatorApp || variant === "hero") && <LangSwitch />}
      {clientAccount ? (
        <NavAccount />
      ) : user ? (
        <Link href={variant !== "app" ? "/app" : user.role === "admin" ? "/app/admin/settings" : "/app/accounts"} className="site-signin site-account" aria-label={variant === "app" ? (user.role === "admin" ? "Settings" : t("Account")) : "Open Rezekii"}>
          {photo ? (
            // Avatars come from many TikTok and Google CDN hosts, so a plain img (as on /app).
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt="" width={26} height={26} />
          ) : null}
          {variant === "app" ? (user.role === "admin" ? "Settings" : t("Account")) : "My account"}
        </Link>
      ) : (
        <Link href="/signin" className="site-signin">
          Sign in
        </Link>
      )}
    </nav>
  );
  if (variant === "hero") return nav;
  return (
    <>
      <header className="site-plainnav">{nav}</header>
      {variant === "app" && user && <BottomNav admin={user.role === "admin"} />}
    </>
  );
}

/** Footer with the legal links TikTok's review requires to be visible on every page (link names in `lang`). */
export function SiteFooter({ lang = "en" }: { lang?: Lang }) {
  return (
    <footer className="site-foot">
      <div className="site-wrap">
        <span>
          © 2026 {COMPANY} ({COMPANY_NO})
        </span>
        <span className="site-spacer" />
        <Link href="/privacy">{translate(lang, "Privacy Policy")}</Link>
        <Link href="/terms">{translate(lang, "Terms of Service")}</Link>
        <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
      </div>
    </footer>
  );
}
