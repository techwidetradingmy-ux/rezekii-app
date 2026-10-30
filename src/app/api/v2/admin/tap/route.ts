import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { actorName, listAdmins } from "@/modules/admin/admins.ts";
import { act, listPipeline, type Action } from "@/modules/tap/pipeline.ts";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const NO_STORE = { headers: { "cache-control": "private, no-store" } };

/** Sellers' real TAP requests for the Admin pipeline, with who can own them (admins only; owner, 30 Oct 2026). */
export async function GET() {
  const user = await currentUser();
  if (user?.role !== "admin") return NextResponse.json({ error: "Admins only." }, { status: 403 });
  try {
    const [requests, admins] = await Promise.all([listPipeline(), listAdmins().catch(() => [])]);
    return NextResponse.json({ requests, admins: [...new Set(admins.map((a) => actorName(a.email)))], me: actorName(user.email) }, NO_STORE);
  } catch (err) {
    console.error("[admin tap] list failed", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Couldn't load the requests. Please try again." }, { status: 502 });
  }
}

/** One step on a request: { id, action, ... } (admins only). */
export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (origin && origin !== req.nextUrl.origin) return NextResponse.json({ error: "Please do this from Rezekii." }, { status: 403 });
  const user = await currentUser();
  if (user?.role !== "admin") return NextResponse.json({ error: "Admins only." }, { status: 403 });
  const b = (await req.json().catch(() => null)) as ({ id?: unknown } & Action) | null;
  if (!b || typeof b.id !== "string" || typeof b.action !== "string") return NextResponse.json({ error: "Choose a request and a step." }, { status: 400 });
  try {
    const r = await act(b.id, b, actorName(user.email));
    return NextResponse.json(r, { status: r.ok ? 200 : 400 });
  } catch (err) {
    console.error("[admin tap] step failed", err instanceof Error ? err.message : err);
    return NextResponse.json({ ok: false, error: "Something went wrong. Please try again." }, { status: 502 });
  }
}
