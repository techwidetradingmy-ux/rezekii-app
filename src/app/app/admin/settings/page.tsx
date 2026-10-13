import type { Metadata } from "next";
import { settingsData } from "@/modules/admin/settings.ts";
import { requireAdmin } from "../guard";
import { SettingsView } from "./settings-view";

export const metadata: Metadata = { title: "Admin · Settings · Rezekii" };
export const dynamic = "force-dynamic";

const TABS = ["admins", "times", "log", "health", "look"];

/** Admin Settings, as designed in the mockup. ?tab=health etc. opens a section. */
export default async function AdminSettingsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const user = await requireAdmin();
  const [d, q] = await Promise.all([settingsData(), searchParams]);
  return (
    <>
      <div className="nv nv-page">
        <main className="site-wrap app-main nv-main">
          <SettingsView d={d} me={user.email ?? user.display_name ?? "admin"} startTab={Math.max(0, TABS.indexOf(q.tab ?? ""))} />
        </main>
      </div>
    </>
  );
}
