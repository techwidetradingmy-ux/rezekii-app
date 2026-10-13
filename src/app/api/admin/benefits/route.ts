import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { saveBenefits, type Benefit } from "@/modules/levels/store.ts";

export const dynamic = "force-dynamic";

/** Saves the level benefits list for all creators (admins only). Body: { list: [{ label, v: [bronze, silver, gold], key? }] }. */
export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (user?.role !== "admin") return NextResponse.json({ error: "Admins only." }, { status: 403 });
  const { list } = (await req.json().catch(() => ({}))) as { list?: Benefit[] };
  if (!Array.isArray(list) || !list.length || list.length > 15) return NextResponse.json({ error: "Keep between 1 and 15 benefits." }, { status: 400 });
  const clean: Benefit[] = list.map((r) => ({
    label: String(r?.label ?? "").trim().slice(0, 80),
    v: [0, 1, 2].map((i) => String(r?.v?.[i] ?? "").trim().slice(0, 60)) as [string, string, string],
    ...(r?.key ? { key: true } : {}),
  }));
  if (clean.some((r) => !r.label)) return NextResponse.json({ error: "Every benefit needs a name." }, { status: 400 });
  await saveBenefits(clean, user.id);
  return NextResponse.json({ ok: true });
}
