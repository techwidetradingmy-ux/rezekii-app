import type { Metadata } from "next";
import { adminToday } from "@/modules/admin/today.ts";
import { AdminTodayView } from "./admin-today-view";
import { requireAdmin } from "./guard";

export const metadata: Metadata = { title: "Admin · Today · Rezekii" };
export const dynamic = "force-dynamic";

/** Techwide's admin Today, as designed in the mockup. */
export default async function AdminTodayPage() {
  await requireAdmin();
  const d = await adminToday();
  return (
    <>
      <div className="nv nv-page">
        <main className="site-wrap app-main nv-main">
          <AdminTodayView d={d} />
        </main>
      </div>
    </>
  );
}
