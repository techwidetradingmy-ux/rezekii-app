import { LangProvider } from "@/lib/i18n/client.tsx";
import { wordsFor } from "@/lib/i18n/translate.ts";
import { getLang, tFor } from "@/lib/i18n/server.ts";
import { shopStatus } from "@/modules/creator-accounts/access.ts";
import { currentUser } from "../current-user";
import { adminView } from "../view";
import { SubMenu } from "../menu-links";
import { ShopBanner } from "../shop-banner";
import { SiteFooter, SiteNav } from "../site";

/**
 * Signed-in pages share the menu and footer, so they stay in place while the next page loads (see loading.tsx).
 * Everyone uses the creator pages, admins too until they switch this device to the admin dashboard. They get in straight
 * after signing in (owner, 23 Oct 2026); until their TikTok Shop is linked and approved, a banner says what it unlocks.
 * The creator pages follow the EN | 中文 switch; the admin dashboard is English only.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  const adminOn = await adminView(user);
  const [lang, shop] = await Promise.all([getLang(), user && !adminOn ? shopStatus(user.id) : "ready" as const]);
  return (
    <LangProvider lang={lang} words={wordsFor(lang)}>
      <SiteNav variant="app" />
      {user && <SubMenu admin={adminOn} />}
      <ShopBanner status={shop} t={tFor(lang)} />
      {children}
      <SiteFooter lang={lang} />
    </LangProvider>
  );
}
