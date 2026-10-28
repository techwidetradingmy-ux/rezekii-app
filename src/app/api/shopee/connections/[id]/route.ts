import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { removeShopee } from "@/modules/shopee/connections.ts";

export const dynamic = "force-dynamic";

/** Disconnect a Shopee account from Rezekii (nothing is posted to Shopee yet, so there's nothing to cancel). */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const origin = req.headers.get("origin");
  if (origin && origin !== req.nextUrl.origin) return NextResponse.json({ error: "Please do this from rezekii.com." }, { status: 403 });
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return NextResponse.json({ error: "Which channel?" }, { status: 400 });
  if (!(await removeShopee(user.id, id))) return NextResponse.json({ error: "That channel isn't connected." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
