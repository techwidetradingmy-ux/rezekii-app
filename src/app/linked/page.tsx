import type { Metadata } from "next";
import Link from "next/link";
import { getLang, tFor } from "@/lib/i18n/server";

export const metadata: Metadata = { title: "Connect · Rezekii", robots: { index: false, follow: false } };

const NAMES: Record<string, string> = { tiktokshop: "TikTok Shop", tiktok: "TikTok", facebook: "Facebook", instagram: "Instagram", threads: "Threads" };

/**
 * Where a connect started in the Home Screen app ends, in the phone's browser (owner, 23 Nov 2026): the link is already saved to
 * her account, so this only says to go back to the app, which shows it. This browser stays signed out.
 */
export default async function Linked({ searchParams }: { searchParams: Promise<{ app?: string; ok?: string }> }) {
  const q = await searchParams;
  const t = tFor(await getLang());
  const app = NAMES[q.app ?? ""] ?? t("The app");
  const ok = q.ok === "1";
  return (
    <main className="site-wrap" style={{ minHeight: "70vh", display: "grid", placeItems: "center", paddingBlock: 48 }}>
      <div className="v2-card" style={{ maxWidth: 420, width: "100%", textAlign: "center", display: "grid", gap: 12 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>{ok ? t("{app} Connected", { app }) : t("{app} Didn't Connect", { app })}</h1>
        <p className="v2-muted" style={{ margin: 0 }}>
          {ok ? t("Go back to the Rezekii app on your Home Screen. It shows your new link by itself.") : t("Go back to the Rezekii app on your Home Screen and try again.")}
        </p>
        <Link href="/app/account#connections" className="v2-link">{t("Continue Here Instead")}</Link>
      </div>
    </main>
  );
}
