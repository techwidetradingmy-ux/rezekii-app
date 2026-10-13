import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { sampleQueue, setSampleStatus, type SampleRequest } from "@/modules/tap/samples.ts";

export const dynamic = "force-dynamic";

const STATUSES = ["requested", "applied", "rejected", "cancelled", "all"] as const;

/** Techwide's sample queue (admins only). */
export async function GET(req: NextRequest) {
  const user = await currentUser();
  if (user?.role !== "admin") return NextResponse.json({ error: "Admins only." }, { status: 403 });
  const s = req.nextUrl.searchParams.get("status") ?? "requested";
  const status = (STATUSES as readonly string[]).includes(s) ? (s as SampleRequest["status"] | "all") : "requested";
  return NextResponse.json({ requests: await sampleQueue(status) }, { headers: { "cache-control": "private, no-store" } });
}

/** Marks a request applied (sample requested in TikTok Shop) or rejected. */
export async function PATCH(req: NextRequest) {
  const user = await currentUser();
  if (user?.role !== "admin") return NextResponse.json({ error: "Admins only." }, { status: 403 });
  const { id, status, note } = (await req.json().catch(() => ({}))) as { id?: string; status?: string; note?: string };
  if (!id || (status !== "applied" && status !== "rejected")) return NextResponse.json({ error: "Choose applied or rejected." }, { status: 400 });
  const ok = await setSampleStatus(id, status, note ?? null);
  return ok ? NextResponse.json({ ok }) : NextResponse.json({ error: "That request was already closed." }, { status: 409 });
}
