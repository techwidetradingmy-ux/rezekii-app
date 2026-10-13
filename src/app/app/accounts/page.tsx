import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { accountOverview } from "@/modules/accounts/manage.ts";
import { currentUser } from "../../current-user";
import { AccountsView } from "./accounts-view";

export const metadata: Metadata = { title: "My accounts · Rezekii" };
export const dynamic = "force-dynamic";

/** My accounts, as designed in the mockup. */
export default async function AccountsPage({ searchParams }: { searchParams: Promise<{ connected?: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/signin");
  const [o, q] = await Promise.all([accountOverview(user), searchParams]);
  const handle = user.display_name || user.email || "Your account";
  return (
    <>
      <div className="nv nv-page">
        <main className="site-wrap app-main nv-main">
          <div>
            <h1 className="nv-title">My accounts</h1>
            <p className="nv-sub">Your TikTok accounts, connections and settings</p>
          </div>
          <AccountsView
            me={{ handle, avatar: user.avatar_url, initial: handle.replace("@", "").slice(0, 1).toUpperCase(), role: user.role, tiktokUsername: user.tiktok_username }}
            o={o}
            justConnected={q.connected === "tiktok"}
          />
        </main>
      </div>
    </>
  );
}
