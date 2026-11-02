import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { getUserPost, updatePost } from "@/modules/posting/store.ts";
import { chargeRetry } from "@/modules/rewards/post-credits.ts";
import { getLang, tFor } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

/** Try again (M4): a failed post goes back on the timer straight away, with fresh tries. Its video was kept when it failed. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const t = tFor(await getLang());
  const origin = req.headers.get("origin");
  if (origin && origin !== req.nextUrl.origin) return NextResponse.json({ error: t("Please do this from rezekii.com.") }, { status: 403 });
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: t("Sign in first.") }, { status: 401 });
  const post = await getUserPost(user.id, (await params).id);
  if (!post) return NextResponse.json({ error: t("Post not found.") }, { status: 404 });
  if (post.status !== "failed") return NextResponse.json({ error: t("Only a failed post can be tried again.") }, { status: 409 });
  // Its credits came back when it failed; trying again costs them again.
  if (!(await chargeRetry(user.id, { id: post.id, app: "tiktok" }, "creator"))) return NextResponse.json({ error: t("Not enough credits to try again.") }, { status: 402 });
  await updatePost(post.id, { status: "scheduled", next_attempt_at: new Date().toISOString(), attempts: 0, last_error: null });
  return NextResponse.json({ ok: true });
}
