"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { RZ } from "@/lib/rz";
import Icon from "@/components/ui/Icon";
import TabBar from "@/components/ui/TabBar";

// ─── Data ────────────────────────────────────────────────────────────────────

const RANGES = ["Today", "Yesterday", "Past 7 Days", "Past 30 Days", "This Month", "Last Month", "Custom..."] as const;
type Range = typeof RANGES[number] | string;

interface RangeData {
  total: string;
  delta: number;
  deltaLabel: string;
  bars: number[];
  labels: string[];
  barDates: string[];
  productsSold: number;
  avgPrice: string;
  gmvPerVideo: string;
  gmvPerLive: string;
  videoViews: string;
  productTypes: number;
}

const DATA_BY_RANGE: Record<string, RangeData> = {
  "Today": {
    total: "RM 142.00", delta: 23, deltaLabel: "vs yesterday",
    bars: [142], labels: ["Today"], barDates: ["Apr 24"],
    productsSold: 8, avgPrice: "RM 17.75",
    gmvPerVideo: "RM 48.30", gmvPerLive: "RM 112.50", videoViews: "2.4K",
    productTypes: 3,
  },
  "Yesterday": {
    total: "RM 115.40", delta: 8, deltaLabel: "vs Day Before",
    bars: [115], labels: ["Yesterday"], barDates: ["Apr 23"],
    productsSold: 6, avgPrice: "RM 19.23",
    gmvPerVideo: "RM 38.50", gmvPerLive: "RM 98.20", videoViews: "1.9K",
    productTypes: 2,
  },
  "Past 7 Days": {
    total: "RM 842.60", delta: 14, deltaLabel: "vs Previous 7 Days",
    bars: [85, 92, 78, 108, 142, 175, 162],
    labels: ["M","T","W","T","F","S","S"],
    barDates: ["Apr 18","Apr 19","Apr 20","Apr 21","Apr 22","Apr 23","Apr 24"],
    productsSold: 42, avgPrice: "RM 20.06",
    gmvPerVideo: "RM 58.20", gmvPerLive: "RM 142.00", videoViews: "14.3K",
    productTypes: 5,
  },
  "Past 30 Days": {
    total: "RM 3,612.00", delta: 31, deltaLabel: "vs Previous 30 Days",
    bars: [38,52,45,68,72,58,85,92,78,64,88,96,72,84,110,118,95,128,142,135,162,148,175,188,142,168,195,210,185,212],
    labels: ["1","5","10","15","20","25","30"],
    barDates: Array.from({length: 30}, (_, i) => i < 7 ? `Mar ${25 + i}` : `Apr ${i - 6}`),
    productsSold: 86, avgPrice: "RM 42.00",
    gmvPerVideo: "RM 68.40", gmvPerLive: "RM 215.00", videoViews: "247K",
    productTypes: 12,
  },
  "This Month": {
    total: "RM 2,480.00", delta: 18, deltaLabel: "vs Same Window Last Month",
    bars: [72,84,110,118,95,128,142,135,162,148,175,188,142,168,195,210,185,212,198,225,242,268,255,288],
    labels: ["1","5","10","15","20","24"],
    barDates: Array.from({length: 24}, (_, i) => `Apr ${i + 1}`),
    productsSold: 58, avgPrice: "RM 42.76",
    gmvPerVideo: "RM 72.10", gmvPerLive: "RM 245.00", videoViews: "168K",
    productTypes: 9,
  },
  "Last Month": {
    total: "RM 1,012.00", delta: -4, deltaLabel: "vs Month Prior",
    bars: [22,38,42,35,48,52,45,68,58,72,65,82,78,88,92,95,88,78,85,92,82,75,68,72,78,82,88,92,75,82,78],
    labels: ["1","5","10","15","20","25","30"],
    barDates: Array.from({length: 31}, (_, i) => `Mar ${i + 1}`),
    productsSold: 32, avgPrice: "RM 31.63",
    gmvPerVideo: "RM 42.00", gmvPerLive: "RM 128.00", videoViews: "98K",
    productTypes: 7,
  },
};

// ─── WithdrawSheet ────────────────────────────────────────────────────────────

function WithdrawSheet({ onClose }: { onClose: () => void }) {
  const [method, setMethod] = useState("maybank");
  const [amount, setAmount] = useState("842.00");

  const methods = [
    { id: "maybank", name: "Maybank",              num: "****4210",         badge: "Default",  fee: "Free",    eta: "1-2 days" },
    { id: "duitnow", name: "DuitNow",              num: "+60 12-*** 4210",  badge: "Instant",  fee: "RM 0.50", eta: "Instant" },
    { id: "tng",     name: "Touch 'n Go eWallet",  num: "****7823",         badge: null,       fee: "Free",    eta: "1 day" },
  ];

  const active = methods.find(m => m.id === method)!;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", alignItems: "flex-end", background: "rgba(13,17,23,0.55)", animation: "rzFade .2s ease-out" }}>
      <div style={{ background: RZ.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, width: "100%", maxHeight: "92%", overflowY: "auto", padding: "20px 20px 32px", animation: "rzSlideUp .32s cubic-bezier(.2,.7,.2,1)" }}>
        <div style={{ width: 40, height: 4, background: RZ.border, borderRadius: 2, margin: "0 auto 18px" }}/>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <div style={{ font: `800 22px/1 ${RZ.fontDisplay}`, color: RZ.black, letterSpacing: "-0.01em" }}>Withdraw Earnings</div>
          <button onClick={onClose} style={{ border: 0, background: RZ.canvas, borderRadius: 10, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={RZ.body} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
          </button>
        </div>

        {/* Available balance card */}
        <div style={{ background: "linear-gradient(135deg, #0d1117, #1a3d28)", borderRadius: 16, padding: 16, marginBottom: 16, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -30, right: -30, width: 120, height: 120, borderRadius: "50%", background: "radial-gradient(circle, rgba(0,192,115,0.4), transparent 70%)" }}/>
          <div style={{ position: "relative" }}>
            <div style={{ color: "rgba(255,255,255,0.65)", font: `600 10px/1 ${RZ.fontUI}`, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 8 }}>Available Balance</div>
            <div style={{ color: "#fff", font: `900 32px/1 ${RZ.fontDisplay}`, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>RM 842.00</div>
            <div style={{ color: "rgba(255,255,255,0.6)", font: `500 11px/1.3 ${RZ.fontUI}`, marginTop: 6 }}>Pending clearance: RM 142.00 · releases Apr 27</div>
          </div>
        </div>

        <div style={{ font: `700 12px/1 ${RZ.fontUI}`, color: RZ.muted, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 8 }}>Amount</div>
        <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 8, border: `1.5px solid ${RZ.border}`, borderRadius: 12, padding: "14px", marginBottom: 8 }}>
          <div style={{ font: `700 16px/1 ${RZ.fontDisplay}`, color: RZ.muted }}>RM</div>
          <input
            value={amount}
            onChange={e => setAmount(e.target.value)}
            style={{ flex: 1, minWidth: 0, paddingRight: 56, border: 0, outline: 0, font: `800 22px/1 ${RZ.fontDisplay}`, color: RZ.black, letterSpacing: "-0.02em", background: "transparent" }}
          />
          <button
            onClick={() => setAmount("842.00")}
            style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", padding: "6px 10px", borderRadius: 8, border: 0, background: RZ.greenTint, color: RZ.green, font: `800 10px/1 ${RZ.fontUI}`, letterSpacing: ".06em", cursor: "pointer" }}
          >MAX</button>
        </div>

        <div style={{ font: `700 12px/1 ${RZ.fontUI}`, color: RZ.muted, textTransform: "uppercase", letterSpacing: ".06em", margin: "18px 0 8px" }}>Payout Method</div>
        {methods.map(m => (
          <button
            key={m.id}
            onClick={() => setMethod(m.id)}
            style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 12, border: `1.5px solid ${method === m.id ? RZ.green : RZ.border}`, background: method === m.id ? "#f5fdf7" : RZ.white, marginBottom: 8, cursor: "pointer", textAlign: "left" }}
          >
            <div style={{ width: 36, height: 36, borderRadius: 10, background: RZ.canvas, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Icon name="wallet" size={16} color={RZ.green}/>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5, font: `700 13px/1.2 ${RZ.fontDisplay}`, color: RZ.black }}>
                {m.name}
                {m.badge && <span style={{ font: `800 8.5px/1 ${RZ.fontUI}`, color: RZ.green, background: RZ.greenTint, padding: "3px 6px", borderRadius: 4, letterSpacing: ".06em" }}>{m.badge}</span>}
              </div>
              <div style={{ font: `500 11px/1 ${RZ.fontUI}`, color: RZ.muted, marginTop: 4 }}>{m.num} · {m.eta} · Fee {m.fee}</div>
            </div>
            <div style={{ width: 18, height: 18, borderRadius: "50%", border: `2px solid ${method === m.id ? RZ.green : RZ.border}`, background: method === m.id ? RZ.green : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {method === m.id && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff" }}/>}
            </div>
          </button>
        ))}

        {/* Summary */}
        <div style={{ marginTop: 14, padding: 14, background: RZ.canvas, borderRadius: 12 }}>
          {([["Withdrawing", `RM ${amount}`], ["Processing Fee", active.fee], ["ETA", active.eta]] as [string,string][]).map(([k, v], i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", font: `500 12px/1 ${RZ.fontUI}`, color: RZ.body }}>
              <span>{k}</span>
              <span style={{ color: RZ.black, font: `700 12px/1 ${RZ.fontUI}` }}>{v}</span>
            </div>
          ))}
          <div style={{ borderTop: `1px dashed ${RZ.border}`, marginTop: 6, paddingTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ font: `700 13px/1 ${RZ.fontUI}`, color: RZ.black }}>You&apos;ll receive</span>
            <span style={{ font: `900 18px/1 ${RZ.fontDisplay}`, color: RZ.green, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>RM {amount}</span>
          </div>
        </div>

        <button
          onClick={onClose}
          style={{ marginTop: 16, width: "100%", padding: "14px 16px", borderRadius: 14, border: 0, background: RZ.green, color: "#fff", font: `800 14px/1 ${RZ.fontUI}`, cursor: "pointer", letterSpacing: ".02em", boxShadow: "0 10px 22px rgba(0,192,115,0.3)" }}
        >
          Confirm Withdrawal
        </button>
      </div>
    </div>
  );
}

// ─── ShareEarningsSheet ───────────────────────────────────────────────────────

function ShareEarningsSheet({ earnings, delta, deltaPositive, range, onClose }: { earnings: string; delta: number; deltaPositive: boolean; range: string; onClose: () => void }) {
  const platforms = [
    { id: "ig",   name: "Instagram", color: "#e1306c" },
    { id: "tt",   name: "TikTok",    color: "#0d1117" },
    { id: "fb",   name: "Facebook",  color: "#1877f2" },
    { id: "wa",   name: "WhatsApp",  color: "#25d366" },
    { id: "tw",   name: "X",         color: "#0d1117" },
    { id: "more", name: "More",      color: "#6b7280" },
  ];

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", alignItems: "flex-end", background: "rgba(13,17,23,0.6)", animation: "rzFade .2s ease-out" }}>
      <div style={{ background: RZ.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, width: "100%", padding: "20px 20px 32px", animation: "rzSlideUp .32s cubic-bezier(.2,.7,.2,1)" }}>
        <div style={{ width: 40, height: 4, background: RZ.border, borderRadius: 2, margin: "0 auto 18px" }}/>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div>
            <div style={{ font: `800 20px/1 ${RZ.fontDisplay}`, color: RZ.black, letterSpacing: "-0.01em" }}>Share Earnings</div>
            <div style={{ font: `500 11px/1.3 ${RZ.fontUI}`, color: RZ.muted, marginTop: 5 }}>Show your growth with Rezekii!</div>
          </div>
          <button onClick={onClose} style={{ border: 0, background: RZ.canvas, borderRadius: 10, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={RZ.body} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
          </button>
        </div>

        {/* Poster preview */}
        <div style={{ aspectRatio: "9 / 16", maxHeight: 360, borderRadius: 16, margin: "0 auto 16px", position: "relative", overflow: "hidden", background: "linear-gradient(135deg, #00c073 0%, #009a5c 40%, #007a48 100%)", boxShadow: "0 16px 40px rgba(0,192,115,0.3)" }}>
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", padding: 20, color: "#fff" }}>
            <div style={{ font: `900 10px/1 ${RZ.fontUI}`, letterSpacing: ".12em", textTransform: "uppercase", color: "rgba(255,255,255,0.7)", marginBottom: 8 }}>My Earnings</div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <div style={{ font: `900 68px/1 ${RZ.fontDisplay}`, letterSpacing: "-0.04em", marginBottom: 8, fontVariantNumeric: "tabular-nums" }}>{earnings}</div>
              <div style={{ font: `700 15px/1 ${RZ.fontUI}`, color: "rgba(255,255,255,0.85)", marginBottom: 16 }}>{range}</div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 999, background: "rgba(255,255,255,0.2)", font: `800 14px/1 ${RZ.fontUI}` }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                  {deltaPositive ? <path d="M7 17L17 7M17 7H9M17 7v8"/> : <path d="M17 7L7 17M7 17h8M7 17V9"/>}
                </svg>
                {Math.abs(delta)}% Growth
              </div>
              <div style={{ font: `500 11px/1.35 ${RZ.fontUI}`, color: "rgba(255,255,255,0.75)", marginTop: 16, textAlign: "center" }}>Creating content with</div>
              <div style={{ font: `900 16px/1 ${RZ.fontDisplay}`, marginTop: 5, letterSpacing: "-0.01em" }}>Rezekii</div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", font: `700 9px/1 ${RZ.fontUI}`, color: "rgba(255,255,255,0.7)" }}>
              <span>@aisyah.reviews</span>
              <span style={{ background: "rgba(255,255,255,0.2)", color: "#fff", padding: "3px 6px", borderRadius: 4, letterSpacing: ".06em" }}>JOIN REZEKII</span>
            </div>
          </div>
        </div>

        {/* Platform grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 14 }}>
          {platforms.map(p => (
            <button key={p.id} style={{ border: 0, background: "transparent", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 7, padding: "6px 0" }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: p.color, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 6px 14px ${p.color}55` }}>
                {p.id === "ig"   && <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="5" stroke="#fff" strokeWidth="2"/><circle cx="12" cy="12" r="4" stroke="#fff" strokeWidth="2"/><circle cx="17.5" cy="6.5" r="1" fill="#fff"/></svg>}
                {p.id === "tt"   && <svg width="22" height="22" viewBox="0 0 24 24" fill="#fff"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005.8 20.1a6.34 6.34 0 0010.86-4.43V9.01a8.16 8.16 0 004.77 1.52V7.09a4.85 4.85 0 01-1.84-.4z"/></svg>}
                {p.id === "fb"   && <svg width="22" height="22" viewBox="0 0 24 24" fill="#fff"><path d="M14 9h3V6h-3c-2 0-3 1-3 3v2H9v3h2v7h3v-7h2.5l.5-3H14V9z"/></svg>}
                {p.id === "wa"   && <svg width="22" height="22" viewBox="0 0 24 24" fill="#fff"><path d="M17.6 6.3A7.9 7.9 0 0012 4a8 8 0 00-6.8 12.1L4 21l5-1.3A8 8 0 0020 12a7.9 7.9 0 00-2.4-5.7zm-5.6 12.3a6.6 6.6 0 01-3.4-.9l-.2-.1-2.5.6.7-2.4-.2-.3A6.6 6.6 0 1112 18.6zm3.5-4.6c-.2-.1-1.1-.6-1.3-.6l-.4-.1c-.2 0-.3.1-.4.2l-.6.7c-.1.1-.2.2-.4.1a5.4 5.4 0 01-1.6-1 6.2 6.2 0 01-1.2-1.5.3.3 0 01.1-.4l.3-.3.2-.3.1-.3v-.2l-.5-1.3c-.1-.3-.3-.3-.4-.3H9c-.2 0-.4 0-.6.2a1.8 1.8 0 00-.6 1.3 3.3 3.3 0 00.6 1.7A7.2 7.2 0 0011.3 15c.4.2.8.3 1.1.4.5.1.9.1 1.3 0a2.1 2.1 0 001.4-1c.2-.4.2-.7.1-.8l-.2-.1z"/></svg>}
                {p.id === "tw"   && <svg width="22" height="22" viewBox="0 0 24 24" fill="#fff"><path d="M17.5 3h3l-6.6 7.6L22 21h-6.2l-4.9-6.4L5 21H2l7.1-8.1L2 3h6.3l4.4 5.8L17.5 3zm-1 16h1.7L7.6 4.8H5.9L16.5 19z"/></svg>}
                {p.id === "more" && <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="5" cy="12" r="1.5" fill="#fff"/><circle cx="12" cy="12" r="1.5" fill="#fff"/><circle cx="19" cy="12" r="1.5" fill="#fff"/></svg>}
              </div>
              <div style={{ font: `600 11px/1 ${RZ.fontUI}`, color: RZ.body }}>{p.name}</div>
            </button>
          ))}
        </div>

        <button
          onClick={onClose}
          style={{ width: "100%", padding: "13px 16px", borderRadius: 12, border: `1.5px solid ${RZ.border}`, background: RZ.white, color: RZ.black, font: `700 13px/1 ${RZ.fontUI}`, cursor: "pointer" }}
        >
          Save Image To Camera Roll
        </button>
      </div>
    </div>
  );
}

// ─── PostAnalyticsSheet ───────────────────────────────────────────────────────

interface PostData {
  caption: string;
  views: string;
  gmv: string;
  duration: string;
  img: string;
  url: string;
  tag: string;
  tagColor: string;
}

function PostAnalyticsSheet({ post, onClose }: { post: PostData; onClose: () => void }) {
  const [timeframe, setTimeframe] = useState("Last 7 Days");
  const [tfOpen, setTfOpen] = useState(false);
  const timeframes = ["Last 7 Days", "Last 30 Days", "All Time", "Custom"];

  const analytics = {
    totalViews: "10,247", totalGMV: post.gmv, totalCommission: "RM 28.40",
    commissionRate: "20%", ctr: "3.8%", totalImpressions: "42,180",
    reach: "38,920", avgWatchTime: "18s", watchPercent: "64%",
    likes: "1,284", comments: "142", shares: "89", saves: "203",
    productClicks: "1,603", uniqueViewers: "8,941",
  };

  const metrics = [
    { label: "Total Views",       value: analytics.totalViews,       icon: "trend",  color: RZ.green,    growth: 18 },
    { label: "GMV Generated",     value: analytics.totalGMV,         icon: "wallet", color: "#8b5cf6",   growth: 12 },
    { label: "Est. Commission",   value: analytics.totalCommission,  icon: "bag",    color: RZ.green,    growth: 12 },
    { label: "Commission Rate",   value: analytics.commissionRate,   icon: "trend",  color: "#f5a623",   growth: 0  },
    { label: "CTR",               value: analytics.ctr,              icon: "play",   color: "#e8005a",   growth: 5  },
    { label: "Total Impressions", value: analytics.totalImpressions, icon: "trend",  color: RZ.cyanText, growth: 22 },
    { label: "Reach",             value: analytics.reach,            icon: "trend",  color: "#8b5cf6",   growth: 19 },
    { label: "Avg Watch Time",    value: analytics.avgWatchTime,     icon: "play",   color: "#f5a623",   growth: -3 },
  ] as const;

  const engagementItems = [
    { label: "Likes",    value: analytics.likes,    emoji: "❤️" },
    { label: "Comments", value: analytics.comments, emoji: "💬" },
    { label: "Shares",   value: analytics.shares,   emoji: "↗️" },
    { label: "Saves",    value: analytics.saves,    emoji: "🔖" },
  ];

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 70, display: "flex", alignItems: "flex-end", background: "rgba(13,17,23,0.6)", animation: "rzFade .2s ease-out" }}>
      <div style={{ background: RZ.canvas, borderTopLeftRadius: 24, borderTopRightRadius: 24, width: "100%", maxHeight: "90%", display: "flex", flexDirection: "column", animation: "rzSlideUp .32s cubic-bezier(.2,.7,.2,1)" }}>
        {/* Header */}
        <div style={{ padding: "20px 20px 0", background: RZ.white, borderTopLeftRadius: 24, borderTopRightRadius: 24 }}>
          <div style={{ width: 40, height: 4, background: RZ.border, borderRadius: 2, margin: "0 auto 18px" }}/>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ font: `800 19px/1.2 ${RZ.fontDisplay}`, color: RZ.black, letterSpacing: "-0.01em", marginBottom: 5 }}>Post Analytics</div>
              <div style={{ font: `500 11.5px/1.3 ${RZ.fontUI}`, color: RZ.muted, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const, overflow: "hidden" } as React.CSSProperties}>{post.caption}</div>
            </div>
            <button onClick={onClose} style={{ border: 0, background: RZ.canvas, borderRadius: 10, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, marginLeft: 10 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={RZ.body} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
            </button>
          </div>
          {/* Timeframe selector */}
          <div style={{ position: "relative", marginBottom: 14 }}>
            <button
              onClick={() => setTfOpen(o => !o)}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 999, background: RZ.canvas, border: `1px solid ${RZ.border}`, font: `600 11.5px/1 ${RZ.fontUI}`, color: RZ.black, cursor: "pointer" }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={RZ.muted} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>
              {timeframe}
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={RZ.muted} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" style={{ transform: tfOpen ? "rotate(180deg)" : "none", transition: "transform .2s" }}><path d="M6 9l6 6 6-6"/></svg>
            </button>
            {tfOpen && (
              <div style={{ position: "absolute", top: 38, left: 0, zIndex: 10, background: "#fff", borderRadius: 12, boxShadow: "0 20px 40px rgba(13,17,23,0.18), 0 4px 10px rgba(13,17,23,0.08)", border: "1px solid rgba(13,17,23,0.06)", overflow: "hidden", minWidth: 140, animation: "earnDropIn .18s ease-out" }}>
                {timeframes.map(tf => (
                  <button key={tf} onClick={() => { setTimeframe(tf); setTfOpen(false); }} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, width: "100%", padding: "10px 12px", border: 0, background: tf === timeframe ? RZ.canvas : "#fff", font: `${tf === timeframe ? "700" : "500"} 11.5px/1 ${RZ.fontUI}`, color: tf === timeframe ? RZ.black : RZ.body, cursor: "pointer", textAlign: "left" }}>
                    {tf}
                    {tf === timeframe && <Icon name="check" size={12} color={RZ.green} strokeWidth={3}/>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px 32px" }}>
          {/* Key metrics */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
            {metrics.map((m, i) => (
              <div key={i} style={{ background: RZ.white, border: `1.5px solid ${RZ.border}`, borderRadius: 16, padding: 12 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <div style={{ width: 20, height: 20, borderRadius: 6, background: `${m.color}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon name={m.icon as Parameters<typeof Icon>[0]["name"]} size={11} color={m.color}/>
                  </div>
                  {m.growth !== 0 && (
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 2, padding: "2px 5px", borderRadius: 999, background: m.growth >= 0 ? "rgba(0,192,115,0.1)" : "rgba(232,0,90,0.1)", font: `700 8px/1 ${RZ.fontUI}`, color: m.growth >= 0 ? RZ.green : "#e8005a" }}>
                      <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke={m.growth >= 0 ? RZ.green : "#e8005a"} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                        {m.growth >= 0 ? <path d="M7 17L17 7M17 7H9M17 7v8"/> : <path d="M17 7L7 17M7 17h8M7 17V9"/>}
                      </svg>
                      {Math.abs(m.growth)}%
                    </div>
                  )}
                </div>
                <div style={{ font: `800 17px/1 ${RZ.fontDisplay}`, color: RZ.black, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums", marginBottom: 5 }}>{m.value}</div>
                <div style={{ font: `600 9.5px/1.25 ${RZ.fontUI}`, color: RZ.muted, textTransform: "uppercase", letterSpacing: ".06em" }}>{m.label}</div>
              </div>
            ))}
          </div>

          {/* Engagement */}
          <div style={{ font: `700 14px/1 ${RZ.fontDisplay}`, color: RZ.black, marginBottom: 10, letterSpacing: "-0.01em" }}>Engagement</div>
          <div style={{ background: RZ.white, borderRadius: 14, border: `1.5px solid ${RZ.border}`, padding: 14, marginBottom: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
              {engagementItems.map((e, i) => (
                <div key={i} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 20, marginBottom: 4 }}>{e.emoji}</div>
                  <div style={{ font: `800 15px/1 ${RZ.fontDisplay}`, color: RZ.black, letterSpacing: "-0.01em", marginBottom: 3, fontVariantNumeric: "tabular-nums" }}>{e.value}</div>
                  <div style={{ font: `600 9px/1 ${RZ.fontUI}`, color: RZ.muted, textTransform: "uppercase", letterSpacing: ".06em" }}>{e.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Additional insights */}
          <div style={{ font: `700 14px/1 ${RZ.fontDisplay}`, color: RZ.black, marginBottom: 10, letterSpacing: "-0.01em" }}>Additional Insights</div>
          <div style={{ background: RZ.white, borderRadius: 14, border: `1.5px solid ${RZ.border}`, padding: 14 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[["Product Clicks", analytics.productClicks], ["Unique Viewers", analytics.uniqueViewers], ["Avg Watch %", analytics.watchPercent]].map(([k, v], i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ font: `600 12px/1 ${RZ.fontUI}`, color: RZ.muted }}>{k}</div>
                  <div style={{ font: `800 14px/1 ${RZ.fontDisplay}`, color: RZ.black, fontVariantNumeric: "tabular-nums" }}>{v}</div>
                </div>
              ))}
            </div>
          </div>

          <a href={post.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", display: "block", marginTop: 16 }}>
            <button style={{ width: "100%", padding: "13px 16px", borderRadius: 12, border: `1.5px solid ${RZ.border}`, background: RZ.white, color: RZ.black, font: `700 13px/1 ${RZ.fontUI}`, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#25f4ee"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005.8 20.1a6.34 6.34 0 0010.86-4.43V9.01a8.16 8.16 0 004.77 1.52V7.09a4.85 4.85 0 01-1.84-.4z"/></svg>
              View on TikTok
            </button>
          </a>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function EarningsPage() {
  const [range, setRange] = useState<Range>("Past 30 Days");
  const [rangeOpen, setRangeOpen] = useState(false);
  const [calOpen, setCalOpen] = useState(false);
  const [calStart, setCalStart] = useState<number | null>(null);
  const [calEnd,   setCalEnd]   = useState<number | null>(null);
  const [calMonth, setCalMonth] = useState(3);  // April (0-indexed)
  const [calYear,  setCalYear]  = useState(2026);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [shareOpen,    setShareOpen]    = useState(false);
  const [hoverIdx,     setHoverIdx]     = useState<number | null>(null);
  const [postAnalytics, setPostAnalytics] = useState<PostData | null>(null);

  const d: RangeData = DATA_BY_RANGE[range] ?? DATA_BY_RANGE["Past 30 Days"];
  const bars  = d.bars;
  const maxH  = Math.max(...bars);
  const deltaPositive = d.delta >= 0;

  // Niches
  const niches = [
    { name: "Beauty",  pct: 48, gmv: "RM 1,733.76", color: "#e8005a" },
    { name: "Food",    pct: 22, gmv: "RM 794.64",   color: "#f5a623" },
    { name: "Fashion", pct: 18, gmv: "RM 650.16",   color: "#8b5cf6" },
    { name: "Tech",    pct: 12, gmv: "RM 433.44",   color: "#25f4ee" },
  ];

  const topProducts = [
    { name: "Glow Serum 30ml",   cat: "Beauty", gmv: "RM 682.00", units: 38, img: "/product-beauty.jpg"    },
    { name: "Matte Lip Tint",    cat: "Beauty", gmv: "RM 425.60", units: 22, img: "/product-accessory.jpg" },
    { name: "Nasi Lemak Sambal", cat: "Food",   gmv: "RM 378.00", units: 18, img: "/product-food.jpg"      },
  ];

  const topPosts: PostData[] = [
    { caption: "Glow Serum review · ASMR unboxing", views: "10.2K", gmv: "RM 142.00", duration: "0:28", img: "/product-beauty.jpg",  url: "https://www.tiktok.com/@aisyahrahman/video/7361284928374651221", tag: "Highest Earning", tagColor: "#f5a623" },
    { caption: "Batik Tote OOTD haul",               views: "8.8K",  gmv: "RM 96.00",  duration: "0:42", img: "/product-fashion.jpg", url: "https://www.tiktok.com/@aisyahrahman/video/7361284928374651222", tag: "Best Selling",    tagColor: RZ.green   },
    { caption: "AudioMY ProBuds blind test",         views: "6.4K",  gmv: "RM 72.00",  duration: "0:35", img: "/product-tech.jpg",    url: "https://www.tiktok.com/@aisyahrahman/video/7361284928374651223", tag: "Newly Viral",     tagColor: "#e8005a"  },
  ];

  const primaryStats = [
    { label: "Products Sold",      value: String(d.productsSold), icon: "bag",    tone: RZ.green,     growth: 24 },
    { label: "Avg Product GMV",    value: d.avgPrice,             icon: "wallet", tone: "#8b5cf6",    growth: 12 },
    { label: "Avg GMV / Video",    value: d.gmvPerVideo,          icon: "play",   tone: "#e8005a",    growth: -3 },
    { label: "Avg GMV / Live",     value: d.gmvPerLive,           icon: "trend",  tone: "#f5a623",    growth: 18 },
    { label: "Avg Video Views",    value: d.videoViews,           icon: "trend",  tone: RZ.cyanText,  growth: 31 },
    { label: "Product Types Sold", value: String(d.productTypes), icon: "pkg",    tone: RZ.green,     growth: 8  },
  ] as const;

  // Calendar helpers
  const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];

  const buildCalCells = () => {
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const firstDow = new Date(calYear, calMonth, 1).getDay();
    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDow; i++) cells.push(null);
    for (let dd = 1; dd <= daysInMonth; dd++) cells.push(dd);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  };

  const pickDay = (dd: number | null) => {
    if (!dd) return;
    if (calStart == null || (calStart != null && calEnd != null)) { setCalStart(dd); setCalEnd(null); }
    else if (dd < calStart) { setCalStart(dd); }
    else { setCalEnd(dd); }
  };

  const inRange = (dd: number | null) => {
    if (!dd || calStart == null) return false;
    const s = calStart, e = calEnd ?? calStart;
    return dd > Math.min(s, e) && dd < Math.max(s, e);
  };

  const isEndpoint = (dd: number | null) => dd != null && (dd === calStart || dd === calEnd);

  const applyRange = () => {
    if (calStart != null) {
      const s = Math.min(calStart, calEnd ?? calStart);
      const e = Math.max(calStart, calEnd ?? calStart);
      const mName = monthNames[calMonth].slice(0, 3);
      setRange(`${mName} ${s} - ${e}`);
    }
    setCalOpen(false);
  };

  // Donut chart
  const SIZE = 132, STROKE = 22;
  const R = (SIZE - STROKE) / 2;
  const C = 2 * Math.PI * R;
  let acc = 0;
  const slices = niches.map(n => {
    const len = (n.pct / 100) * C;
    const dasharray = `${len} ${C - len}`;
    const dashoffset = -acc + C / 4;
    acc += len;
    return { ...n, dasharray, dashoffset };
  });

  return (
    <div style={{ position: "fixed", inset: 0, background: RZ.canvas, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <style>{`
        @keyframes earnDropIn { from { opacity: 0; transform: translateY(-6px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes earnBarRise { from { transform: scaleY(0); } to { transform: scaleY(1); } }
        @keyframes rzFade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes rzSlideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
      `}</style>

      {/* ─── COMPACT TOP BAR ──────────────────────────────────────────── */}
      <div style={{ padding: "56px 20px 14px", background: RZ.white, position: "relative", flexShrink: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ font: `800 26px/1 ${RZ.fontDisplay}`, color: RZ.black, letterSpacing: "-0.01em" }}>Earnings</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", position: "relative" }}>
            {/* Share button */}
            <button
              onClick={() => setShareOpen(true)}
              style={{ width: 36, height: 36, borderRadius: 10, background: RZ.canvas, border: 0, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={RZ.black} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13"/>
              </svg>
            </button>

            {/* Range filter pill */}
            <button
              onClick={() => setRangeOpen(o => !o)}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 999, background: "#f5fdf7", border: `1px solid ${RZ.border}`, font: `700 12px/1 ${RZ.fontUI}`, color: RZ.black, cursor: "pointer", letterSpacing: "-0.005em" }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={RZ.green} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>
              {range}
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={RZ.muted} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" style={{ transform: rangeOpen ? "rotate(180deg)" : "none", transition: "transform .2s" }}><path d="M6 9l6 6 6-6"/></svg>
            </button>

            {/* Dropdown */}
            {rangeOpen && (
              <div style={{ position: "absolute", top: 44, right: 0, zIndex: 20, background: "#fff", borderRadius: 12, boxShadow: "0 20px 40px rgba(13,17,23,0.18), 0 4px 10px rgba(13,17,23,0.08)", border: "1px solid rgba(13,17,23,0.06)", overflow: "hidden", minWidth: 168, animation: "earnDropIn .18s ease-out" }}>
                {RANGES.map(r => (
                  <button
                    key={r}
                    onClick={() => { setRange(r); setRangeOpen(false); if (r === "Custom...") setCalOpen(true); }}
                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, width: "100%", padding: "10px 12px", border: 0, background: r === range ? "#f5fdf7" : "#fff", font: `${r === range ? "700" : "500"} 12px/1 ${RZ.fontUI}`, color: r === range ? RZ.green : RZ.black, cursor: "pointer", textAlign: "left" }}
                  >
                    {r}
                    {r === range && <Icon name="check" size={13} color={RZ.green} strokeWidth={3}/>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── SCROLL BODY ──────────────────────────────────────────────── */}
      <div style={{ flex: 1, minHeight: 0, overflowY: "scroll", WebkitOverflowScrolling: "touch", padding: "4px 16px 100px" } as React.CSSProperties}>

        {/* Hero earnings */}
        <div style={{ padding: "8px 4px 16px" }}>
          <div style={{ font: `500 11px/1 ${RZ.fontUI}`, color: RZ.muted, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 6 }}>Total · {range}</div>
          <div style={{ font: `800 38px/1 ${RZ.fontDisplay}`, color: RZ.black, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>{d.total}</div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 8, padding: "4px 9px", borderRadius: 999, background: deltaPositive ? RZ.greenTint : "rgba(232,0,90,0.09)", color: deltaPositive ? RZ.green : "#e8005a", font: `700 12px/1 ${RZ.fontUI}` }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={deltaPositive ? RZ.green : "#e8005a"} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
              {deltaPositive ? <path d="M7 17L17 7M17 7H9M17 7v8"/> : <path d="M17 7L7 17M7 17h8M7 17V9"/>}
            </svg>
            {Math.abs(d.delta)}% {d.deltaLabel}
          </div>
        </div>

        {/* Interactive bar chart */}
        <div style={{ background: RZ.white, border: `1.5px solid ${RZ.border}`, borderRadius: 16, padding: 14, marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
            <div style={{ font: `700 13px/1 ${RZ.fontDisplay}`, color: RZ.black }}>Daily Sales Trend</div>
            <div style={{ font: `500 10px/1 ${RZ.fontUI}`, color: RZ.muted }}>Tap A Bar To Reveal GMV</div>
          </div>

          <div style={{ position: "relative", paddingTop: hoverIdx != null ? 38 : 0, transition: "padding .18s" }}>
            {/* Tooltip */}
            {hoverIdx != null && bars[hoverIdx] != null && (() => {
              const pct = (hoverIdx + 0.5) / bars.length;
              const tipValue = bars[hoverIdx];
              const tipDate = d.barDates[hoverIdx] ?? d.labels[hoverIdx] ?? `Day ${hoverIdx + 1}`;
              const leftPct = Math.max(12, Math.min(88, pct * 100));
              return (
                <div style={{ position: "absolute", top: 0, left: `${leftPct}%`, transform: "translateX(-50%)", background: RZ.black, color: RZ.white, borderRadius: 8, padding: "6px 10px", font: `700 11px/1.2 ${RZ.fontUI}`, whiteSpace: "nowrap", boxShadow: "0 6px 14px rgba(13,17,23,0.25)", animation: "earnDropIn .14s ease-out", zIndex: 2 }}>
                  <div style={{ color: "rgba(255,255,255,0.7)", font: `500 9px/1 ${RZ.fontUI}`, letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 3 }}>{tipDate}</div>
                  <div style={{ font: `800 13px/1 ${RZ.fontDisplay}`, fontVariantNumeric: "tabular-nums" }}>RM {tipValue.toFixed(2)}</div>
                  <div style={{ position: "absolute", bottom: -4, left: "50%", transform: "translateX(-50%) rotate(45deg)", width: 8, height: 8, background: RZ.black }}/>
                </div>
              );
            })()}

            <div style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
              {/* Y-axis labels */}
              <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", paddingBottom: 2, minWidth: 32 }}>
                {[maxH, maxH * 0.5, 0].map((val, i) => (
                  <div key={i} style={{ font: `500 9px/1 ${RZ.fontUI}`, color: RZ.muted, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{Math.round(val)}</div>
                ))}
              </div>

              {/* Bars */}
              <div style={{ flex: 1, position: "relative" }}>
                <div
                  style={{ display: "flex", alignItems: "flex-end", gap: bars.length > 14 ? 2 : 5, height: 120, position: "relative" }}
                  onMouseLeave={() => setHoverIdx(null)}
                >
                  {bars.map((h, i) => {
                    const isHover = hoverIdx === i;
                    return (
                      <div
                        key={i}
                        onMouseEnter={() => setHoverIdx(i)}
                        onClick={() => setHoverIdx(i === hoverIdx ? null : i)}
                        onTouchStart={() => setHoverIdx(i)}
                        style={{
                          flex: 1,
                          height: `${(h / maxH) * 100}%`,
                          background: isHover ? "linear-gradient(180deg,#00c073,#009a5c)" : "rgba(13,17,23,0.10)",
                          borderRadius: 4,
                          transformOrigin: "bottom",
                          animation: `earnBarRise .5s cubic-bezier(.3,1.4,.4,1) ${i * 0.012}s both`,
                          transition: "background .15s, filter .15s",
                          filter: isHover ? "brightness(1.05)" : "none",
                          cursor: "pointer",
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* X-axis labels */}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, paddingLeft: 40, font: `500 10px/1 ${RZ.fontUI}`, color: RZ.muted }}>
            {d.labels.map((l, i) => <span key={i}>{l}</span>)}
          </div>
        </div>

        {/* Primary stats grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 18 }}>
          {primaryStats.map((s, i) => (
            <div key={i} style={{ background: RZ.white, border: `1.5px solid ${RZ.border}`, borderRadius: 16, padding: 12 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <div style={{ width: 22, height: 22, borderRadius: 6, background: `${s.tone}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon name={s.icon as Parameters<typeof Icon>[0]["name"]} size={12} color={s.tone}/>
                </div>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 3, padding: "3px 6px", borderRadius: 999, background: s.growth >= 0 ? "rgba(0,192,115,0.1)" : "rgba(232,0,90,0.1)", font: `700 9px/1 ${RZ.fontUI}`, color: s.growth >= 0 ? RZ.green : "#e8005a" }}>
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke={s.growth >= 0 ? RZ.green : "#e8005a"} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                    {s.growth >= 0 ? <path d="M7 17L17 7M17 7H9M17 7v8"/> : <path d="M17 7L7 17M7 17h8M7 17V9"/>}
                  </svg>
                  {Math.abs(s.growth)}%
                </div>
              </div>
              <div style={{ font: `800 20px/1 ${RZ.fontDisplay}`, color: RZ.black, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>{s.value}</div>
              <div style={{ font: `600 10px/1.25 ${RZ.fontUI}`, color: RZ.muted, marginTop: 6, textTransform: "uppercase", letterSpacing: ".06em" }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Withdraw button */}
        <button
          onClick={() => setWithdrawOpen(true)}
          style={{ width: "100%", padding: "14px 16px", borderRadius: 16, border: 0, background: "linear-gradient(135deg, #00c073 0%, #009a5c 100%)", color: RZ.white, cursor: "pointer", font: `800 15px/1 ${RZ.fontUI}`, letterSpacing: "-0.005em", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, boxShadow: "0 10px 22px rgba(0,192,115,0.30)", marginBottom: 20 }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(255,255,255,0.22)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name="wallet" size={18} color={RZ.white}/>
            </div>
            <div style={{ textAlign: "left" }}>
              <div style={{ font: `600 10px/1 ${RZ.fontUI}`, opacity: 0.82, letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 4 }}>Available To Withdraw</div>
              <div style={{ font: `900 18px/1 ${RZ.fontDisplay}`, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>RM 842.00</div>
            </div>
          </div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "7px 12px", borderRadius: 999, background: "rgba(255,255,255,0.22)", font: `800 12px/1 ${RZ.fontUI}`, letterSpacing: ".06em" }}>
            WITHDRAW
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
          </div>
        </button>

        {/* Top Selling Niche */}
        <div style={{ font: `700 16px/1 ${RZ.fontDisplay}`, color: RZ.black, marginBottom: 10, letterSpacing: "-0.01em" }}>Top Selling Niche</div>
        <div style={{ background: RZ.white, border: `1.5px solid ${RZ.border}`, borderRadius: 16, padding: 16, marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {/* Donut */}
            <div style={{ position: "relative", width: SIZE, height: SIZE, flexShrink: 0 }}>
              <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} style={{ transform: "rotate(-90deg)" }}>
                <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" stroke={RZ.canvas} strokeWidth={STROKE}/>
                {slices.map((s, i) => (
                  <circle key={i} cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" stroke={s.color} strokeWidth={STROKE} strokeDasharray={s.dasharray} strokeDashoffset={s.dashoffset} strokeLinecap="butt"/>
                ))}
              </svg>
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
                <div style={{ font: `600 8.5px/1 ${RZ.fontUI}`, color: RZ.muted, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 3 }}>Mix</div>
                <div style={{ font: `900 17px/1 ${RZ.fontDisplay}`, color: RZ.black, letterSpacing: "-0.02em" }}>{niches.length}</div>
                <div style={{ font: `600 8.5px/1.1 ${RZ.fontUI}`, color: RZ.muted, marginTop: 3 }}>niches</div>
              </div>
            </div>
            {/* Legend */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
              {niches.map((n, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 9, height: 9, borderRadius: 2, background: n.color, flexShrink: 0 }}/>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ font: `700 12.5px/1 ${RZ.fontDisplay}`, color: RZ.black, letterSpacing: "-0.005em" }}>{n.name}</div>
                    <div style={{ font: `500 10.5px/1 ${RZ.fontUI}`, color: RZ.muted, marginTop: 3, fontVariantNumeric: "tabular-nums" }}>{n.pct}% · {n.gmv}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Selling Products */}
        <div style={{ font: `700 16px/1 ${RZ.fontDisplay}`, color: RZ.black, marginBottom: 10, letterSpacing: "-0.01em" }}>Top Selling Products</div>
        {topProducts.map((p, i) => (
          <div key={i} style={{ background: RZ.white, border: `1.5px solid ${RZ.border}`, borderRadius: 16, display: "flex", gap: 12, alignItems: "center", marginBottom: 8, padding: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: i === 0 ? "#f5a623" : i === 1 ? "#c0c7cf" : "#d4936a", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", font: `900 13px/1 ${RZ.fontDisplay}`, flexShrink: 0, boxShadow: "0 3px 8px rgba(0,0,0,0.12)" }}>{i + 1}</div>
            <div style={{ width: 42, height: 42, borderRadius: 8, overflow: "hidden", flexShrink: 0, boxShadow: "inset 0 0 0 1px rgba(13,17,23,0.06)", background: RZ.canvas }}>
              <img src={p.img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}/>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ font: `700 13.5px/1.2 ${RZ.fontDisplay}`, color: RZ.black, letterSpacing: "-0.005em" }}>{p.name}</div>
              <div style={{ font: `500 11px/1 ${RZ.fontUI}`, color: RZ.muted, marginTop: 3 }}>{p.cat} · {p.units} units</div>
            </div>
            <div style={{ font: `800 14px/1 ${RZ.fontDisplay}`, color: RZ.green, letterSpacing: "-0.01em", fontVariantNumeric: "tabular-nums" }}>{p.gmv}</div>
          </div>
        ))}

        {/* Top Performing Posts */}
        <div style={{ font: `700 16px/1 ${RZ.fontDisplay}`, color: RZ.black, marginTop: 20, marginBottom: 4, letterSpacing: "-0.01em" }}>Top Performing Posts</div>
        <div style={{ font: `500 11px/1.3 ${RZ.fontUI}`, color: RZ.muted, marginBottom: 10 }}>Ranked By GMV Generated · {range}</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {topPosts.map((post, i) => (
            <button
              key={i}
              onClick={() => setPostAnalytics(post)}
              style={{ textDecoration: "none", border: 0, padding: 0, background: "transparent", cursor: "pointer", textAlign: "left" }}
            >
              <div style={{ background: RZ.white, borderRadius: 14, border: `1.5px solid ${RZ.border}`, overflow: "hidden" }}>
                {/* TikTok thumbnail 9:16 */}
                <div style={{ position: "relative", width: "100%", aspectRatio: "9 / 12", background: "#0d1117", overflow: "hidden" }}>
                  <img src={post.img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", filter: "brightness(0.88)" }}/>
                  {/* TikTok badge */}
                  <div style={{ position: "absolute", top: 8, right: 8, padding: "3px 6px", borderRadius: 5, background: "rgba(0,0,0,0.55)", color: "#fff", font: `700 9px/1 ${RZ.fontUI}`, letterSpacing: ".04em", display: "inline-flex", alignItems: "center", gap: 3 }}>
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="#25f4ee"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005.8 20.1a6.34 6.34 0 0010.86-4.43V9.01a8.16 8.16 0 004.77 1.52V7.09a4.85 4.85 0 01-1.84-.4z"/></svg>
                    TikTok
                  </div>
                  {/* Duration */}
                  <div style={{ position: "absolute", bottom: 8, left: 8, padding: "2px 6px", borderRadius: 4, background: "rgba(0,0,0,0.55)", color: "#fff", font: `700 9px/1 ${RZ.fontUI}`, fontVariantNumeric: "tabular-nums" }}>{post.duration}</div>
                  {/* Tag badge */}
                  <div style={{ position: "absolute", top: 8, left: 8, padding: "4px 7px", borderRadius: 6, background: post.tagColor, color: "#fff", font: `800 9px/1 ${RZ.fontUI}`, letterSpacing: ".06em", textTransform: "uppercase", boxShadow: `0 3px 8px ${post.tagColor}55` }}>{post.tag}</div>
                  {/* Play button */}
                  <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 38, height: 38, borderRadius: "50%", background: "rgba(255,255,255,0.9)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 10px rgba(0,0,0,0.3)" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="#0d1117"><path d="M8 5v14l11-7z"/></svg>
                  </div>
                </div>
                <div style={{ padding: 9 }}>
                  <div style={{ font: `700 11.5px/1.3 ${RZ.fontDisplay}`, color: RZ.black, letterSpacing: "-0.005em", marginBottom: 5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const, overflow: "hidden" } as React.CSSProperties}>{post.caption}</div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, font: `500 10px/1 ${RZ.fontUI}`, color: RZ.muted }}>
                    <span>{post.views} views</span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 3, color: RZ.green, font: `700 10px/1 ${RZ.fontUI}` }}>
                      Details
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={RZ.green} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
                    </span>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ─── TAB BAR ───────────────────────────────────────────────────── */}
      <TabBar active="earnings"/>

      {/* ─── OVERLAYS ──────────────────────────────────────────────────── */}
      {postAnalytics && <PostAnalyticsSheet post={postAnalytics} onClose={() => setPostAnalytics(null)}/>}
      {withdrawOpen  && <WithdrawSheet onClose={() => setWithdrawOpen(false)}/>}
      {shareOpen     && (
        <ShareEarningsSheet
          earnings={d.total}
          delta={d.delta}
          deltaPositive={deltaPositive}
          range={range}
          onClose={() => setShareOpen(false)}
        />
      )}

      {/* ─── CUSTOM DATE-RANGE CALENDAR ───────────────────────────────── */}
      {calOpen && (() => {
        const cells = buildCalCells();
        return (
          <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, background: "rgba(13,17,23,0.5)", animation: "earnDropIn .22s ease-out" }}>
            <div style={{ background: "#fff", borderRadius: 18, width: "100%", maxWidth: 320, overflow: "hidden", boxShadow: "0 30px 60px rgba(13,17,23,0.4)" }}>
              <div style={{ padding: "16px 18px 8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ font: `800 15px/1 ${RZ.fontDisplay}`, color: RZ.black }}>Select range</div>
                <button onClick={() => setCalOpen(false)} style={{ border: 0, background: "transparent", cursor: "pointer", padding: 4 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={RZ.muted} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
                </button>
              </div>
              <div style={{ padding: "8px 18px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <button onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); } else setCalMonth(m => m - 1); }} style={{ border: 0, background: "#f5fdf7", borderRadius: 8, padding: 6, cursor: "pointer" }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={RZ.black} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6"/></svg>
                </button>
                <div style={{ font: `700 13px/1 ${RZ.fontDisplay}`, color: RZ.black }}>{monthNames[calMonth]} {calYear}</div>
                <button onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); } else setCalMonth(m => m + 1); }} style={{ border: 0, background: "#f5fdf7", borderRadius: 8, padding: 6, cursor: "pointer" }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={RZ.black} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6"/></svg>
                </button>
              </div>
              <div style={{ padding: "0 14px 8px", display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, font: `700 10px/1 ${RZ.fontUI}`, color: RZ.muted, textAlign: "center" }}>
                {["S","M","T","W","T","F","S"].map((day, i) => <div key={i} style={{ padding: "6px 0" }}>{day}</div>)}
              </div>
              <div style={{ padding: "0 14px 14px", display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
                {cells.map((dd, i) => (
                  <button
                    key={i}
                    onClick={() => pickDay(dd)}
                    disabled={!dd}
                    style={{ aspectRatio: "1 / 1", border: 0, cursor: dd ? "pointer" : "default", background: isEndpoint(dd) ? RZ.green : inRange(dd) ? RZ.greenTint : "transparent", color: isEndpoint(dd) ? "#fff" : RZ.black, font: `${isEndpoint(dd) ? 700 : 500} 12px/1 ${RZ.fontUI}`, borderRadius: 8 }}
                  >{dd ?? ""}</button>
                ))}
              </div>
              <div style={{ padding: "0 14px 16px" }}>
                <button onClick={applyRange} style={{ width: "100%", padding: "12px 14px", borderRadius: 12, border: 0, background: RZ.green, color: "#fff", font: `800 13px/1 ${RZ.fontUI}`, cursor: "pointer", boxShadow: "0 6px 14px rgba(0,192,115,0.3)" }}>Apply range</button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
