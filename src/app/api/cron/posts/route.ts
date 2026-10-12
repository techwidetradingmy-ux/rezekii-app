import { NextResponse, type NextRequest } from "next/server";
import { checkProcessing, publishPost } from "@/modules/posting/publisher.ts";
import { claimDuePosts, isTimerToken, processingPosts } from "@/modules/posting/store.ts";

export const dynamic = "force-dynamic";
// A video upload to TikTok can take a while; 300 s is the Hobby plan's maximum.
export const maxDuration = 300;

/**
 * Called every minute by the Supabase timer (pg_cron + pg_net) with the token kept in Supabase Vault.
 * Publishes up to 2 due posts, then checks posts TikTok is still processing.
 */
export async function POST(req: NextRequest) {
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!(await isTimerToken(token))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const published: Record<string, string> = {};
  for (const post of await claimDuePosts(2)) published[post.id] = await publishPost(post);
  const checked: Record<string, string> = {};
  for (const post of await processingPosts(20)) {
    try {
      checked[post.id] = await checkProcessing(post);
    } catch (err) {
      checked[post.id] = "error: " + (err instanceof Error ? err.message : String(err));
    }
  }
  return NextResponse.json({ published, checked });
}
