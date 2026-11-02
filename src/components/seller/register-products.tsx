"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { Flow, Title } from "@/components/ui";
import { NO_PHOTO, shortName } from "@/lib/live-perf";
import { sellerCenterCampaign } from "@/lib/live";
import { SELLER } from "@/lib/mock";
import { SHOP_ITEMS } from "@/lib/mock-seller";

type Status = "pending" | "approved" | "declined";
type Product = { id: string; name: string; image: string | null; status: Status; totalRate: number | null; reason?: string | null };
type Data = { linked: boolean; shop?: string; error?: string; campaign?: { id: string; name: string; status: string | null; commission: number | null; end: number | null }; products?: Product[] };

const LABEL: Record<Status, [string, string]> = { pending: ["Waiting for Techwide", "badge-amber"], approved: ["Approved", ""], declined: ["Not approved", "badge-red"] };
const day = (sec: number) => new Date(sec * 1000).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kuala_Lumpur" });

/** The sample preview: the same page with a made-up shop. */
const SAMPLE: Data = {
  linked: true,
  shop: SELLER.shop,
  campaign: { id: "sample", name: `Techwide X ${SELLER.shop}`, status: "ONGOING", commission: 10, end: Date.UTC(2027, 9, 25) / 1000 },
  products: SHOP_ITEMS.filter((p) => p.stage !== "Not submitted").map((p) => ({ id: p.id, name: p.name, image: p.img, status: p.stage === "Live" ? "approved" : p.stage === "Not approved" ? "declined" : "pending", totalRate: p.tapRate ? p.tapRate * 100 : null, reason: p.stage === "Not approved" ? "Commission too low" : null })),
};

/**
 * Register Products (owner, 31 Oct 2026: one step, not two). Each shop has its own Techwide campaign, made when it connects
 * Seller Center. Sellers register products there once, in Seller Center (TikTok has no way for apps to do it); this page opens
 * the campaign and shows where each registered product is.
 */
export function RegisterProducts({ title = true }: { title?: boolean }) {
  const { live, toast } = useDemo();
  const [d, setD] = useState<Data | null>(live ? null : SAMPLE);
  const [busy, setBusy] = useState(false);
  const load = (say = false) => {
    setBusy(true);
    fetch("/api/v2/seller/campaign", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error())))
      .then((x: Data) => { setD(x); if (say) toast("Checked with TikTok"); })
      .catch(() => setD((x) => x ?? { linked: true, error: "Couldn't reach TikTok Shop. Please try again." }))
      .finally(() => setBusy(false));
  };
  useEffect(() => { if (live) load(); else setD(SAMPLE); }, [live]); // eslint-disable-line react-hooks/exhaustive-deps

  const c = d?.campaign;
  const list = d?.products ?? [];
  const count = (s: Status) => list.filter((p) => p.status === s).length;
  const href = c && c.id !== "sample" ? sellerCenterCampaign(c.id) : undefined;

  return (
    <div className="v2-stack v2-in" style={{ gap: 18 }}>
      {title && <Title title="Register Products" sub="Register your products once, in your own campaign in Seller Center. Techwide reviews each product, then creators on Rezekii can promote it." />}
      {!d ? <p className="v2-muted">Opening your campaign…</p> : !d.linked ? (
        <section className="v2-card flat" style={{ alignItems: "flex-start" }}>
          <b>Connect your Seller Center shop</b>
          <p className="v2-muted" style={{ margin: 0 }}>Rezekii opens your own campaign as soon as your shop is connected.</p>
          <a href="/seller/connect" className="np-btn v2-btn-sm">Connect Shop</a>
        </section>
      ) : !c ? (
        <section className="v2-card flat"><p className="v2-muted" style={{ margin: 0 }}>{d.error ?? "Your campaign isn't ready yet. Please try again."}</p><button type="button" className="btn-outline v2-btn-sm" style={{ alignSelf: "flex-start" }} onClick={() => load()}>Try Again</button></section>
      ) : (
        <div className="v2-split" style={{ alignItems: "start" }}>
          <section className="v2-card" style={{ gap: 14 }}>
            <div className="v2-card-h">
              <span><small className="v2-small">Your Campaign</small><h2 className="v2-h2" style={{ margin: 0 }}>{c.name}</h2></span>
              {c.status && <span className={`badge ${c.status === "ONGOING" ? "" : "badge-gray"}`}>{c.status === "ONGOING" ? "Open" : c.status.charAt(0) + c.status.slice(1).toLowerCase()}</span>}
            </div>
            <div className="v2-grid3">
              <div className="v2-stat"><small>Campaign commission</small><b>{c.commission !== null ? `${c.commission}%` : "—"}</b></div>
              <div className="v2-stat"><small>Open until</small><b>{c.end ? day(c.end) : "—"}</b></div>
              <div className="v2-stat"><small>Registered</small><b>{list.length}</b></div>
            </div>
            <Flow label="How to register" steps={[{ icon: "store", title: "Open your campaign" }, { icon: "box", title: "Pick products" }, { icon: "tag", title: "Set commission and samples" }, { icon: "check", title: "Techwide reviews" }]} />
            {href ? (
              <a href={href} target="_blank" rel="noreferrer" className="np-btn" style={{ height: 48, alignSelf: "flex-start" }}>Register in Seller Center <Icon name="arrow" size={18} /></a>
            ) : (
              <button type="button" className="np-btn" style={{ height: 48, alignSelf: "flex-start" }} onClick={() => toast("Sample: this opens your campaign in Seller Center")}>Register in Seller Center <Icon name="arrow" size={18} /></button>
            )}
          </section>

          <section className="v2-card">
            <div className="v2-card-h">
              <h2 className="v2-h2">Your Registered Products</h2>
              {live && <button type="button" className="v2-link" disabled={busy} onClick={() => load(true)}><Icon name="refresh" size={15} /> {busy ? "Checking…" : "Check again"}</button>}
            </div>
            <div className="v2-chips" aria-label="Summary">
              <span className="v2-chip">{count("pending")} waiting</span>
              <span className="v2-chip">{count("approved")} approved</span>
              <span className="v2-chip">{count("declined")} not approved</span>
            </div>
            <div className="v2-divide">
              {list.map((p) => (
                <div key={`${p.status}-${p.id}`} className="sl-act" style={{ gridTemplateColumns: "44px minmax(0,1fr) auto", alignItems: "center" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.image ?? NO_PHOTO} alt="" style={{ width: 44, height: 44, borderRadius: 10, objectFit: "cover" }} />
                  <span><b style={{ fontSize: 14 }}>{shortName(p.name)}</b><small>{p.status === "approved" && p.totalRate !== null ? `${p.totalRate / 100}% for creators` : p.status === "pending" ? "Registered · Techwide is reviewing it" : p.status === "declined" ? `${p.reason ? `${p.reason}. ` : ""}Change it in Seller Center and register again` : ""}</small></span>
                  <span className={`badge ${LABEL[p.status][1]}`}>{LABEL[p.status][0]}</span>
                </div>
              ))}
              {!list.length && <p className="v2-muted" style={{ margin: 0 }}>Nothing registered yet. Products you register in Seller Center show here.</p>}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
