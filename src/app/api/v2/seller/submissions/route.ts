import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { submitToTap } from "@/modules/tap/submissions.ts";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Submit products to Techwide's TAP: { productIds, raise, samples, conditions } (owner, 30 Oct 2026). */
export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { productIds?: unknown; raise?: unknown; samples?: unknown; conditions?: unknown };
  const r = await submitToTap(user, {
    productIds: Array.isArray(b.productIds) ? b.productIds.map(String) : [],
    raise: Number(b.raise),
    samples: Number(b.samples),
    conditions: b.conditions && typeof b.conditions === "object" ? (b.conditions as Record<string, unknown>) : {},
  });
  return NextResponse.json(r, { status: "error" in r ? 400 : 200 });
}
