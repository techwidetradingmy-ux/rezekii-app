import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { accountPage } from "@/modules/accounts/account-page.ts";
import { currentUser } from "../../current-user";
import { myPhoto } from "@/modules/photos/store.ts";
import { AccountsView } from "./accounts-view";

export const metadata: Metadata = { title: "Account · Rezekii" };
export const dynamic = "force-dynamic";

/** Account, as chosen from the mockup (direction A). */
export default async function AccountPage({ searchParams }: { searchParams: Promise<{ connected?: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/signin");
  const [d, q] = await Promise.all([accountPage(user), searchParams]);
  const name = user.display_name || (d.shop ? `@${d.shop.username}` : user.tiktok_username ? `@${user.tiktok_username}` : user.email) || "Your account";
  return (
    <div className="nv nv-page">
      <main className="site-wrap app-main nv-main">
        <div>
          <h1 className="nv-title">Account</h1>
          <p className="nv-sub">Your TikTok Shop profile, earnings and settings</p>
        </div>
        <AccountsView
          me={{ name, avatar: await myPhoto(user), initial: name.replace("@", "").slice(0, 1).toUpperCase(), role: user.role, tiktokUsername: user.tiktok_username }}
          d={d}
          now={d.now}
          justConnected={q.connected === "tiktok"}
        />
      </main>
    </div>
  );
}
