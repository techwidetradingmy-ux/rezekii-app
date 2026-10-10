/**
 * Owner-run helper: puts the v0.1 secrets into Vercel (Production) straight from .env.local,
 * so no secret is typed into chat or shown on screen. Prints names only, never values.
 *   - TOKEN_ENCRYPTION_KEY: generated here if missing, saved to .env.local
 *   - TIKTOK_SHOP_APP_SECRET, SUPABASE_SECRET_KEY: read from .env.local (paste them there first)
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

/** Asks in the terminal without showing what is typed or pasted. */
function askHidden(question) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl.stdoutMuted = false;
    rl._writeToOutput = (s) => { if (!rl.stdoutMuted) rl.output.write(s); };
    rl.question(question, (answer) => { rl.close(); process.stdout.write("\n"); resolve(answer.trim()); });
    rl.stdoutMuted = true;
  });
}

const SECRETS = ["TIKTOK_SHOP_APP_SECRET", "SUPABASE_SECRET_KEY", "TOKEN_ENCRYPTION_KEY"];
const PROMPTS = {
  TIKTOK_SHOP_APP_SECRET: "Paste the TikTok Shop app secret (Partner Center → Rezekii app) and press Enter. It won't show: ",
  SUPABASE_SECRET_KEY: "Paste the NEW Supabase secret key (starts with sb_secret_) and press Enter. It won't show: ",
};
for (const k of SECRETS.filter((x) => !get(x) && PROMPTS[x])) {
  const v = await askHidden(PROMPTS[k]);
  if (!v) { console.log(k + ": nothing pasted. Run this again when you have it."); process.exit(1); }
  set(k, v);
  writeFileSync(envPath, text);
  console.log(k + ": saved in .env.local");
}

let failed = 0;
for (const k of SECRETS) {
  const r = spawnSync("vercel", ["env", "add", k, "production", "--sensitive", "--yes", "--force"], { input: get(k), encoding: "utf8", shell: true });
  if (r.status === 0) console.log(k + ": saved in Vercel (Production)");
  else { failed++; console.log(k + ": FAILED. " + String(r.stderr || r.stdout || "").split("\n").filter(Boolean).slice(-2).join(" ")); }
}
console.log(failed ? "Some values failed. Tell Claude what it says." : "All 3 secrets are in Vercel. Tell Claude \"secrets done\".");
