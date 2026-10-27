import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { accountPage } from "@/modules/accounts/account-page.ts";
import { ADMIN_PASSWORD_MIN, PASSWORD_MIN } from "@/modules/accounts/password.ts";
import { getLang, tFor } from "@/lib/i18n/server.ts";
import { currentUser } from "../../current-user";
import { myPhoto } from "@/modules/photos/store.ts";
import { AccountsView } from "./accounts-view";
import { ViewSwitch } from "../../view-switch";

export const metadata: Metadata = { title: "Account · Rezekii" };
export const dynamic = "force-dynamic";

/** Account, as chosen from the mockup (direction A). */
export default async function AccountPage({ searchParams }: { searchParams: Promise<{ connected?: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/signin");
  const lang = await getLang();
  const t = tFor(lang);
  const [d, q] = await Promise.all([accountPage(user, lang), searchParams]);
  const name = user.display_name || (d.shop ? `@${d.shop.username}` : user.tiktok_username ? `@${user.tiktok_username}` : user.email) || t("Your account");
  return (
    <div className="nv nv-page">
      <main className="site-wrap app-main nv-main">
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: 12 }}>
          <div>
            <h1 className="nv-title">{t("Account")}</h1>
            <p className="nv-sub">{t("Your TikTok Shop profile, earnings and settings")}</p>
          </div>
          {user.role === "admin" && <span className="vs-page"><ViewSwitch to="admin" /></span>}
        </div>
        <AccountsView
          me={{ name, avatar: myPhoto(user), initial: name.replace("@", "").slice(0, 1).toUpperCase(), role: user.role, tiktokUsername: user.tiktok_username, passwordMin: user.role === "admin" ? ADMIN_PASSWORD_MIN : PASSWORD_MIN }}
          d={d}
          now={d.now}
          justConnected={q.connected === "tiktok"}
        />
      </main>
    </div>
  );
}
