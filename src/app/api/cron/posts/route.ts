import { NextResponse, type NextRequest } from "next/server";
import { checkProcessing, publishPost } from "@/modules/posting/publisher.ts";
import { claimDuePosts, isTimerToken, processingPosts } from "@/modules/posting/store.ts";
import { accountsForPictures, accountsToRenew, freshToken, refreshPicture } from "@/modules/social/accounts.ts";
import { checkSocialProcessing, checkStillLive, postFirstComment, publishSocialPost } from "@/modules/social/publisher.ts";
import { claimDueSocialPosts, pendingComments, postedToCheck, processingSocialPosts } from "@/modules/social/store.ts";

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
  const social = await socialWork().catch((err) => ({ error: err instanceof Error ? err.message : String(err) }));
  return NextResponse.json({ published, checked, social });
}

/** Facebook, Instagram and Threads posts on the same timer: due posts, posts being processed, first comments, token renewals, profile pictures, and whether posted posts still exist. */
async function socialWork(): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  const run = async (key: string, fn: () => Promise<string>) => {
    try {
      out[key] = await fn();
    } catch (err) {
      out[key] = "error: " + (err instanceof Error ? err.message : String(err));
    }
  };
  for (const p of await claimDueSocialPosts(2)) await run(`publish ${p.id}`, () => publishSocialPost(p));
  for (const p of await processingSocialPosts(20)) await run(`check ${p.id}`, () => checkSocialProcessing(p));
  for (const p of await pendingComments(10)) await run(`comment ${p.id}`, () => postFirstComment(p));
  for (const a of await accountsToRenew(5)) await run(`renew ${a.id}`, async () => (await freshToken(a), "renewed"));
  for (const a of await accountsForPictures(5)) await run(`picture ${a.id}`, () => refreshPicture(a));
  for (const p of await postedToCheck(5)) await run(`live ${p.id}`, () => checkStillLive(p));
  return out;
}
