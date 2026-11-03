import { redirect } from "next/navigation";
import { Shell } from "@/components/shell";
import { LangProvider } from "@/lib/i18n/client";
import { currentUser } from "@/app/current-user";

/**
 * Admin is Techwide's own workspace and reads English, whatever language the device picked (as in Rezekii 1.0). Admins only
 * (owner, 4 Nov 2026: signed out, the sample admin looked real, then Creator Dashboard asked to sign in): anyone signed out
 * signs in and comes back here; a signed-in creator goes to the creator app.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) redirect("/signin?in=1&next=/admin");
  if (user.role !== "admin") redirect("/app");
  return <LangProvider lang="en" words={null}><Shell app="admin">{children}</Shell></LangProvider>;
}
