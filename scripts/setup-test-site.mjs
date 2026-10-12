/**
 * Owner-run helper for the TEST site (Vercel project "rezekii-test", Supabase project "rezekii-test").
 * Asks for the test database's secret key in a paste box (tested first), keeps test values in .env.test.local,
 * copies the sign-in values (TikTok sandbox, Google) from .env.local, and saves them all in the test site's Vercel settings.
 * Prints names only, never values.
 * Run:  node scripts/setup-test-site.mjs   (needs the Vercel CLI signed in)
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(root);
const TEST_DB = "https://mltcjrvevmppthhtgtnl.supabase.co";
const TEST_SITE = "https://rezekii-test.vercel.app";
const VERCEL = { VERCEL_PROJECT_ID: "prj_yZKlH2i0kNNMNsMsmN7pYqpqFmSc", VERCEL_ORG_ID: "team_Mvi920gyiEoZy7C8820jlm7q" };

const parse = (text) => Object.fromEntries(text.split(/\r?\n/).map((l) => l.match(/^([A-Z0-9_]+)=(.*)$/)).filter(Boolean).map((m) => [m[1], m[2].trim().replace(/^["']|["']$/g, "")]));
const live = parse(readFileSync(".env.local", "utf8"));
const testPath = ".env.test.local";
const test = existsSync(testPath) ? parse(readFileSync(testPath, "utf8")) : {};
const save = () => writeFileSync(testPath, Object.entries(test).map(([k, v]) => `${k}=${v}`).join("\n") + "\n");

/** A normal Windows paste box. */
function askBox(question) {
  const ps = "Add-Type -AssemblyName Microsoft.VisualBasic; [Microsoft.VisualBasic.Interaction]::InputBox('" + question.replace(/'/g, "''") + "', 'Rezekii test site')";
  return String(spawnSync("powershell", ["-NoProfile", "-Command", ps], { encoding: "utf8" }).stdout || "").trim();
}

/** True when the test database accepts the key (checked against the posts table). */
async function testKeyWorks(key) {
  const res = await fetch(`${TEST_DB}/rest/v1/posts?select=id&limit=1`, { headers: { apikey: key } });
  return res.ok;
}

test.SUPABASE_URL = TEST_DB;
test.APP_URL ||= TEST_SITE;
test.TOKEN_ENCRYPTION_KEY ||= randomBytes(32).toString("base64");
if (!test.SUPABASE_SECRET_KEY || !(await testKeyWorks(test.SUPABASE_SECRET_KEY))) {
  const v = askBox("Paste the secret key of the Supabase project 'rezekii-test' (starts with sb_secret_), then click OK.");
  if (!v) { console.log("Nothing pasted. Run this again when you have the key."); process.exit(1); }
  if (!(await testKeyWorks(v))) { console.log("The test database says that key is not valid. Copy it again from rezekii-test > Project Settings > API Keys. Nothing was saved."); process.exit(1); }
  test.SUPABASE_SECRET_KEY = v;
}
save();
console.log("Test values saved in .env.test.local");

const SHARED = ["TIKTOK_CLIENT_KEY", "TIKTOK_CLIENT_SECRET", "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "ADMIN_EMAILS"];
const values = { ...Object.fromEntries(SHARED.filter((k) => live[k]).map((k) => [k, live[k]])), SUPABASE_URL: test.SUPABASE_URL, SUPABASE_SECRET_KEY: test.SUPABASE_SECRET_KEY, TOKEN_ENCRYPTION_KEY: test.TOKEN_ENCRYPTION_KEY, APP_URL: test.APP_URL };
const PUBLIC = new Set(["TIKTOK_CLIENT_KEY", "GOOGLE_CLIENT_ID", "ADMIN_EMAILS", "SUPABASE_URL", "APP_URL"]);
let failed = 0;
for (const [k, v] of Object.entries(values)) {
  const args = ["env", "add", k, "production", ...(PUBLIC.has(k) ? [] : ["--sensitive"]), "--yes", "--force"];
  const r = spawnSync("vercel", args, { input: v, encoding: "utf8", shell: true, timeout: 60000, env: { ...process.env, ...VERCEL } });
  if (r.status === 0) console.log(`${k}: saved in the test site`);
  else { failed++; console.log(`${k}: FAILED. ` + String(r.stderr || r.stdout || "").split("\n").filter(Boolean).slice(-2).join(" ")); }
}
console.log(failed ? "Some values failed. Tell Claude what it says." : 'All done. Tell Claude "test key done".');
