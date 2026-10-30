import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { canUseSocial } from "@/modules/social/access.ts";
import { saveRecipe } from "@/modules/social/recipes.ts";

export const dynamic = "force-dynamic";

/** Keeps what was typed in New post with the post it made, for Reuse (M7): { key (group or TikTok post id), recipe }. */
export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (origin && origin !== req.nextUrl.origin) return NextResponse.json({ error: "Please do this from rezekii.com." }, { status: 403 });
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (!canUseSocial(user)) return NextResponse.json({ error: "Not available yet." }, { status: 403 });
  const b = (await req.json().catch(() => ({}))) as { key?: string; recipe?: unknown };
  const ok = await saveRecipe(user.id, String(b.key ?? ""), b.recipe);
  return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "That post wasn't found." }, { status: 404 });
}
