import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { canUseSocial } from "@/modules/social/access.ts";
import { deleteBrand, myChannelKeys, saveBrand } from "@/modules/social/brands.ts";
import { brandInput } from "@/modules/social/picker.ts";

export const dynamic = "force-dynamic";

async function guard(req: NextRequest, params: Promise<{ id: string }>) {
  const origin = req.headers.get("origin");
  if (origin && origin !== req.nextUrl.origin) return { res: NextResponse.json({ error: "Please do this from rezekii.com." }, { status: 403 }) };
  const user = await currentUser();
  if (!user) return { res: NextResponse.json({ error: "Sign in first." }, { status: 401 }) };
  if (!canUseSocial(user)) return { res: NextResponse.json({ error: "Not available yet." }, { status: 403 }) };
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return { res: NextResponse.json({ error: "Which brand?" }, { status: 400 }) };
  return { user, id };
}

/** Rename a brand or change its channels: { name, channels }. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard(req, params);
  if ("res" in g) return g.res;
  const input = brandInput((await req.json().catch(() => ({}))) as Record<string, unknown>, await myChannelKeys(g.user.id));
  if ("error" in input) return NextResponse.json(input, { status: 400 });
  const saved = await saveBrand(g.user.id, { id: g.id, ...input });
  if ("error" in saved) return NextResponse.json(saved, { status: saved.error.includes("already") ? 409 : 404 });
  return NextResponse.json({ brand: saved });
}

/** Delete a brand. Its channels stay connected; only the group goes. */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard(req, params);
  if ("res" in g) return g.res;
  if (!(await deleteBrand(g.user.id, g.id))) return NextResponse.json({ error: "That brand doesn't exist." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
