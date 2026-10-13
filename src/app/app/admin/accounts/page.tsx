import type { Metadata } from "next";
import { allAccounts } from "@/modules/admin/accounts.ts";
import { SiteFooter, SiteNav } from "../../../site";
import { requireAdmin } from "../guard";
import { AccountsAdminView } from "./accounts-admin-view";

export const metadata: Metadata = { title: "Admin · Accounts · Rezekii" };
export const dynamic = "force-dynamic";

/** Every connected TikTok account, as designed in the mockup (Accounts). */
export default async function AdminAccountsPage() {
  await requireAdmin();
  const accounts = await allAccounts();
  return (
    <>
      <SiteNav variant="app" />
      <div className="nv nv-page">
        <main className="site-wrap app-main nv-main">
          <AccountsAdminView accounts={accounts} />
        </main>
      </div>
      <SiteFooter />
    </>
  );
}
