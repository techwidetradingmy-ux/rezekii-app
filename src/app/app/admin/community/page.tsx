import type { Metadata } from "next";
import { communityNumbers } from "@/modules/community/numbers.ts";
import { requireAdmin } from "../guard";
import { NumbersView } from "./numbers-view";

export const metadata: Metadata = { title: "Admin · Community · Rezekii" };
export const dynamic = "force-dynamic";

/** Community → Numbers: the Admins' Facebook Pages, Instagram accounts and Threads profiles, read daily (owner, 23 Oct 2026). */
export default async function CommunityPage() {
  await requireAdmin();
  const data = await communityNumbers(90);
  return (
    <div className="nv nv-page">
      <main className="site-wrap app-main nv-main">
        <NumbersView {...data} />
      </main>
    </div>
  );
}
