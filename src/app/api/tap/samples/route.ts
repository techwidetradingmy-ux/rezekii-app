import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { mySamples, requestSample } from "@/modules/tap/samples.ts";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  return NextResponse.json({ requests: await mySamples(user.id) }, { headers: { "cache-control": "private, no-store" } });
}

/** Asks Techwide for a free sample of one product. */
export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const { productId } = (await req.json().catch(() => ({}))) as { productId?: string };
  if (!productId) return NextResponse.json({ error: "Choose a product." }, { status: 400 });
  const r = await requestSample(user.id, productId);
  return r.ok ? NextResponse.json({ request: r.request }) : NextResponse.json({ error: r.error }, { status: r.status });
}
