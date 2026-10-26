import type { Metadata } from "next";
import { adminToday } from "@/modules/admin/today.ts";
import { AdminTodayView } from "./admin-today-view";
import { requireAdmin } from "./guard";

export const metadata: Metadata = { title: "Admin · Today · Rezekii" };
export const dynamic = "force-dynamic";

/** Techwide's admin Today, as designed in the mockup. */
export default async function AdminTodayPage() {
  const me = await requireAdmin();
  const d = await adminToday(me.id);
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
