import { redirect } from "next/navigation";
import { creatorReady } from "@/modules/creator-accounts/access.ts";
import { currentUser } from "../current-user";
import { SubMenu } from "../menu-links";
import { SiteFooter, SiteNav } from "../site";

/**
 * Signed-in pages share the menu and footer, so they stay in place while the next page loads (see loading.tsx).
 * Creators get in once their TikTok Shop is linked and approved; until then they're on Getting set up (/onboarding).
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (user && user.role !== "admin" && !(await creatorReady(user.id))) redirect("/onboarding");
  return (
    <>
      <SiteNav variant="app" />
      {user && <SubMenu admin={user.role === "admin"} />}
      {children}
      <SiteFooter />
    </>
  );
}
