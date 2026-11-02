import { useEffect, useState } from "react";
import { useDemo } from "@/components/demo";
import { statesOf } from "@/lib/my-cities";

/**
 * Her delivery address and sign-up details (owner, 29 Oct 2026). The address is optional at sign-up and only required for the
 * Rate Card, so sellers can send products for paid reviews. Free Samples ship to her TikTok address. Signed out (the preview)
 * it lives in the browser tab; signed in it's kept on her account.
 */
export type Address = { to: string; phone: string; line: string; postcode: string; city: string; state: string; country: string };
export const EMPTY_ADDRESS: Address = { to: "", phone: "", line: "", postcode: "", city: "", state: "", country: "MY" };
/** Malaysian postcodes are 5 digits; other countries' are 2-10 letters, digits or spaces, or none. */
export const postcodeOk = (a: Pick<Address, "postcode" | "country">) => ((a.country || "MY") === "MY" ? /^\d{5}$/.test(a.postcode) : a.postcode === "" || /^[A-Za-z0-9 -]{2,10}$/.test(a.postcode));
/**
 * What's still missing or wrong, field by field, in plain words (owner, 3 Nov 2026: Save says exactly what to fix). In Malaysia
 * the city is one from the list and the state is that city's.
 */
export function addressProblems(a: Address): Partial<Record<keyof Address, string>> {
  const my = (a.country || "MY") === "MY";
  const p: Partial<Record<keyof Address, string>> = {};
  if (a.to.trim().length < 2) p.to = "recipient's name";
  if (a.line.trim().length < 5) p.line = "address";
  if (!postcodeOk(a)) p.postcode = my ? "5-digit postcode" : "postcode, or leave it empty";
  const states = my ? statesOf(a.city) : [];
  if (my ? !states.length || (states.length === 1 && a.state !== states[0]) : a.city.trim().length < 2) p.city = my ? "city from the list" : "city";
  else if (my ? !states.includes(a.state) : !a.state.trim()) p.state = "state";
  return p;
}
export const addressOk = (a: Address) => Object.keys(addressProblems(a)).length === 0;
/** "Still needed: recipient's name and city from the list." */
export const stillNeeded = (a: Address) => {
  const l = Object.values(addressProblems(a));
  return l.length ? `Still needed: ${l.length > 1 ? `${l.slice(0, -1).join(", ")} and ${l.at(-1)}` : l[0]}.` : "";
};

const KEY = "rz2_address";
const EVT = "rz2-address";
function read(): Address {
  try {
    return { ...EMPTY_ADDRESS, ...JSON.parse(sessionStorage.getItem(KEY) ?? "{}") };
  } catch {
    return EMPTY_ADDRESS;
  }
}
/**
 * Signed in (owner, 31 Oct 2026): her address is kept on her account, loaded once per visit. `undefined` until it has loaded.
 * Saving also sends it to her account; signed out (the preview) that call is refused and only this tab keeps it. Signed in
 * (`live`, owner, 3 Nov 2026) it counts as saved only once her account has it: null then, or what went wrong.
 */
let server: Address | undefined;
let loading: Promise<void> | null = null;
export async function saveAddress(a: Address, live = false): Promise<string | null> {
  try { sessionStorage.setItem(KEY, JSON.stringify(a)); } catch {}
  const kept = () => { server = a; window.dispatchEvent(new Event(EVT)); };
  if (!live) kept();
  const r = await fetch("/api/v2/address", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(a) }).catch(() => null);
  if (!live) return null;
  if (!r?.ok) return ((await r?.json().catch(() => null)) as { error?: string } | null)?.error ?? "Didn't save. Check your connection and try again.";
  kept();
  return null;
}
export function useAddress(): [Address, (a: Address) => Promise<string | null>] {
  const { live } = useDemo();
  const [addr, setAddr] = useState<Address>(EMPTY_ADDRESS);
  useEffect(() => {
    const sync = () => setAddr(live ? server ?? EMPTY_ADDRESS : read());
    sync();
    if (live && server === undefined) {
      loading ??= fetch("/api/v2/address", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((d: { address?: Address | null } | null) => { server = { ...EMPTY_ADDRESS, ...(d?.address ?? {}) }; window.dispatchEvent(new Event(EVT)); })
        .catch(() => { loading = null; });
    }
    window.addEventListener(EVT, sync);
    return () => window.removeEventListener(EVT, sync);
  }, [live]);
  return [addr, (a) => saveAddress(a, live)];
}

/** Sign-up details shown back on her Profile (sample birthday until she signs up in this tab). */
export type SignupInfo = { birthday: string; niches: string[] };
const INFO = "rz2_signup";
export const SAMPLE_INFO: SignupInfo = { birthday: "1997-05-14", niches: ["Home Supplies", "Muslim Fashion"] };
export function saveSignup(i: SignupInfo) {
  try { sessionStorage.setItem(INFO, JSON.stringify(i)); } catch {}
}
export function readSignup(): SignupInfo {
  try {
    return { ...SAMPLE_INFO, ...JSON.parse(sessionStorage.getItem(INFO) ?? "{}") };
  } catch {
    return SAMPLE_INFO;
  }
}

/** Birthday checks: TikTok Shop affiliates must be 18 or older. */
export function ageOf(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  return now.getFullYear() - d.getFullYear() - (now < new Date(now.getFullYear(), d.getMonth(), d.getDate()) ? 1 : 0);
}
export const birthdayError = (iso: string) => {
  if (!iso) return "Enter your birthday";
  const age = ageOf(iso);
  if (age === null || age > 100) return "Enter a real date";
  if (age < 18) return "You need to be 18 or older for TikTok Shop affiliate";
  return "";
};
