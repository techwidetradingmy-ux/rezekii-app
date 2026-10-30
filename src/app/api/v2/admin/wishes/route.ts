import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { actorName, logActivity } from "@/modules/admin/admins.ts";
import { adminBoard, decideWish } from "@/modules/wishes/wishes.ts";

export const dynamic = "force-dynamic";

/** The Wish List for admins, with each creator's commitment (admins only; owner, 31 Oct 2026). */
export async function GET() {
  const user = await currentUser();
  if (user?.role !== "admin") return NextResponse.json({ error: "Admins only." }, { status: 403 });
  return NextResponse.json({ items: await adminBoard() }, { headers: { "cache-control": "private, no-store" } });
}

/** { product, declined: true|false } or { product, raise } logs the seller's answer (admins only). */
export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (origin && origin !== req.nextUrl.origin) return NextResponse.json({ error: "Please do this from Rezekii." }, { status: 403 });
  const user = await currentUser();
  if (user?.role !== "admin") return NextResponse.json({ error: "Admins only." }, { status: 403 });
  const b = (await req.json().catch(() => ({}))) as { product?: unknown; name?: unknown; declined?: unknown; raise?: unknown };
  const product = typeof b.product === "string" ? b.product : "";
  const raise = Number(b.raise);
  const d = typeof b.declined === "boolean" ? { declined: b.declined } : raise >= 0.5 && raise <= 30 ? { raise: Math.round(raise * 10) / 10 } : null;
  if (!d) return NextResponse.json({ error: "Say what the seller answered." }, { status: 400 });
  if (!(await decideWish(product, d))) return NextResponse.json({ error: "Didn't save. Please try again." }, { status: 400 });
  const name = String(b.name ?? product).slice(0, 60);
  await logActivity(actorName(user.email), "TAP", "declined" in d ? (d.declined ? `logged that the seller said no to the wish for ${name}` : `reopened the wish for ${name}`) : `logged +${d.raise}% agreed for the wish for ${name}`);
  return NextResponse.json({ ok: true });
}
