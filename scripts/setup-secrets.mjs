/**
 * Owner-run helper: puts the v0.1 secrets into Vercel (Production) straight from .env.local,
 * so no secret is typed into chat. Prints names only, never values.
 *   - TOKEN_ENCRYPTION_KEY: generated here if missing, saved to .env.local
 *   - TIKTOK_SHOP_APP_SECRET, SUPABASE_SECRET_KEY: if missing, asked for in a paste box (the Supabase key is tested first)
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

const SECRETS = ["TIKTOK_SHOP_APP_SECRET", "SUPABASE_SECRET_KEY", "TOKEN_ENCRYPTION_KEY"];
const PROMPTS = {
  TIKTOK_SHOP_APP_SECRET: "Paste the TikTok Shop app secret (Partner Center > Rezekii app), then click OK.",
  SUPABASE_SECRET_KEY: "Paste the NEW Supabase secret key (starts with sb_secret_), then click OK.",
};
for (const k of SECRETS.filter((x) => !get(x) && PROMPTS[x])) {
  const v = await askBox(PROMPTS[k]);
  if (!v) { console.log(k + ": nothing pasted. Run this again when you have it."); process.exit(1); }
  if (k === "SUPABASE_SECRET_KEY" && !(await supabaseKeyWorks(v))) {
    console.log("Supabase says that key is not valid (old or deleted). Create a new secret key in Supabase > Settings > API Keys, then run this again. Nothing was saved.");
    process.exit(1);
  }
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
