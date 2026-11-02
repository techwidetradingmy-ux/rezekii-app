"use client";

import { useEffect, useState } from "react";
import { Seg, Tip } from "@/components/ui";
import { CANCEL_MIN_ITEMS, cancelLevel } from "@/lib/cancel";
import { useT } from "@/lib/i18n/client";

export type Dir = "desc" | "asc";

/**
 * A list's sort and its direction, remembered per page on this device (owner, 1 Nov 2026: every Analytics list and table can be
 * sorted highest or lowest first, and stays as she left it).
 */
export function useSortPref<K extends string>(page: string, options: readonly K[], initial: K): [K, (k: K) => void, Dir, () => void, (k: K, d: Dir) => void] {
  const store = `rz2_sort:${page}`;
  const [pref, setPref] = useState<{ key: K; dir: Dir }>({ key: initial, dir: "desc" });
  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem(store) ?? "null") as { key?: K; dir?: Dir } | null;
      if (s && s.key && options.includes(s.key)) setPref({ key: s.key, dir: s.dir === "asc" ? "asc" : "desc" });
    } catch {}
  }, [store]); // eslint-disable-line react-hooks/exhaustive-deps
  const save = (p: { key: K; dir: Dir }) => {
    setPref(p);
    try { localStorage.setItem(store, JSON.stringify(p)); } catch {}
  };
  return [pref.key, (key) => save({ key, dir: pref.dir }), pref.dir, () => save({ key: pref.key, dir: pref.dir === "desc" ? "asc" : "desc" }), (key, dir) => save({ key, dir })];
}

/** Sorts by a number in the chosen direction. */
export const byDir = <T,>(rows: T[], val: (r: T) => number, dir: Dir) => [...rows].sort((a, b) => (dir === "desc" ? val(b) - val(a) : val(a) - val(b)));

/** The ↓ / ↑ switch beside a sort. */
export function DirToggle({ dir, onFlip }: { dir: Dir; onFlip: () => void }) {
  const t = useT();
  return (
    <button type="button" className="sb-dir" onClick={onFlip} aria-label={dir === "desc" ? t("Highest first. Tap for lowest first") : t("Lowest first. Tap for highest first")} title={dir === "desc" ? t("Highest first") : t("Lowest first")}>
      <span aria-hidden="true">{dir === "desc" ? "↓" : "↑"}</span>
    </button>
  );
}

/** "Sort by" with its options (English, shown in her language by Seg) and the ↓ / ↑ switch. */
export function SortBar<K extends string>({ value, options, onChange, dir, onFlip }: { value: K; options: readonly K[]; onChange: (k: K) => void; dir: Dir; onFlip: () => void }) {
  const t = useT();
  return (
    <div className="cr2-segfit sb-bar">
      <span className="cr2-sortlbl">{t("Sort by")}</span>
      <Seg value={value} options={options} onChange={onChange} />
      <DirToggle dir={dir} onFlip={onFlip} />
    </div>
  );
}

/** A table header that sorts by its column: tap once for highest first, again for lowest first (▼ / ▲). */
export function SortHead<K extends string>({ label, k, value, dir, onSort }: { label: string; k: K; value: K; dir: Dir; onSort: (k: K, dir: Dir) => void }) {
  const on = value === k;
  return (
    <button type="button" className={`sb-head${on ? " on" : ""}`} aria-sort={on ? (dir === "desc" ? "descending" : "ascending") : "none"} onClick={() => onSort(k, on && dir === "desc" ? "asc" : "desc")}>
      {label}<i aria-hidden="true">{on ? (dir === "desc" ? "▼" : "▲") : "▾"}</i>
    </button>
  );
}

/**
 * A cancel rate by items (owner, 1 Nov 2026): the percent, coloured by Rezekii's standard only from 5 items sold, and
 * "x of y items" under it.
 */
export function CancelRate({ pct, items, bad }: { pct: number; items?: number; bad?: number }) {
  const t = useT();
  const judged = items === undefined || items >= CANCEL_MIN_ITEMS;
  const lv = cancelLevel(pct);
  return (
    <>
      <b className={!judged ? undefined : lv === "high" ? "cr2-red" : lv === "watch" ? "cr2-orange-v" : undefined}>{pct}%</b>
      {items !== undefined && <em className="cr-items">{items === 1 ? t("{bad} of {n} item", { bad: bad ?? 0, n: items }) : t("{bad} of {n} items", { bad: bad ?? 0, n: items })}</em>}
    </>
  );
}

/** "high" or "watch" for a badge, only from 5 items sold; null otherwise. */
export const cancelFlag = (pct: number, items?: number) => (items !== undefined && items < CANCEL_MIN_ITEMS ? null : cancelLevel(pct) === "ok" ? null : cancelLevel(pct));

/**
 * Cancels as one small chip (owner, 3 Nov 2026: "Watch Cancels" didn't say what it meant): "Cancels 12%", amber from 10% and
 * red from 20%, only from 5 items sold, with a ⓘ. The same place on every row and every sort.
 */
export function CancelChip({ pct, items }: { pct: number; items?: number }) {
  const t = useT();
  const flag = cancelFlag(pct, items);
  if (!flag) return null;
  return (
    <span className={`cx-chip${flag === "high" ? " high" : ""}`}>
      {t("Cancels {pct}%", { pct })}
      <Tip label={t("About Cancels")} text={t("Share of items cancelled or returned. Amber from 10%, red from 20%, counted once 5 or more items sold.")} />
    </span>
  );
}
