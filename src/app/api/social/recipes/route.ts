import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { canUseSocial } from "@/modules/social/access.ts";
import { loadRecipe, saveRecipe } from "@/modules/social/recipes.ts";
import { getLang, tFor } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

/** Reuse (owner, 21 Nov 2026, as on rezekii.com): ?key= one of her posts gives back what was typed for it and when it went out. */
export async function GET(req: NextRequest) {
  const t = tFor(await getLang());
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: t("Sign in first.") }, { status: 401 });
  if (!canUseSocial(user)) return NextResponse.json({ error: t("Not available yet.") }, { status: 403 });
  const found = await loadRecipe(user.id, req.nextUrl.searchParams.get("key") ?? "").catch(() => null);
  return found
    ? NextResponse.json(found, { headers: { "cache-control": "private, no-store" } })
    : NextResponse.json({ error: t("That post wasn't found.") }, { status: 404 });
}

/** Keeps what was typed in New post with the post it made, for Reuse (M7): { key (group or TikTok post id), recipe }. */
export async function POST(req: NextRequest) {
  const t = tFor(await getLang());
  const origin = req.headers.get("origin");
  if (origin && origin !== req.nextUrl.origin) return NextResponse.json({ error: t("Please do this from rezekii.com.") }, { status: 403 });
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: t("Sign in first.") }, { status: 401 });
  if (!canUseSocial(user)) return NextResponse.json({ error: t("Not available yet.") }, { status: 403 });
  const b = (await req.json().catch(() => ({}))) as { key?: string; recipe?: unknown };
  const ok = await saveRecipe(user.id, String(b.key ?? ""), b.recipe);
  return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: t("That post wasn't found.") }, { status: 404 });
}
