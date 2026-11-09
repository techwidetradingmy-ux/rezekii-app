import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getLang, tFor } from "@/lib/i18n/server.ts";
import { listAccounts } from "@/modules/social/accounts.ts";
import { currentUser } from "../../current-user";
import { CommentsView } from "./comments-view";

export const metadata: Metadata = { title: "Comments · Rezekii" };
export const dynamic = "force-dynamic";

/** Comments (owner, 9 Nov 2026): reply to, hide or delete comments on the account's own Facebook Pages and Instagram accounts. */
export default async function CommentsPage() {
  const user = await currentUser();
  if (!user) redirect("/signin");
  const t = tFor(await getLang());
  const accounts = await listAccounts(user.id).catch(() => []);
  const channels = accounts
    .flatMap((a) => (a.platform === "facebook" || a.platform === "instagram" ? [{ id: a.id, platform: a.platform, name: a.name ?? a.username ?? a.platform, username: a.username, status: a.status }] : []));
  return (
    <main className="site-wrap app-main">
      <nav className="app-crumbs" aria-label={t("Breadcrumb")}><Link href={user.role === "admin" ? "/app/admin" : "/app"}>{t("Today")}</Link><span aria-hidden="true">›</span><span>{t("Comments")}</span></nav>
      <h1>{t("Comments")}</h1>
      <CommentsView channels={channels} hasThreads={accounts.some((a) => a.platform === "threads")} />
    </main>
  );
}
