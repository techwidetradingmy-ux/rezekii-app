"use client";

import { useState } from "react";
import Image from "next/image";
import AppShell from "@/components/layout/AppShell";
import RzCard from "@/components/ui/RzCard";
import StatusBadge from "@/components/ui/StatusBadge";
import Link from "next/link";
import { ArrowLeft, Package, Calendar, ChevronRight } from "lucide-react";

const statusFilters = ["All", "Pending", "Approved", "Shipped", "Completed"] as const;
type Filter = typeof statusFilters[number];

const applications = [
  {
    id: "app1",
    product: "Hydro Glow Serum 30ml",
    brand: "COSRX",
    status: "Approved" as const,
    appliedDate: "25 Apr 2026",
    note: "Expected delivery: 28–30 Apr",
    imageColor: "#fde8f0",
    imageUrl: "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=200&h=200&fit=crop",
    commissionRate: 12,
  },
  {
    id: "app2",
    product: "Mango Chili Snack Pack",
    brand: "MyRasa",
    status: "Shipped" as const,
    appliedDate: "20 Apr 2026",
    note: "Tracking: JT1234567890MY",
    imageColor: "#fff3d6",
    imageUrl: "https://images.unsplash.com/photo-1621939514649-280e2ee25f60?w=200&h=200&fit=crop",
    commissionRate: 8,
  },
  {
    id: "app3",
    product: "ANC Wireless Earbuds Pro",
    brand: "Soundcore",
    status: "Pending" as const,
    appliedDate: "27 Apr 2026",
    note: "Awaiting brand approval",
    imageColor: "#e8ecff",
    imageUrl: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=200&h=200&fit=crop",
    commissionRate: 6,
  },
  {
    id: "app4",
    product: "Linen Wide Leg Trousers",
    brand: "ZALORA Studio",
    status: "Completed" as const,
    appliedDate: "10 Apr 2026",
    note: "Delivered 15 Apr 2026",
    imageColor: "#f0ede8",
    imageUrl: "https://images.unsplash.com/photo-1594938298603-c8148c4b4057?w=200&h=200&fit=crop",
    commissionRate: 15,
  },
  {
    id: "app5",
    product: "Bamboo Aroma Diffuser",
    brand: "ScentCo",
    status: "Completed" as const,
    appliedDate: "1 Apr 2026",
    note: "Delivered 6 Apr 2026",
    imageColor: "#e8f5f0",
    imageUrl: "https://images.unsplash.com/photo-1602928321679-560bb453f190?w=200&h=200&fit=crop",
    commissionRate: 10,
  },
  {
    id: "app6",
    product: "Collagen Boost Toner",
    brand: "Skin1004",
    status: "Pending" as const,
    appliedDate: "26 Apr 2026",
    note: "Awaiting brand approval",
    imageColor: "#fce8fe",
    imageUrl: "https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=200&h=200&fit=crop",
    commissionRate: 11,
  },
];

export default function ApplicationsPage() {
  const [filter, setFilter] = useState<Filter>("All");

  const filtered = applications.filter(
    (a) => filter === "All" || a.status === filter
  );

  return (
    <AppShell>
      {/* Header */}
      <div className="px-5 pt-12 pb-4 bg-white border-b border-[#d8f0e4] sticky top-0 z-20">
        <div className="flex items-center gap-3 mb-3">
          <Link href="/profile" className="tap-target">
            <ArrowLeft size={22} color="#0d1117" strokeWidth={2} />
          </Link>
          <h1 className="text-[22px] font-[800] text-[#0d1117]">My Applications</h1>
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-5 px-5">
          {statusFilters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={[
                "px-4 py-1.5 rounded-full text-[12px] font-[600] whitespace-nowrap shrink-0 tap-target transition-all",
                filter === f
                  ? "bg-[#00c073] text-white"
                  : "bg-[#f5fdf7] text-[#4a5568] border border-[#d8f0e4]",
              ].join(" ")}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 pt-4 pb-4 flex flex-col gap-3">

        {/* Summary row */}
        <div className="grid grid-cols-4 gap-2 animate-fade-up">
          {[
            { label: "Total",    value: applications.length,                                        color: "#0d1117" },
            { label: "Pending",  value: applications.filter(a => a.status === "Pending").length,    color: "#f5a623" },
            { label: "Shipped",  value: applications.filter(a => a.status === "Shipped").length,    color: "#25f4ee" },
            { label: "Done",     value: applications.filter(a => a.status === "Completed").length,  color: "#00c073" },
          ].map(({ label, value, color }) => (
            <RzCard key={label} padding={false} className="p-2.5 flex flex-col items-center">
              <p className="text-[18px] font-[800]" style={{ color }}>{value}</p>
              <p className="text-[10px] text-[#9aa5b1] font-[500]">{label}</p>
            </RzCard>
          ))}
        </div>

        {/* Application list */}
        <div className="animate-fade-up delay-100 flex flex-col gap-3">
          {filtered.map((app) => (
            <RzCard key={app.id} padding={false} className="overflow-hidden tap-target">
              <div className="flex gap-3 p-4">
                {/* Product image */}
                <div
                  className="w-14 h-14 rounded-[12px] overflow-hidden shrink-0 relative"
                  style={{ background: app.imageColor }}
                >
                  {app.imageUrl && (
                    <Image
                      src={app.imageUrl}
                      alt={app.product}
                      fill
                      className="object-cover"
                      sizes="56px"
                    />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-[#9aa5b1] font-[500]">{app.brand}</p>
                      <p className="text-[13px] font-[700] text-[#0d1117] leading-tight truncate">
                        {app.product}
                      </p>
                    </div>
                    <StatusBadge status={app.status} />
                  </div>

                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex items-center gap-1">
                      <Calendar size={10} color="#9aa5b1" />
                      <span className="text-[11px] text-[#9aa5b1]">Applied {app.appliedDate}</span>
                    </div>
                    <span className="text-[11px] font-[600] text-[#00c073]">{app.commissionRate}% comm</span>
                  </div>

                  <div className="flex items-center gap-1 mt-1">
                    <Package size={10} color="#9aa5b1" />
                    <span className="text-[11px] text-[#9aa5b1]">{app.note}</span>
                  </div>
                </div>

                <ChevronRight size={15} color="#d8f0e4" className="self-center shrink-0" />
              </div>
            </RzCard>
          ))}

          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20">
              <span className="text-[48px] mb-4">📦</span>
              <p className="text-[16px] font-[700] text-[#0d1117] mb-1">No Applications</p>
              <p className="text-[13px] text-[#9aa5b1]">Browse the marketplace to apply for samples</p>
            </div>
          )}
        </div>

      </div>
    </AppShell>
  );
}
