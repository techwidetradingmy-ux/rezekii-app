/**
 * Owner-run helper: puts Rezekii's secrets into Vercel (Production) straight from .env.local,
 * so no secret is typed into chat. Prints names only, never values.
 *   - TOKEN_ENCRYPTION_KEY: generated here if missing, saved to .env.local
 *   - Other secrets: if missing or rejected by their service, asked for in a paste box and tested before saving
 *   - TIKTOK_CLIENT_KEY, GOOGLE_CLIENT_ID: public IDs, also copied to Vercel
 * Run:  node scripts/setup-secrets.mjs   (needs the Vercel CLI signed in and this folder linked)
 */
import { readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import { createInterface } from "node:readline";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(root);
const envPath = join(root, ".env.local");
let text = readFileSync(envPath, "utf8");

const line = (k) => new RegExp("^" + k + "=(.*)$", "m");
const get = (k) => { const m = text.match(line(k)); return m ? m[1].trim().replace(/^["']|["']$/g, "") : ""; };
const set = (k, v) => {
  if (line(k).test(text)) text = text.replace(line(k), k + "=" + v);
  else text += (text.endsWith("\n") ? "" : "\n") + k + "=" + v + "\n";
};

if (!get("TOKEN_ENCRYPTION_KEY")) {
  set("TOKEN_ENCRYPTION_KEY", randomBytes(32).toString("base64"));
  writeFileSync(envPath, text);
  console.log("TOKEN_ENCRYPTION_KEY: created and saved in .env.local");
}

/** Shows a normal Windows paste box; falls back to a plain terminal prompt elsewhere. */
function askBox(question) {
  if (process.platform === "win32") {
    const ps = "Add-Type -AssemblyName Microsoft.VisualBasic; [Microsoft.VisualBasic.Interaction]::InputBox('" + question.replace(/'/g, "''") + "', 'Rezekii setup')";
    const r = spawnSync("powershell", ["-NoProfile", "-Command", ps], { encoding: "utf8" });
    return Promise.resolve(String(r.stdout || "").trim());
  }
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question + " ", (answer) => { rl.close(); resolve(answer.trim()); });
  });
}

/** True when Supabase accepts the key (checked against this project's own table). */
async function supabaseKeyWorks(key) {
  const res = await fetch(get("SUPABASE_URL") + "/rest/v1/partner_connections?select=partner_open_id&limit=1", { headers: { apikey: key } });
  return res.ok;
}

/** Posts a form and returns the JSON reply. */
async function postForm(url, fields) {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(fields) });
  return res.json().catch(() => ({}));
}

/** True unless Google says the secret is wrong (a fake code is sent, so a right secret gets "invalid_grant"). */
async function googleSecretWorks(secret) {
  const r = await postForm("https://oauth2.googleapis.com/token", { code: "check", client_id: get("GOOGLE_CLIENT_ID"), client_secret: secret, redirect_uri: "https://rezekii.com/api/auth/google/callback", grant_type: "authorization_code" });
  return r.error !== "invalid_client";
}

// Public IDs: TikTok sandbox "Rezekii Dev" and Google client "Rezekii web".
const PUBLIC_IDS = { TIKTOK_CLIENT_KEY: "sbaw8za4y6wqy3g54u", GOOGLE_CLIENT_ID: "950882525963-24tae5gho3ev8058i7jq4ruvtn1gv13b.apps.googleusercontent.com" };
for (const [k, v] of Object.entries(PUBLIC_IDS)) if (get(k) !== v) set(k, v);
writeFileSync(envPath, text);

const SECRETS = ["TIKTOK_SHOP_APP_SECRET", "SUPABASE_SECRET_KEY", "TOKEN_ENCRYPTION_KEY", "TIKTOK_CLIENT_SECRET", "GOOGLE_CLIENT_SECRET"];
const CHECKS = {
  TIKTOK_SHOP_APP_SECRET: { prompt: "Paste the TikTok Shop app secret (Partner Center > Rezekii app), then click OK." },
  SUPABASE_SECRET_KEY: { prompt: "Paste the NEW Supabase secret key (starts with sb_secret_), then click OK.", works: supabaseKeyWorks, fix: "Create a new secret key in Supabase > Settings > API Keys." },
  TIKTOK_CLIENT_SECRET: { prompt: "Paste the Client secret of the TikTok SANDBOX 'Rezekii Dev' (developers.tiktok.com > Rezekii > Sandbox > App details), then click OK.", current: () => get("TIKTOK_CLIENT_SECRET_FOR") === get("TIKTOK_CLIENT_KEY"), after: () => set("TIKTOK_CLIENT_SECRET_FOR", get("TIKTOK_CLIENT_KEY")) },
  GOOGLE_CLIENT_SECRET: { prompt: "Paste the Client secret of the Google client 'Rezekii web' (Google Cloud > Google Auth Platform > Clients > Rezekii web, copy icon), then click OK.", works: googleSecretWorks, fix: "Copy it again from the Rezekii web client page." },
};
// Asks only when a secret is missing, rejected by its service, or saved for a different app (the TikTok sandbox secret
// can't be tested without a real sign-in, so the helper remembers which client key it was saved for).
for (const k of SECRETS.filter((x) => CHECKS[x])) {
  const { prompt, works, fix, current, after } = CHECKS[k];
  if (get(k) && (!works || (await works(get(k)))) && (!current || current())) continue;
  const v = await askBox(prompt);
  if (!v) { console.log(k + ": nothing pasted. Run this again when you have it."); process.exit(1); }
  if (works && !(await works(v))) { console.log(k + ": the service says that value is not valid. " + fix + " Nothing was saved."); process.exit(1); }
  set(k, v);
  after?.();
  writeFileSync(envPath, text);
  console.log(k + ": saved in .env.local");
}

let failed = 0;
const push = (k, sensitive) => {
  const args = ["env", "add", k, "production", ...(sensitive ? ["--sensitive"] : []), "--yes", "--force"];
  const r = spawnSync("vercel", args, { input: get(k), encoding: "utf8", shell: true, timeout: 60000 });
  if (r.status === 0) console.log(k + ": saved in Vercel (Production)");
  else { failed++; console.log(k + ": FAILED. " + String(r.stderr || r.stdout || "").split("\n").filter(Boolean).slice(-2).join(" ")); }
};
for (const k of Object.keys(PUBLIC_IDS)) push(k, false);
for (const k of SECRETS) push(k, true);
console.log(failed ? "Some values failed. Tell Claude what it says." : "All done. Tell Claude \"secrets done\".");
