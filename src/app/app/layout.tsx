import { redirect } from "next/navigation";
import { LangProvider } from "@/lib/i18n/client.tsx";
import { getLang } from "@/lib/i18n/server.ts";
import { wordsFor } from "@/lib/i18n/translate.ts";
import { creatorReady } from "@/modules/creator-accounts/access.ts";
import { currentUser } from "../current-user";
import { SubMenu } from "../menu-links";
import { SiteFooter, SiteNav } from "../site";

/**
 * Signed-in pages share the menu and footer, so they stay in place while the next page loads (see loading.tsx).
 * Creators get in once their TikTok Shop is linked and approved; until then they're on Getting set up (/onboarding).
 * Creators see them in English or Chinese (the EN | 中文 switch); admin pages are English only.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (user && user.role !== "admin" && !(await creatorReady(user.id))) redirect("/onboarding");
  const lang = user?.role === "admin" ? "en" : await getLang();
  return (
    <LangProvider lang={lang} words={wordsFor(lang)}>
      <SiteNav variant="app" />
      {user && <SubMenu admin={user.role === "admin"} />}
      {children}
      <SiteFooter lang={lang} />
    </LangProvider>
  );
}
