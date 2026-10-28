"use client";

import "@/app/admin.css";
import { useState } from "react";
import { Icon } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { Title } from "@/components/ui";
import { Chips, Pill } from "@/components/admin/bits";
import { rm } from "@/lib/mock";
import { PRODUCT_REQUESTS, type ProductRequest } from "@/lib/mock-showcase";

type Filter = "All" | "New" | "Contacting" | "Added";

/**
 * Product Requests (owner, 29 Oct 2026): products creators asked us to bring to Rezekii, most asked first. This is the list of
 * sellers to approach; contacting one tells every creator who asked, and adding it lets them know it's live.
 */
export default function ProductRequests() {
  const { toast } = useDemo();
  const [list, setList] = useState<ProductRequest[]>(PRODUCT_REQUESTS);
  const [filter, setFilter] = useState<Filter>("All");
  const shown = list.filter((r) => filter === "All" || r.status === filter).sort((a, b) => b.askers - a.askers);
  const set = (id: string, status: ProductRequest["status"], msg: string) => {
    setList((l) => l.map((r) => (r.id === id ? { ...r, status } : r)));
    toast(msg);
  };

  return (
    <div className="v2-stack v2-in" style={{ gap: 18 }}>
      <Title title="Product Requests" sub="Products creators asked us to bring to Rezekii. Most asked first.">
        <button type="button" className="btn-outline v2-btn-sm" onClick={() => toast("Seller list exported (CSV)")}><Icon name="arrow" size={16} /> Export sellers</button>
      </Title>

      <Chips<Filter>
        label="Filter requests"
        value={filter}
        onChange={setFilter}
        options={[["All", list.length], ["New", list.filter((r) => r.status === "New").length], ["Contacting", list.filter((r) => r.status === "Contacting").length], ["Added", list.filter((r) => r.status === "Added").length]]}
      />

      <section className="v2-card" style={{ padding: "8px 20px" }}>
        <div className="ad-list">
          {shown.map((r) => (
            <div key={r.id} className="ad-row">
              <span className="ad-reqtile" style={{ background: r.color }} aria-hidden="true">{r.name[0]}</span>
              <span className="main">
                <b>{r.name}</b>
                <small>{r.shop} · {r.category}</small>
              </span>
              <span className="main" style={{ flex: "0 1 190px" }}>
                <b className="ad-nowrap">{r.askers} creators asked</b>
                <small>{rm(r.sold30, 0)} sold by them in 30 days · since {r.first}</small>
              </span>
              {r.status === "Added" ? <Pill tone="ok">Added</Pill> : r.status === "Contacting" ? <Pill tone="warn">Contacting</Pill> : <Pill>New</Pill>}
              <span className="acts">
                {r.status === "New" && <button type="button" className="ad-btn-ghost" onClick={() => set(r.id, "Contacting", `Marked as contacting · ${r.askers} creators told`)}>Mark contacting</button>}
                {r.status === "Contacting" && <button type="button" className="np-btn v2-btn-sm" onClick={() => set(r.id, "Added", `Added to TAP pipeline · ${r.askers} creators will be told when it's live`)}>Add to TAP</button>}
              </span>
            </div>
          ))}
          {shown.length === 0 && <p className="v2-muted" style={{ padding: "14px 0" }}>Nothing to show.</p>}
        </div>
      </section>
      <p className="v2-small" style={{ margin: 0 }}>Each request comes from a creator&apos;s showcase. Sales are their own orders of the product.</p>
    </div>
  );
}
