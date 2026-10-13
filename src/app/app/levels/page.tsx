import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { benefits, levelPage } from "@/modules/levels/store.ts";
import { currentUser } from "../../current-user";
import { LevelsView } from "./levels-view";

export const metadata: Metadata = { title: "Your level · Rezekii" };
export const dynamic = "force-dynamic";

/** Your level, as designed in the mockup: sales through Techwide's TAP campaigns, verified by the creator's TikTok sign-in. */
export default async function LevelsPage() {
  const user = await currentUser();
  if (!user) redirect("/signin");
  const [data, b] = await Promise.all([levelPage(user.id, user.tiktok_username), benefits()]);
  const handle = user.tiktok_username ? `@${user.tiktok_username}` : user.display_name || "Rezekii creator";
  const firstName = (user.display_name || user.tiktok_username || "creator").split(" ")[0];
  return (
    <>
      <div className="nv nv-page">
        <main className="site-wrap app-main nv-main">
          <div>
            <h1 className="nv-title">Your level</h1>
            <p className="nv-sub">Sales through Techwide&apos;s TAP campaigns · verified by your TikTok sign-in</p>
          </div>
          <LevelsView data={data} benefits={b.list} firstName={firstName} handle={handle} username={user.tiktok_username} />
        </main>
      </div>
    </>
  );
}
