import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { cancelSample } from "@/modules/tap/samples.ts";
import { getLang, tFor } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

/** Cancels the creator's own request while Techwide has not applied for it yet. */
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const t = tFor(await getLang());
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: t("Sign in first.") }, { status: 401 });
  const ok = await cancelSample(user.id, (await ctx.params).id);
  return ok ? NextResponse.json({ ok }) : NextResponse.json({ error: t("This request can no longer be cancelled.") }, { status: 409 });
}
