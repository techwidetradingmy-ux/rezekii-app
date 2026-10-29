import { useEffect, useState } from "react";

/**
 * Her delivery address and sign-up details (owner, 29 Oct 2026). The address is optional at sign-up and only required for the
 * Rate Card, so sellers can send products for paid reviews. Free Samples ship to her TikTok address. The preview has no server,
 * so this lives in the browser tab.
 */
export type Address = { to: string; phone: string; line: string; postcode: string; city: string; state: string };
export const EMPTY_ADDRESS: Address = { to: "", phone: "", line: "", postcode: "", city: "", state: "" };
export const addressOk = (a: Address) => a.to.trim().length > 1 && a.line.trim().length > 4 && /^\d{5}$/.test(a.postcode) && a.city.trim().length > 1 && !!a.state;

const KEY = "rz2_address";
const EVT = "rz2-address";
function read(): Address {
  try {
    return { ...EMPTY_ADDRESS, ...JSON.parse(sessionStorage.getItem(KEY) ?? "{}") };
  } catch {
    return EMPTY_ADDRESS;
  }
}
export function saveAddress(a: Address) {
  try { sessionStorage.setItem(KEY, JSON.stringify(a)); } catch {}
  window.dispatchEvent(new Event(EVT));
}
export function useAddress(): [Address, (a: Address) => void] {
  const [addr, setAddr] = useState<Address>(EMPTY_ADDRESS);
  useEffect(() => {
    const sync = () => setAddr(read());
    sync();
    window.addEventListener(EVT, sync);
    return () => window.removeEventListener(EVT, sync);
  }, []);
  return [addr, saveAddress];
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
