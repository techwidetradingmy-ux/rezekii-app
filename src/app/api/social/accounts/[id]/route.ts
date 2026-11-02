import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { removeAccount } from "@/modules/social/accounts.ts";
import { canUseSocial } from "@/modules/social/access.ts";
import { getLang, tFor } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

/** Disconnect a channel: its scheduled posts are cancelled; what was posted stays in My posts. */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const t = tFor(await getLang());
  const origin = req.headers.get("origin");
  if (origin && origin !== req.nextUrl.origin) return NextResponse.json({ error: t("Please do this from rezekii.com.") }, { status: 403 });
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: t("Sign in first.") }, { status: 401 });
  if (!canUseSocial(user)) return NextResponse.json({ error: t("Not available yet.") }, { status: 403 });
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return NextResponse.json({ error: t("Which channel?") }, { status: 400 });
  if (!(await removeAccount(user.id, id))) return NextResponse.json({ error: t("That channel isn't connected.") }, { status: 404 });
  return NextResponse.json({ ok: true });
}
