import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { supabaseRest } from "@/integrations/supabase/rest.ts";
import { mytDay } from "@/modules/refresh/plan.ts";
import { addTasks } from "@/modules/refresh/store.ts";

export const dynamic = "force-dynamic";

/** Refresh now (Community → Numbers): queues a reading of every Admin channel for the refresh timer, unless one is waiting. */
export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (origin && origin !== req.nextUrl.origin) return NextResponse.json({ error: "Please do this from rezekii.com." }, { status: 403 });
  const user = await currentUser();
  if (user?.role !== "admin") return NextResponse.json({ error: "Admins only." }, { status: 403 });
  const now = Date.now();
  const open = (await (await supabaseRest("refresh_tasks?kind=eq.community&status=in.(pending,running)&select=key&limit=1")).json()) as unknown[];
  if (!open.length) await addTasks(mytDay(now), [{ key: `community|${now}`, kind: "community", params: {}, priority: 1 }]);
  return NextResponse.json({ ok: true, queued: !open.length });
}
