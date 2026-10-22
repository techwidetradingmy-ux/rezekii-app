import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getLang, tFor } from "@/lib/i18n/server.ts";
import { leaderboard } from "@/modules/rankings/leaderboard.ts";
import { rankings } from "@/modules/rankings/store.ts";
import { currentUser } from "../../current-user";
import { pulled } from "../marketplace/format";
import { RankingsView } from "./rankings-view";

export const metadata: Metadata = { title: "Rankings · Rezekii" };
export const dynamic = "force-dynamic";

/** Rankings, as designed in the mockup: the Rezekii monthly GMV leaderboard and TikTok Shop Malaysia's best-seller lists. */
export default async function RankingsPage() {
  const user = await currentUser();
  if (!user) redirect("/signin");
  const lang = await getLang();
  const t = tFor(lang);
  const [board, built] = await Promise.all([leaderboard(lang), rankings()]);
  return (
    <>
      <div className="nv nv-page">
        <main className="site-wrap app-main nv-main">
          <div>
            <h1 className="nv-title">{t("Rankings")}</h1>
            <p className="nv-sub">{t("Monthly GMV leaderboard · real TikTok data")}{built ? t(", pulled {date}", { date: pulled(built.asOf, lang) }) : ""}</p>
          </div>
          <RankingsView board={board} you={user.tiktok_username ? `@${user.tiktok_username}` : null} asOf={built?.asOf ?? null} />
        </main>
      </div>
    </>
  );
}
