"use client";

import { useEffect, useState } from "react";
import type { Raise } from "@/modules/tap/raises.ts";

const pct = (r: number) => `${(r / 100).toFixed(r % 100 ? 1 : 0)}%`;
const rm = (v: number) => `RM${v.toFixed(2)}`;

/**
 * Today's commission-raise section: products already in the creator's showcase (not linked to Techwide's TAP) that pay more
 * through Techwide's TAP campaign. Bulk Add to Showcase adds them through Techwide's TAP link. Hidden when there are none.
 */
export function CommissionRaises({ flash }: { flash: (text: string, ok?: boolean) => void }) {
  const [raises, setRaises] = useState<Raise[] | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [failed, setFailed] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    let live = true;
    fetch("/api/tap/raises", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { raises?: Raise[] }) => {
        if (!live) return;
        setRaises(d.raises ?? []);
        setPicked(new Set((d.raises ?? []).map((r) => r.productId)));
      })
      .catch(() => live && setRaises([]));
    return () => {
      live = false;
    };
  }, []);

  if (!raises || (!raises.length && !leaving)) return null;

  const toggle = (id: string) => setPicked((s) => { const x = new Set(s); if (x.has(id)) x.delete(id); else x.add(id); return x; });
  const allOn = picked.size === raises.length;

  async function take() {
    if (busy || !picked.size) return;
    setBusy(true);
    try {
      const r = await fetch("/api/tap/raises", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ productIds: [...picked] }) });
      const d = (await r.json().catch(() => ({}))) as { added?: string[]; failed?: { productId: string; error: string }[]; raises?: Raise[]; error?: string };
      if (!r.ok) throw new Error(d.error || "Couldn't add them. Please try again.");
      const added = d.added?.length ?? 0;
      const nope = d.failed ?? [];
      setFailed(Object.fromEntries(nope.map((f) => [f.productId, f.error])));
      flash(nope.length ? `${added} added through Rezekii · TikTok didn't accept ${nope.length}` : `${added} added through Rezekii · you earn the higher rate now`, !nope.length || added > 0);
      const next = d.raises ?? [];
      if (!next.length) {
        setLeaving(true);
        setTimeout(() => { setRaises([]); setLeaving(false); }, 450);
      } else {
        setRaises(next);
        setPicked(new Set(next.filter((x) => !nope.some((f) => f.productId === x.productId)).map((x) => x.productId)));
      }
    } catch (err) {
      flash(err instanceof Error ? err.message : String(err), false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={`nv-up cr-wrap ${leaving ? "cr-out" : ""}`} aria-labelledby="crt">
      <div className="cr-head">
        <span className="cr-badge" aria-hidden="true">▲</span>
        <span style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
          <h2 id="crt" style={{ margin: 0, fontSize: 21, fontWeight: 900 }}>Earn more on products already in your showcase</h2>
          <span style={{ fontSize: 14, opacity: 0.9 }}>
            {raises.length} {raises.length === 1 ? "product pays" : "products pay"} you more through Rezekii. Add them to your showcase through Rezekii to get the higher rate.
          </span>
        </span>
      </div>
      <div className="cr-list">
        {raises.map((r) => {
          const gain = r.price ? (r.price * (r.tapRate - r.nowRate)) / 10000 : null;
          return (
            <label key={r.productId} className={`cr-row ${picked.has(r.productId) ? "on" : ""}`}>
              <input type="checkbox" checked={picked.has(r.productId)} onChange={() => toggle(r.productId)} aria-label={`Choose ${r.name}`} />
              {r.image ? <span className="cr-img" style={{ backgroundImage: `url("${r.image}")` }} aria-hidden="true" /> : <span className="cr-img" aria-hidden="true" />}
              <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0, flex: 1 }}>
                <strong className="cr-name">{r.name}</strong>
                <span style={{ fontSize: 12, color: "var(--muted)" }}>{r.shop}</span>
                {failed[r.productId] && <span style={{ fontSize: 12, color: "var(--red)", fontWeight: 700 }}>TikTok didn&apos;t accept it: {failed[r.productId]}</span>}
              </span>
              <span className="cr-rate"><span className="cr-now">{pct(r.nowRate)}</span><span aria-hidden="true">→</span><b>{pct(r.tapRate)}</b></span>
              {gain !== null && <span className="cr-gain">+{rm(gain)} a sale</span>}
            </label>
          );
        })}
      </div>
      <div className="cr-acts">
        <button type="button" className="nv-link" onClick={() => setPicked(allOn ? new Set() : new Set(raises.map((r) => r.productId)))} style={{ color: "inherit" }}>{allOn ? "Clear all" : "Choose all"}</button>
        <button type="button" className="cr-btn nv-press" onClick={take} disabled={busy || !picked.size}>
          {busy && <span className="nv-sping" aria-hidden="true" />}
          {busy ? "Adding through Rezekii…" : `Bulk Add to Showcase · ${picked.size}`}
        </button>
      </div>
    </section>
  );
}
