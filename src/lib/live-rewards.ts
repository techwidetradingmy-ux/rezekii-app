"use client";

import type { Mission } from "@/components/missions-board";

/**
 * Rewards on real data for signed-in accounts (owner, 31 Oct 2026): missions, wallet, referral and saved profile, from
 * /api/v2/rewards and /api/v2/profile. The screens keep their design; signed out they show sample data.
 */

export type Side = "creator" | "seller";
type State = { id: string; reward: number; state: Mission["state"]; progress?: [number, number] };
export type LiveBoard = {
  credits: number; streak: number; countedToday: boolean; week: { on: boolean[]; today: number };
  daily: State[]; starter: State[]; starterLeft: number; milestones: State[];
};
export type LiveClaim = { board: LiveBoard; gained: number; chest: number | null; tier: { days: number; bonus: number } | null };
export type LiveWallet = { balance: number; streak: number; expiring: { amount: number; on: string } | null; history: { at: string; what: string; amount: number; kind: string }[] };
export type LiveReferral = { code: string; link: string; friends: { name: string; joined: string; successful: boolean; next: string | null }[]; reward: { inviter: number; friend: number }; days: number };

const get = async <T,>(url: string): Promise<T> => {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(((await r.json().catch(() => ({}))) as { error?: string }).error ?? "Couldn't load. Please try again.");
  return r.json();
};
const post = async <T,>(url: string, body: unknown): Promise<T> => {
  const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const j = (await r.json().catch(() => ({}))) as T & { error?: string };
  if (!r.ok) throw new Error(j.error ?? "Didn't go through. Please try again.");
  return j;
};

export const loadBoard = (side: Side) => get<LiveBoard>(`/api/v2/rewards?part=missions&side=${side}`);
export const claimMission = (side: Side, id: string) => post<LiveClaim>("/api/v2/rewards", { action: "claim", side, id });
export const loadWallet = (side: Side) => get<LiveWallet>(`/api/v2/rewards?part=wallet&side=${side}`);
export const loadReferral = (side: Side) => get<LiveReferral>(`/api/v2/rewards?part=referral&side=${side}`);
/** Today's results were opened (a seller daily mission). */
export const recordResults = () => post("/api/v2/rewards", { action: "event", kind: "results" }).catch(() => null);
/** A friend's code typed at sign-up, kept for the sign-up that follows. */
export const keepInviteCode = (code: string, side: Side) => post<{ ok: boolean; code: string }>("/api/v2/referral", { code, side });

export const loadProfile = <T,>(side: Side) => get<{ profile: { details: T; complete: boolean; savedAt: string } | null }>(`/api/v2/profile?side=${side}`);
export const saveProfile = (side: Side, details: Record<string, unknown>) => post<{ ok: boolean }>("/api/v2/profile", { side, details });

/**
 * The board's missions in the screen's own shape: the screen's icons, words and links, with the real state, progress and reward.
 * Missions Rezekii can't check yet aren't sent, so they drop out. A mission that's ready shows Claim.
 */
export function mergeMissions(defs: Mission[], live: State[]): Mission[] {
  return live.flatMap((s) => {
    const d = defs.find((x) => x.id === s.id);
    if (!d) return [];
    const ready = s.state === "ready";
    // Ready shows Claim (Check in and Share keep their words); not done yet shows where to go.
    const cta = ready ? (d.cta === "Check in" || d.share ? d.cta : "Claim") : !d.cta || d.cta === "Claim" ? "Go" : d.cta;
    return [{ ...d, reward: s.reward, state: s.state, progress: s.progress, cta, left: undefined }];
  });
}

/** "12 Nov" style day for history rows; today and yesterday by name. */
export function whenLabel(at: string): string {
  const d = new Date(at);
  const myt = (x: Date) => x.toLocaleDateString("en-GB", { timeZone: "Asia/Kuala_Lumpur" });
  const now = new Date();
  const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kuala_Lumpur" });
  if (myt(d) === myt(now)) return `Today ${time}`;
  if (myt(d) === myt(new Date(now.getTime() - 86400_000))) return "Yesterday";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Asia/Kuala_Lumpur" });
}
