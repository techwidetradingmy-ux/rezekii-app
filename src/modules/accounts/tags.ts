/**
 * A linked creator's labels from TikTok's Creator Marketplace (owner, 14 Oct 2026): agency managed or independent (TikTok gives
 * no agency name) and TikTok's creator level. TikTok returns neither as a field, only as search filters, so they are found by
 * searching the creator's username with one filter at a time: agency first, then the level by halving Lv. 0–8 (4 searches).
 * One search per step, so a rate-limited step simply waits and carries on. Pure: no network, no database.
 */
import { TT_LEVELS, type PlannedTask } from "../refresh/plan.ts";

export type Agency = "managed" | "independent" | null;
export type TagState = { step: "managed" | "independent" | "level"; agency: Agency; lo: number; hi: number };
export const TAG_START: TagState = { step: "managed", agency: null, lo: 0, hi: TT_LEVELS.length - 1 };

/** The refresh task that finds one linked creator's labels (queued when they link TikTok Shop, and when they are due). */
export const tagTask = (userId: string): PlannedTask => ({ key: `tags|${userId}`, kind: "agency", params: { userId }, priority: 4 });

/** The marketplace search filters for this step (with the creator's username as the keyword). */
export function tagFilters(s: TagState): { affiliate_data?: { creator_agency_staus: "AGENCY_MANAGED" | "INDEPENDENT" }; advanced_filters?: { creator_level: string[] } } {
  if (s.step === "managed") return { affiliate_data: { creator_agency_staus: "AGENCY_MANAGED" } };
  if (s.step === "independent") return { affiliate_data: { creator_agency_staus: "INDEPENDENT" } };
  return { advanced_filters: { creator_level: TT_LEVELS.slice(s.lo, Math.floor((s.lo + s.hi) / 2) + 1) } };
}

/** The next step after a search that did or didn't find the creator; `done` once both labels are known. */
export function tagNext(s: TagState, found: boolean): { state: TagState; done: { agency: Agency; level: number | null } | null } {
  const levels = (agency: Agency): TagState => ({ step: "level", agency, lo: 0, hi: TT_LEVELS.length - 1 });
  if (s.step === "managed") return { state: found ? levels("managed") : { ...s, step: "independent" }, done: null };
  if (s.step === "independent") return found ? { state: levels("independent"), done: null } : { state: s, done: { agency: null, level: null } };
  const mid = Math.floor((s.lo + s.hi) / 2);
  const next = found ? { ...s, hi: mid } : { ...s, lo: mid + 1 };
  return next.lo === next.hi ? { state: next, done: { agency: s.agency, level: next.lo } } : { state: next, done: null };
}
