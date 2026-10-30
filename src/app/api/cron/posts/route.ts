import { NextResponse, type NextRequest } from "next/server";
import { checkProcessing, publishPost } from "@/modules/posting/publisher.ts";
import { claimDuePosts, isTimerToken, processingPosts } from "@/modules/posting/store.ts";
import { renewShop, renewShopee, shopeeToRenew, shopsToRenew } from "@/modules/shopee/connections.ts";
import { accountsForPictures, accountsToRenew, freshToken, refreshPicture } from "@/modules/social/accounts.ts";
import { checkSocialProcessing, checkStillLive, postFirstComment, publishSocialPost } from "@/modules/social/publisher.ts";
import { claimDueSocialPosts, pendingComments, postedToCheck, processingSocialPosts } from "@/modules/social/store.ts";

export const dynamic = "force-dynamic";
// A video upload to TikTok can take a while; 300 s is the Hobby plan's maximum.
export const maxDuration = 300;

/**
 * Called by the Supabase timer (pg_cron + pg_net) with the token kept in Supabase Vault: every minute while posting work is
 * waiting, and every quarter hour anyway for the upkeep below (see posting_work_due). TikTok (up to 2 due
 * posts, then the ones it's processing) and Facebook, Instagram and Threads run side by side, so a slow TikTok upload
 * doesn't hold the others up.
 */
export async function POST(req: NextRequest) {
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!(await isTimerToken(token))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const [{ published, checked }, social] = await Promise.all([tiktokWork(), socialWork().catch((err) => ({ error: err instanceof Error ? err.message : String(err) }))]);
  return NextResponse.json({ published, checked, social });
}

async function tiktokWork(): Promise<{ published: Record<string, string>; checked: Record<string, string> }> {
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
  return { published, checked };
}

/** Facebook, Instagram and Threads posts on the same timer: due posts, posts being processed, first comments, token renewals (Shopee's too), profile pictures, and whether posted posts still exist. */
async function socialWork(): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  const run = async (key: string, fn: () => Promise<string>) => {
    try {
      out[key] = await fn();
    } catch (err) {
      out[key] = "error: " + (err instanceof Error ? err.message : String(err));
    }
  };
  // Up to 10 due channels a minute, started together: a post to several Pages doesn't queue minute by minute (M8).
  await Promise.all((await claimDueSocialPosts(10)).map((p) => run(`publish ${p.id}`, () => publishSocialPost(p))));
  for (const p of await processingSocialPosts(20)) await run(`check ${p.id}`, () => checkSocialProcessing(p));
  for (const p of await pendingComments(10)) await run(`comment ${p.id}`, () => postFirstComment(p));
  for (const a of await accountsToRenew(5)) await run(`renew ${a.id}`, async () => (await freshToken(a), "renewed"));
  for (const c of await shopeeToRenew(5)) await run(`shopee ${c.id}`, async () => (await renewShopee(c), "renewed"));
  for (const c of await shopsToRenew(5)) await run(`shop ${c.id}`, async () => (await renewShop(c), "renewed"));
  for (const a of await accountsForPictures(5)) await run(`picture ${a.id}`, () => refreshPicture(a));
  for (const p of await postedToCheck(5)) await run(`live ${p.id}`, () => checkStillLive(p));
  return out;
}
