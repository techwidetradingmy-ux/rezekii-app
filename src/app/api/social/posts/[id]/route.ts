import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { canUseSocial } from "@/modules/social/access.ts";
import { cleanUpGroup, getUserSocialPost, updateSocialPost, videoStillStored } from "@/modules/social/store.ts";

export const dynamic = "force-dynamic";

/**
 * Actions on one channel post: { action: "cancel" } until it starts posting, "link-done" once the Shopee product link was
 * added in Facebook, "retry-comment" when the first comment failed, "retry" to try a failed post again (M4).
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const origin = req.headers.get("origin");
  if (origin && origin !== req.nextUrl.origin) return NextResponse.json({ error: "Please do this from rezekii.com." }, { status: 403 });
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (!canUseSocial(user)) return NextResponse.json({ error: "Not available yet." }, { status: 403 });
  const { id } = await params;
  const post = /^[0-9a-f-]{36}$/.test(id) ? await getUserSocialPost(user.id, id) : null;
  if (!post) return NextResponse.json({ error: "That post wasn't found." }, { status: 404 });
  const { action } = (await req.json().catch(() => ({}))) as { action?: string };
  if (action === "cancel") {
    if (post.status !== "scheduled" && post.status !== "draft" && post.status !== "failed") return NextResponse.json({ error: "It has already started posting, so it can't be cancelled." }, { status: 409 });
    await updateSocialPost(id, { status: "cancelled", next_attempt_at: null });
    await cleanUpGroup(post.group_id);
    return NextResponse.json({ ok: true });
  }
  if (action === "link-done") {
    await updateSocialPost(id, { link_done: true });
    return NextResponse.json({ ok: true });
  }
  if (action === "retry") {
    if (post.status !== "failed") return NextResponse.json({ error: "Only a failed post can be tried again." }, { status: 409 });
    if (post.storage_path && !(await videoStillStored(post.storage_path))) return NextResponse.json({ error: "The video for this post isn't stored any more. Make a new post with it." }, { status: 409 });
    await updateSocialPost(id, { status: "scheduled", next_attempt_at: new Date().toISOString(), attempts: 0, last_error: null, container_id: null });
    return NextResponse.json({ ok: true });
  }
  if (action === "retry-comment") {
    if (post.status !== "posted" || post.comment_status !== "failed") return NextResponse.json({ error: "There's no failed comment to retry." }, { status: 409 });
    await updateSocialPost(id, { comment_status: "pending", comment_error: null });
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
