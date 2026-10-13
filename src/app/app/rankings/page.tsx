import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { leaderboard } from "@/modules/rankings/leaderboard.ts";
import { rankings } from "@/modules/rankings/store.ts";
import { currentUser } from "../../current-user";
import { SiteFooter, SiteNav } from "../../site";
import { pulled } from "../marketplace/format";
import { RankingsView } from "./rankings-view";

export const metadata: Metadata = { title: "Rankings · Rezekii" };
export const dynamic = "force-dynamic";

/** Rankings, as designed in the mockup: the Rezekii monthly GMV leaderboard and TikTok Shop Malaysia's best-seller lists. */
export default async function RankingsPage() {
  const user = await currentUser();
  if (!user) redirect("/signin");
  const [board, built] = await Promise.all([leaderboard(), rankings()]);
  return (
    <>
      <SiteNav variant="app" />
      <div className="nv nv-page">
        <main className="site-wrap app-main nv-main">
          <div>
            <h1 className="nv-title">Rankings</h1>
            <p className="nv-sub">Monthly GMV leaderboard · real TikTok data{built ? `, pulled ${pulled(built.asOf)}` : ""}</p>
          </div>
          <RankingsView board={board} you={user.tiktok_username ? `@${user.tiktok_username}` : null} asOf={built?.asOf ?? null} />
        </main>
      </div>
      <SiteFooter />
    </>
  );
}
