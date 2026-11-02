import { supabaseRest } from "../../integrations/supabase/rest.ts";
import { layout, sendEmail } from "../../integrations/email/resend.ts";
import { logActivity } from "../admin/admins.ts";

/**
 * Beta sign-up approval (owner, 2 Nov 2026: "capped at 50 users now, as our beta testing phase… approve if any users sign up").
 * Every new account waits on a "You're on the list" screen until Techwide lets it in, separately for the creator and the seller
 * app. Creators: 50 places (app_settings beta_cap); once they're taken, new creators are on the waitlist. Sellers can sign up
 * but always wait on the waitlist. Accounts made before the beta were let in by the migration and don't take a place.
 */
export type BetaSide = "creator" | "seller";
export type BetaStatus = "approved" | "waiting" | "waitlist" | "declined";
export type BetaState = { status: BetaStatus; place: number | null; taken: number; cap: number; reason: string | null; group: string | null };
type Row = { user_id: string; side: BetaSide; status: "waiting" | "approved" | "declined"; requested_at: string; decided_at: string | null; decided_by: string | null; reason: string | null; group_at: string | null };

export const BEFORE_BETA = "before beta";
const DEFAULT_CAP = 50;

const count = async (path: string) => {
  const res = await supabaseRest(path, { headers: { prefer: "count=exact", range: "0-0" } });
  return Number((res.headers.get("content-range") ?? "*/0").split("/")[1]) || 0;
};
const setting = async <T>(key: string): Promise<T | null> => {
  const [row] = (await (await supabaseRest(`app_settings?key=eq.${key}&select=value&limit=1`)).json().catch(() => [])) as { value: T }[];
  return row?.value ?? null;
};

/** The number of creator places and the WhatsApp group link (set in Admin → Users → Review). */
export async function betaSettings(): Promise<{ cap: number; group: string | null }> {
  const [cap, group] = await Promise.all([setting<number>("beta_cap"), setting<string>("beta_group")]);
  return { cap: typeof cap === "number" && cap >= 0 ? cap : DEFAULT_CAP, group: typeof group === "string" && group.trim() ? group.trim() : null };
}

export async function setBetaSettings(s: { cap: number; group: string }, userId: string, actor: string): Promise<void> {
  const save = (key: string, value: unknown) =>
    supabaseRest("app_settings?on_conflict=key", { method: "POST", headers: { prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify({ key, value, updated_at: new Date().toISOString(), updated_by: userId }) });
  await Promise.all([save("beta_cap", s.cap), save("beta_group", s.group.trim())]);
  await logActivity(actor, "Creators", `set the beta to ${s.cap} creator places`);
}

/** Creators let in through the beta (accounts from before the beta don't count). */
export const placesTaken = () => count(`beta_access?side=eq.creator&status=eq.approved&decided_by=neq.${encodeURIComponent(BEFORE_BETA)}&select=user_id`);

export async function betaRows(userId: string): Promise<Row[]> {
  return (await (await supabaseRest(`beta_access?user_id=eq.${userId}&select=*`)).json().catch(() => [])) as Row[];
}

/** Where one account stands on one side; null when it hasn't asked yet. */
export async function betaState(row: Row | undefined): Promise<BetaState | null> {
  if (!row) return null;
  // Let in: nothing more to look up (this runs on every page).
  if (row.status === "approved") return { status: "approved", place: null, taken: 0, cap: 0, reason: null, group: null };
  const [{ cap, group }, taken] = await Promise.all([betaSettings(), placesTaken()]);
  if (row.status === "declined") return { status: "declined", place: null, taken, cap, reason: row.reason, group };
  const ahead = await count(`beta_access?side=eq.${row.side}&status=eq.waiting&requested_at=lt.${encodeURIComponent(row.requested_at)}&select=user_id`);
  const full = row.side === "seller" || taken >= cap;
  return { status: full ? "waitlist" : "waiting", place: ahead + 1, taken, cap, reason: null, group };
}

/** A new account opens the creator or seller app for the first time: it joins the queue (an earlier place is kept). */
export async function joinBeta(userId: string, side: BetaSide): Promise<BetaState | null> {
  await supabaseRest("beta_access?on_conflict=user_id,side", { method: "POST", headers: { prefer: "resolution=ignore-duplicates,return=minimal" }, body: JSON.stringify({ user_id: userId, side, status: "waiting" }) });
  return betaState((await betaRows(userId)).find((r) => r.side === side));
}

/** They tapped Join Our WhatsApp Group (shown to admins next to their name). */
export async function tappedGroup(userId: string, side: BetaSide): Promise<void> {
  await supabaseRest(`beta_access?user_id=eq.${userId}&side=eq.${side}&group_at=is.null`, { method: "PATCH", headers: { prefer: "return=minimal" }, body: JSON.stringify({ group_at: new Date().toISOString() }) });
}

/** True when the account may use that side of Rezekii (admins always may). */
export async function betaApproved(user: { id: string; role: string }, side: BetaSide): Promise<boolean> {
  if (user.role === "admin") return true;
  return (await betaRows(user.id)).some((r) => r.side === side && r.status === "approved");
}

export type BetaPerson = Row & { name: string; email: string | null; whatsapp: string | null; handle: string | null };

/** Everyone who signed up during the beta, newest first, with how to reach them (admins only). */
export async function betaList(): Promise<{ people: BetaPerson[]; taken: number; cap: number; group: string | null }> {
  const [rows, taken, s] = await Promise.all([
    (await supabaseRest(`beta_access?or=${encodeURIComponent(`(decided_by.is.null,decided_by.neq."${BEFORE_BETA}")`)}&select=*&order=requested_at.desc&limit=1000`)).json().catch(() => []) as Promise<Row[]>,
    placesTaken(),
    betaSettings(),
  ]);
  const ids = [...new Set(rows.map((r) => r.user_id))];
  const who = new Map<string, { name: string; email: string | null; whatsapp: string | null; handle: string | null }>();
  for (let i = 0; i < ids.length; i += 150) {
    const part = ids.slice(i, i + 150).join(",");
    const [users, profiles] = await Promise.all([
      supabaseRest(`app_users?id=in.(${part})&select=id,display_name,email,login_email,tiktok_username`).then((r) => r.json() as Promise<{ id: string; display_name: string | null; email: string | null; login_email: string | null; tiktok_username: string | null }[]>),
      supabaseRest(`profiles?user_id=in.(${part})&select=user_id,details`).then((r) => r.json() as Promise<{ user_id: string; details: { name?: string; whatsapp?: string; phone?: string } | null }[]>),
    ]);
    const prof = new Map(profiles.map((p) => [p.user_id, p.details]));
    for (const u of users) {
      const d = prof.get(u.id);
      const email = u.email ?? u.login_email;
      who.set(u.id, { name: d?.name?.trim() || u.display_name || email?.split("@")[0] || "Someone", email, whatsapp: d?.whatsapp || d?.phone || null, handle: u.tiktok_username });
    }
  }
  return { people: rows.map((r) => ({ ...r, ...(who.get(r.user_id) ?? { name: "Someone", email: null, whatsapp: null, handle: null }) })), taken, cap: s.cap, group: s.group };
}

/** Lets an account in or declines it, then emails them. Creators can't be let in past the limit. */
export async function decideBeta(userId: string, side: BetaSide, approve: boolean, reason: string, actor: string): Promise<{ ok: true; emailed: boolean } | { ok: false; error: string }> {
  const [row] = (await (await supabaseRest(`beta_access?user_id=eq.${userId}&side=eq.${side}&select=*&limit=1`)).json()) as Row[];
  if (!row) return { ok: false, error: "This sign-up isn't in the list any more." };
  if (approve && side === "creator" && row.status !== "approved") {
    const [taken, { cap }] = await Promise.all([placesTaken(), betaSettings()]);
    if (taken >= cap) return { ok: false, error: `All ${cap} creator places are taken. Raise the limit first.` };
  }
  const res = await supabaseRest(`beta_access?user_id=eq.${userId}&side=eq.${side}`, {
    method: "PATCH",
    headers: { prefer: "return=minimal" },
    body: JSON.stringify({ status: approve ? "approved" : "declined", decided_at: new Date().toISOString(), decided_by: actor, reason: approve ? null : reason.trim().slice(0, 300) || null }),
  });
  if (!res.ok) return { ok: false, error: "Didn't save. Please try again." };
  await logActivity(actor, "Creators", `${approve ? "let in" : "declined"} a ${side} sign-up for the beta`);
  const [u] = (await (await supabaseRest(`app_users?id=eq.${userId}&select=email,login_email&limit=1`)).json().catch(() => [])) as { email: string | null; login_email: string | null }[];
  const to = u?.email ?? u?.login_email;
  if (to) {
    const base = process.env.APP_URL ?? "https://rezekii.com";
    await sendEmail({
      to,
      subject: approve ? "You're in: welcome to Rezekii" : "About your Rezekii sign-up",
      ...layout(
        approve
          ? { title: "You're in", lines: [`Your ${side} account is ready. Open Rezekii to get started.`], button: { label: "Open Rezekii", href: `${base}${side === "seller" ? "/seller/app" : "/app"}` } }
          : { title: "About your sign-up", lines: ["We can't let you into the Rezekii beta this time.", ...(reason.trim() ? [reason.trim()] : []), "Questions? Reply to this email or message us on WhatsApp: 011-7019 3374."] },
      ),
    }).catch((err) => console.error("[beta email]", err instanceof Error ? err.message : err));
  }
  return { ok: true, emailed: !!to };
}
