import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getLang, tFor } from "@/lib/i18n/server.ts";
import { communityNumbers } from "@/modules/community/numbers.ts";
import { listAccounts } from "@/modules/social/accounts.ts";
import { currentUser } from "../../current-user";
import { NumbersView } from "./numbers-view";

export const metadata: Metadata = { title: "Numbers · Rezekii" };
export const dynamic = "force-dynamic";

/** Posts → Numbers (owner, 9 Nov 2026): followers, likes, comments and shares for the account's own Facebook Pages and Instagram accounts. */
export default async function NumbersPage() {
  const user = await currentUser();
  if (!user) redirect("/signin");
  const t = tFor(await getLang());
  const [data, accounts] = await Promise.all([communityNumbers(28, undefined, user.id), listAccounts(user.id).catch(() => [])]);
  return (
    <main className="site-wrap app-main">
      <nav className="app-crumbs" aria-label={t("Breadcrumb")}><Link href={user.role === "admin" ? "/app/admin" : "/app"}>{t("Today")}</Link><span aria-hidden="true">›</span><span>{t("Numbers")}</span></nav>
      <h1>{t("Numbers")}</h1>
      <NumbersView {...data} hasThreads={accounts.some((a) => a.platform === "threads")} />
    </main>
  );
}
