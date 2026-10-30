"use client";

import { useId } from "react";
import type { Channel } from "@/modules/social/rules.ts";

/** Shopee's mark (Connect Shopee in Channels, and Shopee as a posting channel). */
export function ShopeeIcon({ size = 22 }: { size?: number }) {
  return <svg style={{ width: size, height: size }} viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="12" fill="#EE4D2D" /><path fill="none" stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" d="M6.6 8.6h10.8l-.8 9.6H7.4z" /><path fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" d="M9.4 8.4a2.6 2.6 0 0 1 5.2 0" /><text x="12" y="16.4" textAnchor="middle" fontFamily="Arial,Helvetica,sans-serif" fontSize="7" fontWeight="700" fill="#fff">S</text></svg>;
}

/** Brand marks for the channel chips and counts. */
export function BrandIcon({ ch, size = 22 }: { ch: Channel; size?: number }) {
  const s = { width: size, height: size };
  const grad = `ig${useId()}`;
  if (ch === "facebook") return <svg style={s} viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="12" fill="#1877F2" /><path fill="#fff" d="M13.4 19.5v-6.4h2.2l.3-2.5h-2.5V9c0-.7.2-1.2 1.2-1.2h1.4V5.6c-.2 0-1.1-.1-2-.1-2 0-3.3 1.2-3.3 3.4v1.8H8.5v2.5h2.2v6.4z" /></svg>;
  if (ch === "instagram") return <svg style={s} viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id={grad} x1="0" y1="1" x2="1" y2="0"><stop offset="0" stopColor="#feda75" /><stop offset=".35" stopColor="#fa7e1e" /><stop offset=".6" stopColor="#d62976" /><stop offset="1" stopColor="#4f5bd5" /></linearGradient></defs><rect width="24" height="24" rx="7" fill={`url(#${grad})`} /><rect x="5.5" y="5.5" width="13" height="13" rx="4" fill="none" stroke="#fff" strokeWidth="1.7" /><circle cx="12" cy="12" r="3.1" fill="none" stroke="#fff" strokeWidth="1.7" /><circle cx="16.1" cy="7.9" r="1" fill="#fff" /></svg>;
  if (ch === "shopee") return <ShopeeIcon size={size} />;
  if (ch === "threads") return <svg style={s} viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="12" fill="#111" /><text x="12" y="16.6" textAnchor="middle" fontFamily="Arial,Helvetica,sans-serif" fontSize="14" fontWeight="700" fill="#fff">@</text></svg>;
  return <svg style={s} viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="12" fill="#111" /><path fill="#25F4EE" d="M10.3 10.6v-1a4.4 4.4 0 0 0-.6 0 3.9 3.9 0 1 0 3.3 6.1 3.9 3.9 0 0 1-2.7-5.1z" opacity=".9" /><path fill="#fff" d="M13.6 5.2h2a3.2 3.2 0 0 0 2.8 2.9v2a5.2 5.2 0 0 1-2.8-.9v4.6a4 4 0 1 1-4-4h.4v2.1a1.9 1.9 0 1 0 1.6 1.9z" /></svg>;
}

