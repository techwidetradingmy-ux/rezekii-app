import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { canUseSocial } from "@/modules/social/access.ts";
import { countBrands, listBrands, myChannelKeys, saveBrand } from "@/modules/social/brands.ts";
import { BRANDS_MAX, brandInput } from "@/modules/social/picker.ts";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (!canUseSocial(user)) return NextResponse.json({ brands: [] });
  return NextResponse.json({ brands: await listBrands(user.id) });
}

/** New brand: { name, channels }. */
export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (origin && origin !== req.nextUrl.origin) return NextResponse.json({ error: "Please do this from rezekii.com." }, { status: 403 });
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (!canUseSocial(user)) return NextResponse.json({ error: "Not available yet." }, { status: 403 });
  const input = brandInput((await req.json().catch(() => ({}))) as Record<string, unknown>, await myChannelKeys(user.id));
  if ("error" in input) return NextResponse.json(input, { status: 400 });
  if ((await countBrands(user.id)) >= BRANDS_MAX) return NextResponse.json({ error: `You can have up to ${BRANDS_MAX} brands.` }, { status: 400 });
  const saved = await saveBrand(user.id, input);
  if ("error" in saved) return NextResponse.json(saved, { status: 409 });
  return NextResponse.json({ brand: saved });
}
