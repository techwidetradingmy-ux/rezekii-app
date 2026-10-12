import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { getUserPost, updatePost } from "@/modules/posting/store.ts";

export const dynamic = "force-dynamic";

/** Cancels a scheduled (or failed) post before it goes out; the video stays in Drafts. */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const post = await getUserPost(user.id, (await params).id);
  if (!post) return NextResponse.json({ error: "Post not found." }, { status: 404 });
  if (!["scheduled", "failed"].includes(post.status)) return NextResponse.json({ error: "This post is already being sent to TikTok and can't be cancelled." }, { status: 409 });
  await updatePost(post.id, { status: "draft", scheduled_at: null, next_attempt_at: null, attempts: 0 });
  return NextResponse.json({ ok: true });
}
