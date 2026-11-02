/**
 * Her short user ID, e.g. "RZ-7F3K9Q" (owner, 3 Nov 2026: simpler to read out and for the team to recognise). Worked out from
 * her account ID, nothing new is stored: the first 30 bits in Crockford base32, which leaves out I, L, O and U.
 */
const ABC = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

export function shortId(id: string): string {
  const n = parseInt(id.replace(/-/g, "").slice(0, 8), 16) >>> 2;
  if (Number.isNaN(n)) return id;
  let s = "";
  for (let i = 25; i >= 0; i -= 5) s += ABC[(n >>> i) & 31];
  return `RZ-${s}`;
}

/** True when a typed search is (part of) this account's short ID; "rz 7f3k", "7F3K9Q" and O/I/L typos all match. */
export function shortIdMatches(id: string, typed: string): boolean {
  const q = typed.toUpperCase().replace(/[\s-]/g, "").replace(/^RZ/, "").replace(/O/g, "0").replace(/[IL]/g, "1");
  return q.length >= 4 && shortId(id).slice(3).includes(q);
}
