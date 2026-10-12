/**
 * Test-copy proof: schedules ONE private ("Only me") video post for a sandbox creator who has signed in to the test site,
 * then lets the every-minute timer publish it. Same steps as the New post screen: fresh creator info, TikTok's rules,
 * upload to storage, scheduled "now".
 *
 *   node --env-file=.env.local --env-file=.env.test.local scripts/proof-post.ts --handle tinawellnesshacks --file <video.mp4> [--caption "…"]
 *   node --env-file=.env.local --env-file=.env.test.local scripts/proof-post.ts --status <post id>
 */
import { readFileSync, statSync } from "node:fs";
import { supabaseRest } from "../src/integrations/supabase/rest.ts";
import { queryCreatorInfo } from "../src/integrations/tiktok/posting.ts";
import { signedUploadUrl } from "../src/modules/posting/media.ts";
import { postProblems, type PostChoice } from "../src/modules/posting/rules.ts";
import { freshTikTokToken, insertPost } from "../src/modules/posting/store.ts";
import { fail } from "./proof-lib.ts";

const args = process.argv.slice(2);
const flag = (n: string) => { const i = args.indexOf("--" + n); return i >= 0 ? args[i + 1] : undefined; };
if (!process.env.SUPABASE_URL?.includes("mltcjrvevmppthhtgtnl")) fail("This proof only runs against the TEST database (load .env.test.local last).");

const statusId = flag("status");
if (statusId) {
  const res = await supabaseRest(`posts?id=eq.${statusId}&select=status,attempts,publish_id,tiktok_post_id,last_error,posted_at,storage_path`);
  console.log(JSON.stringify((await res.json())[0] ?? "not found", null, 2));
  process.exit(0);
}

const handle = flag("handle");
const file = flag("file");
if (!handle || !file) fail("Give --handle <tiktok username> and --file <video.mp4>.");
const conn = ((await (await supabaseRest(`tiktok_connections?username=eq.${encodeURIComponent(handle)}&select=open_id,user_id`)).json()) as { open_id: string; user_id: string }[])[0];
if (!conn) fail(`@${handle} hasn't signed in to the test site yet (rezekii-test.vercel.app → Continue with TikTok).`);

const info = await queryCreatorInfo(await freshTikTokToken(conn.open_id));
if (info.error || !info.data) fail(`Creator info failed: ${info.error?.code} ${info.error?.message} (log ${info.error?.logId})`);
console.log("Creator info:", { nickname: info.data.creator_nickname, privacy: info.data.privacy_level_options, maxSec: info.data.max_video_post_duration_sec });

// The owner approved a private test post, so "Only me" is chosen explicitly (never a default).
const choice: PostChoice = { mode: "direct", caption: flag("caption") ?? "Rezekii test post (private)", privacyLevel: "SELF_ONLY", allowComments: false, allowDuet: false, allowStitch: false, promo: false, brandOrganic: false, brandedContent: false, isAigc: false, durationSec: Number(flag("seconds") ?? 0) || null };
const problems = postProblems(choice, info.data);
if (problems.length) fail("TikTok's rules say no: " + problems.join(" "));

const size = statSync(file).size;
const path = `${conn.user_id}/proof-${Date.now()}.mp4`;
const put = await fetch(await signedUploadUrl(path), { method: "PUT", headers: { "content-type": "video/mp4", "x-upsert": "false" }, body: readFileSync(file) });
if (!put.ok) fail(`Upload to storage failed: HTTP ${put.status} ${(await put.text()).slice(0, 200)}`);
console.log(`Uploaded ${(size / 1048576).toFixed(1)} MB to storage: ${path}`);

const now = new Date().toISOString();
const post = await insertPost({ user_id: conn.user_id, tiktok_open_id: conn.open_id, mode: "direct", source: "upload", storage_path: path, video_size: size, duration_sec: choice.durationSec ?? null, caption: choice.caption, privacy_level: "SELF_ONLY", status: "scheduled", scheduled_at: now, next_attempt_at: now });
console.log(`Scheduled post ${post.id} for now. The timer picks it up within a minute. Check with: --status ${post.id}`);
