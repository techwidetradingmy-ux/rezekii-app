"use client";

import { useState } from "react";
import { useDemo } from "@/components/demo";
import { Icon } from "@/components/icons";
import { PickList } from "@/components/pick-list";
import { Sheet } from "@/components/ui";
import { addressProblems, stillNeeded, useAddress, type Address } from "@/lib/address";
import { COUNTRIES } from "@/lib/countries";
import { CITY_OPTIONS, statesOf } from "@/lib/my-cities";
import { useLang, useT } from "@/lib/i18n/client";
import "@/app/creator1.css";

/**
 * The delivery address fields, shared by sign-up, Account and the Rate Card (owner, 29 Oct 2026). Any country (31 Oct 2026):
 * Malaysia keeps its 5-digit postcode; elsewhere the state is typed and the postcode is the local one, or none. In Malaysia the
 * City is picked from a real list and fills in its State (owner, 3 Nov 2026); the State is picked only when the city is in two.
 * `quiet`: what's still needed shows next to the Save button instead (AddressForm).
 */
export function AddressFields({ value, onChange, tried, quiet = false }: { value: Address; onChange: (a: Address) => void; tried?: boolean; quiet?: boolean }) {
  const t = useT();
  const lang = useLang();
  const set = (k: keyof Address, v: string) => onChange({ ...value, [k]: v });
  const country = value.country || "MY";
  const my = country === "MY";
  const problems = tried ? addressProblems(value) : {};
  const bad = (k: keyof Address) => !!problems[k];
  const dial = COUNTRIES.find((c) => c.code === country)?.dial ?? "60";
  const states = my ? statesOf(value.city) : [];
  const pickCity = (city: string) => {
    const s = statesOf(city);
    onChange({ ...value, city, state: s.length === 1 ? s[0] : s.includes(value.state) ? value.state : "" });
  };
  return (
    <div className="ad-fields">
      <label className="v2-field">{t("Recipient")}<input className="np-input" autoComplete="name" placeholder={t("Full name")} value={value.to} onChange={(e) => set("to", e.target.value)} aria-invalid={bad("to")} /></label>
      <label className="v2-field">{t("Phone")}<input className="np-input" inputMode="tel" autoComplete="tel" placeholder={my ? "+60 12-345 6789" : `+${dial} …`} value={value.phone} onChange={(e) => set("phone", e.target.value)} onFocus={() => { if (!value.phone) set("phone", `+${dial} `); }} /></label>
      <label className="v2-field wide">{t("Country")}
        <select className="np-input" autoComplete="country" value={country} onChange={(e) => onChange({ ...value, country: e.target.value, city: "", state: "", postcode: "", phone: value.phone.trim() === `+${dial}` ? "" : value.phone })}>
          {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
        </select>
      </label>
      <label className="v2-field wide">{t("Address")}<input className="np-input" autoComplete="street-address" placeholder={t("House number, street, area")} value={value.line} onChange={(e) => set("line", e.target.value)} aria-invalid={bad("line")} /></label>
      <label className="v2-field">{t("Postcode")}{!my && <small> {t("(if any)")}</small>}<input className="np-input" inputMode={my ? "numeric" : "text"} maxLength={my ? 5 : 10} autoComplete="postal-code" placeholder={my ? "40000" : t("Postcode")} value={value.postcode} onChange={(e) => set("postcode", my ? e.target.value.replace(/\D/g, "") : e.target.value)} aria-invalid={bad("postcode")} /></label>
      {my ? (
        <div className="v2-field">{t("City")}
          <PickList label={t("City")} placeholder={t("Pick your city")} options={CITY_OPTIONS} value={value.city ? [value.city] : []} shown={(c) => c} onChange={([c]) => pickCity(c)} invalid={bad("city")} />
        </div>
      ) : (
        <label className="v2-field">{t("City")}<input className="np-input" autoComplete="address-level2" placeholder={t("City")} value={value.city} onChange={(e) => set("city", e.target.value)} aria-invalid={bad("city")} /></label>
      )}
      <label className="v2-field wide">{my ? t("State") : t("State / Province / Region")}
        {my && states.length > 1 ? (
          <select className="np-input" value={value.state} onChange={(e) => set("state", e.target.value)} aria-invalid={bad("state")}>
            <option value="">{t("Pick the state")}</option>
            {states.map((s) => <option key={s}>{s}</option>)}
          </select>
        ) : my ? (
          <input className="np-input" readOnly tabIndex={-1} placeholder={t("Filled in from the city")} value={value.state} aria-invalid={bad("state")} />
        ) : (
          <input className="np-input" autoComplete="address-level1" placeholder={t("State / Province / Region")} value={value.state} onChange={(e) => set("state", e.target.value)} aria-invalid={bad("state")} />
        )}
      </label>
      {tried && !quiet && stillNeeded(value) && <small className="cr1-err wide">{stillNeeded(value, t, lang)}</small>}
    </div>
  );
}

/**
 * The address with its Save Address button (owner, 3 Nov 2026: Save showed nothing). It says "Saving…", then "Address Saved";
 * anything missing or wrong is named next to the button and its field turns red.
 */
export function AddressForm({ value, onChange, save, onSaved, primary = false }: {
  value: Address; onChange: (a: Address) => void; save: (a: Address) => Promise<string | null>; onSaved?: () => void; primary?: boolean;
}) {
  const t = useT();
  const lang = useLang();
  const [tried, setTried] = useState(false);
  const [status, setStatus] = useState<"saving" | "saved" | { error: string } | null>(null);
  const missing = stillNeeded(value, t, lang);
  const submit = async () => {
    setTried(true);
    if (missing) return setStatus(null);
    setStatus("saving");
    const error = await save(value);
    setStatus(error ? { error } : "saved");
    if (!error) onSaved?.();
  };
  return (
    <>
      <AddressFields value={value} onChange={(a) => { onChange(a); setStatus(null); }} tried={tried} quiet />
      <div className="ad-save">
        <button type="button" className={`${primary ? "np-btn" : "btn-outline"}${status === "saved" ? " saved" : ""}`} disabled={status === "saving"} onClick={() => void submit()}>
          {status === "saving" ? t("Saving…") : status === "saved" ? <><Icon name="check" size={16} width={3} /> {t("Address Saved")}</> : t("Save Address")}
        </button>
        {tried && missing && <small className="cr1-err" role="alert">{missing}</small>}
        {typeof status === "object" && status && <small className="cr1-err" role="alert">{t(status.error)}</small>}
      </div>
    </>
  );
}

/** Asked before she saves or shares her Rate Card, when there's no delivery address yet (sellers send products to it). */
export function AddressSheet({ onDone, onClose }: { onDone: () => void; onClose: () => void }) {
  const t = useT();
  const { toast } = useDemo();
  const [saved, save] = useAddress();
  const [draft, setDraft] = useState<Address>(saved);
  return (
    <Sheet title={t("Add a Delivery Address")} onClose={onClose}>
      <p className="v2-muted" style={{ margin: 0 }}>{t("Your Rate Card needs one, so sellers can send products for paid reviews. Only Techwide and the seller you work with see it.")}</p>
      <AddressForm value={draft} onChange={setDraft} save={save} primary onSaved={() => { toast(t("Address Saved")); onDone(); }} />
    </Sheet>
  );
}
