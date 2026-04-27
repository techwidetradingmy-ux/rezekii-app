"use client";

import AppShell from "@/components/layout/AppShell";
import Link from "next/link";
import { Bell, ChevronRight, TrendingUp, Package, Megaphone, Wallet } from "lucide-react";
import { dashboardStats, recentActivity, earningsWeek } from "@/lib/mock-data";
import EarningsChart from "@/components/ui/EarningsChart";

function formatRM(amount: number) {
  return `RM ${amount.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function HomePage() {
  const totalWeekCommission = earningsWeek.reduce((s, d) => s + d.commission, 0);

  return (
    <AppShell>
      {/* Green header */}
      <div style={{ background: "#00c073", paddingTop: 48, paddingBottom: 20, paddingLeft: 20, paddingRight: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          {/* Logo */}
          <img src="/rezekii-logo.svg" alt="rezekii" style={{ height: 30 }} />
          {/* Bell */}
          <Link href="/notifications" style={{ position: "relative", display: "flex" }}>
            <Bell size={22} color="white" strokeWidth={1.8} />
            <span style={{
              position: "absolute", top: -4, right: -4,
              width: 16, height: 16, background: "#e8005a",
              borderRadius: "50%", fontSize: 9, color: "white",
              fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center"
            }}>3</span>
          </Link>
        </div>
        <p style={{ color: "rgba(255,255,255,0.8)", fontSize: 13, margin: 0 }}>Good morning, Aisyah 👋</p>
      </div>

      {/* Scrollable body */}
      <div style={{ padding: "16px 20px 20px", display: "flex", flexDirection: "column", gap: 16, background: "#f5fdf7" }}>

        {/* Earnings Card */}
        <div style={{
          background: "white", borderRadius: 16, border: "1.5px solid #d8f0e4",
          boxShadow: "0 2px 12px rgba(0,0,0,0.06)", overflow: "hidden"
        }}>
          {/* Green gradient top */}
          <div style={{ background: "linear-gradient(135deg, #00c073 0%, #009a5c 100%)", padding: "16px 16px 14px" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              <div>
                <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 12, fontWeight: 500, margin: "0 0 2px" }}>
                  This Month&apos;s Earnings
                </p>
                <p style={{ color: "white", fontSize: 28, fontWeight: 800, lineHeight: 1.1, margin: 0 }}>
                  {formatRM(dashboardStats.totalEarningsThisMonth)}
                </p>
              </div>
              <div style={{
                display: "flex", alignItems: "center", gap: 3,
                background: "rgba(255,255,255,0.22)", borderRadius: 20,
                padding: "4px 8px", marginTop: 2
              }}>
                <TrendingUp size={11} color="white" />
                <span style={{ color: "white", fontSize: 12, fontWeight: 700 }}>+{dashboardStats.earningsDelta}%</span>
              </div>
            </div>
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 11, margin: "4px 0 0" }}>vs last month</p>
          </div>
          {/* Chart area */}
          <div style={{ padding: "12px 16px 4px" }}>
            <p style={{ fontSize: 11, color: "#9aa5b1", fontWeight: 500, margin: "0 0 8px" }}>This week</p>
            <EarningsChart data={earningsWeek} metric="commission" />
          </div>
          <div style={{ padding: "8px 16px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <p style={{ fontSize: 11, color: "#9aa5b1", margin: "0 0 2px" }}>7-day commission</p>
              <p style={{ fontSize: 15, fontWeight: 700, color: "#0d1117", margin: 0 }}>{formatRM(totalWeekCommission)}</p>
            </div>
            <Link href="/earnings" style={{ display: "flex", alignItems: "center", gap: 2, color: "#00c073", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
              See all <ChevronRight size={14} />
            </Link>
          </div>
        </div>

        {/* Stat Circles */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          {[
            { label: "Products Sold", value: dashboardStats.productsSold, color: "#00c073" },
            { label: "Campaigns",     value: dashboardStats.activeCampaigns, color: "#f5a623" },
            { label: "Pending Samples", value: dashboardStats.pendingSamples, color: "#25f4ee" },
          ].map(({ label, value, color }) => (
            <div key={label} style={{
              background: "white", borderRadius: 16, border: "1.5px solid #d8f0e4",
              boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
              display: "flex", flexDirection: "column", alignItems: "center",
              justifyContent: "center", padding: "16px 8px", gap: 8
            }}>
              {/* Circle */}
              <div style={{
                width: 60, height: 60, borderRadius: "50%",
                border: `3px solid ${color}`, background: `${color}14`,
                display: "flex", alignItems: "center", justifyContent: "center"
              }}>
                <span style={{ fontSize: 20, fontWeight: 800, color: "#0d1117", lineHeight: 1 }}>{value}</span>
              </div>
              <p style={{ fontSize: 10, color: "#9aa5b1", fontWeight: 500, textAlign: "center", lineHeight: 1.3, margin: 0 }}>{label}</p>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Link href="/marketplace" style={{ textDecoration: "none" }}>
            <button style={{
              width: "100%", height: 52, borderRadius: 12,
              background: "#00c073", border: "none",
              color: "white", fontSize: 14, fontWeight: 700,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              cursor: "pointer", boxShadow: "0 2px 12px rgba(0,192,115,0.28)"
            }}>
              <Package size={18} color="white" />
              Browse Products
            </button>
          </Link>
          <Link href="/earnings" style={{ textDecoration: "none" }}>
            <button style={{
              width: "100%", height: 52, borderRadius: 12,
              background: "white", border: "1.5px solid #00c073",
              color: "#00c073", fontSize: 14, fontWeight: 700,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              cursor: "pointer"
            }}>
              <Wallet size={18} color="#00c073" />
              Withdraw
            </button>
          </Link>
        </div>

        {/* Recent Activity */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#0d1117", margin: 0 }}>Recent Activity</h2>
            <button style={{ fontSize: 12, color: "#00c073", fontWeight: 600, background: "none", border: "none", cursor: "pointer", padding: 0 }}>See all</button>
          </div>
          <div style={{
            background: "white", borderRadius: 16, border: "1.5px solid #d8f0e4",
            boxShadow: "0 2px 12px rgba(0,0,0,0.06)", overflow: "hidden"
          }}>
            {recentActivity.map((item, i) => (
              <div key={item.id} style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "12px 16px",
                borderTop: i === 0 ? "none" : "1px solid #f5fdf7"
              }}>
                <div style={{
                  width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: item.type === "earn" ? "rgba(0,192,115,0.12)" :
                               item.type === "payout" ? "rgba(232,0,90,0.10)" :
                               "rgba(245,166,35,0.12)"
                }}>
                  {item.type === "earn" && <TrendingUp size={14} color="#00c073" />}
                  {item.type === "payout" && <Wallet size={14} color="#e8005a" />}
                  {item.type === "sample" && <Package size={14} color="#f5a623" />}
                  {item.type === "campaign" && <Megaphone size={14} color="#f5a623" />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, color: "#0d1117", fontWeight: 500, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.text}</p>
                  <p style={{ fontSize: 11, color: "#9aa5b1", margin: "2px 0 0" }}>{item.time}</p>
                </div>
                {item.amount && (
                  <span style={{
                    fontSize: 13, fontWeight: 700, flexShrink: 0,
                    color: item.amount.startsWith("+") ? "#00c073" : "#4a5568"
                  }}>{item.amount}</span>
                )}
              </div>
            ))}
          </div>
        </div>

      </div>
    </AppShell>
  );
}
