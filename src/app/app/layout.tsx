import { redirect } from "next/navigation";
import { LangProvider } from "@/lib/i18n/client.tsx";
import { getLang } from "@/lib/i18n/server.ts";
import { wordsFor } from "@/lib/i18n/translate.ts";
import { creatorReady } from "@/modules/creator-accounts/access.ts";
import { currentUser } from "../current-user";
import { adminView } from "../view";
import { SubMenu } from "../menu-links";
import { SiteFooter, SiteNav } from "../site";

/**
 * Signed-in pages share the menu and footer, so they stay in place while the next page loads (see loading.tsx).
 * Everyone uses the creator pages, admins too until they switch this device to the admin dashboard. They get in once their
 * TikTok Shop is linked and approved; until then they're on Getting set up (/onboarding). The creator pages follow the
 * EN | 中文 switch; the admin dashboard is English only.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  const adminOn = await adminView(user);
  if (user && !adminOn && !(await creatorReady(user.id))) redirect("/onboarding");
  const lang = await getLang();
  return (
    <LangProvider lang={lang} words={wordsFor(lang)}>
      <SiteNav variant="app" />
      {user && <SubMenu admin={adminOn} />}
      {children}
      <SiteFooter lang={lang} />
    </LangProvider>
  );
}
