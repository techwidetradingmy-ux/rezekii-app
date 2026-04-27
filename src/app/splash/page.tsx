"use client";

import Image from "next/image";
import Link from "next/link";
import MobileFrame from "@/components/layout/MobileFrame";

// TikTok Shop toolkit-style icon tiles
const toolkitIcons = [
  {
    label: "Product",
    fg: "#00845B",
    glyph: (
      <g>
        <path d="M6 8h12l-1 11a2 2 0 0 1-2 1.8H9a2 2 0 0 1-2-1.8L6 8Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" fill="none"/>
        <path d="M9 8V6a3 3 0 0 1 6 0v2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" fill="none"/>
        <path d="M12 12v4M10 14h4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
      </g>
    ),
  },
  {
    label: "Showcase",
    fg: "#EB2E68",
    glyph: (
      <g>
        <path d="M6 8h12l-1 11a2 2 0 0 1-2 1.8H9a2 2 0 0 1-2-1.8L6 8Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" fill="none"/>
        <path d="M9 8V6a3 3 0 0 1 6 0v2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" fill="none"/>
      </g>
    ),
  },
  {
    label: "Earnings",
    fg: "#FF7A1A",
    glyph: (
      <g>
        <rect x="4" y="7" width="16" height="12" rx="2.2" stroke="currentColor" strokeWidth="1.7" fill="none"/>
        <path d="M4 11h16" stroke="currentColor" strokeWidth="1.7"/>
        <circle cx="16.5" cy="15" r="1.3" fill="currentColor"/>
      </g>
    ),
  },
  {
    label: "Gift",
    fg: "#FFB800",
    glyph: (
      <g>
        <rect x="4" y="9" width="16" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.7" fill="none"/>
        <path d="M3 9h18v3H3z" stroke="currentColor" strokeWidth="1.7" fill="none"/>
        <path d="M12 9v11M8.5 9s-2.5-3 0-4 3.5 4 3.5 4M15.5 9s2.5-3 0-4-3.5 4-3.5 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" fill="none"/>
      </g>
    ),
  },
  {
    label: "Link",
    fg: "#0EA5E9",
    glyph: (
      <g>
        <path d="M10 14l4-4M8.5 15.5l-1.2 1.2a3 3 0 0 1-4.2-4.2l3-3a3 3 0 0 1 4.2 0M15.5 8.5l1.2-1.2a3 3 0 0 1 4.2 4.2l-3 3a3 3 0 0 1-4.2 0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" fill="none"/>
      </g>
    ),
  },
  {
    label: "LIVE",
    fg: "#EB2E68",
    glyph: (
      <g>
        <rect x="3" y="6" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="1.7" fill="none"/>
        <path d="M10 10v4l4-2-4-2Z" fill="currentColor"/>
      </g>
    ),
  },
  {
    label: "Promote",
    fg: "#FF5A3C",
    glyph: (
      <g>
        <path d="M12 3c1 3 3 5 5 6-1 1-2 3-2 5a5 5 0 1 1-8-4c2 0 4-3 5-7Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" fill="none"/>
      </g>
    ),
  },
  {
    label: "Campaign",
    fg: "#7B3AED",
    glyph: (
      <g>
        <path d="M4 10v4l10 5V5L4 10Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" fill="none"/>
        <path d="M14 8c2 0 4 1.5 4 4s-2 4-4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" fill="none"/>
      </g>
    ),
  },
];

const RING_SIZE = 330;
const TILE = 46;
const NUM_ICONS = toolkitIcons.length;

export default function SplashPage() {
  return (
    <MobileFrame>
      <div
        className="flex flex-col min-h-dvh relative overflow-hidden"
        style={{ background: "#ffffff" }}
      >
        {/* Soft brand-tint wash */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(520px 420px at 50% 30%, rgba(0,132,91,0.08), transparent 70%), " +
              "radial-gradient(420px 360px at 82% 78%, rgba(235,46,104,0.06), transparent 70%), " +
              "radial-gradient(360px 320px at 16% 72%, rgba(255,184,0,0.07), transparent 70%)",
          }}
        />

        {/* Logo + orbit stage */}
        <div className="flex flex-col flex-1 items-center justify-start pt-[72px] px-7 relative z-10">
          {/* Orbit container */}
          <div
            style={{
              position: "relative",
              width: RING_SIZE + TILE,
              height: RING_SIZE + TILE,
              marginTop: 18,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {/* Dashed orbit guideline */}
            <div
              aria-hidden
              style={{
                position: "absolute",
                inset: TILE / 2,
                borderRadius: "50%",
                border: "1.5px dashed rgba(0,132,91,0.18)",
                animation: "splashRingSpin 60s linear infinite",
              }}
            />

            {/* Rotating ring of toolkit icons */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                animation: "splashRingSpin 22s linear infinite",
              }}
            >
              {toolkitIcons.map((spec, idx) => {
                const angle = (idx * 360) / NUM_ICONS - 90;
                const rad = (angle * Math.PI) / 180;
                const cx = Math.cos(rad) * (RING_SIZE / 2);
                const cy = Math.sin(rad) * (RING_SIZE / 2);
                const delay = (idx * 0.25) % 2;
                return (
                  <div
                    key={spec.label}
                    style={{
                      position: "absolute",
                      top: "50%",
                      left: "50%",
                      width: TILE,
                      height: TILE,
                      marginLeft: -TILE / 2,
                      marginTop: -TILE / 2,
                      transform: `translate(${cx}px, ${cy}px)`,
                      animation: `splashTileBob 3.6s ease-in-out ${delay}s infinite`,
                    }}
                  >
                    {/* Counter-rotate tile so glyph stays upright */}
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        animation: "splashCounterRot 22s linear infinite",
                        borderRadius: 12,
                        background: "#F2F3F5",
                        boxShadow: "0 6px 14px rgba(15,23,42,0.08), 0 1px 2px rgba(15,23,42,0.06)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: spec.fg,
                      }}
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24">
                        {spec.glyph}
                      </svg>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Brand mark — centered, PNG logo */}
            <div
              style={{
                position: "relative",
                zIndex: 2,
                width: 176,
                height: 176,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                animation: "splashMarkPop 1.1s cubic-bezier(.3,1.5,.4,1) both",
                filter: "drop-shadow(0 18px 34px rgba(0,132,91,0.22))",
              }}
            >
              <Image
                src="/rezekii-logo.png"
                alt="Rezekii"
                width={176}
                height={176}
                priority
              />
            </div>
          </div>

          {/* Wordmark + tagline */}
          <div className="text-center mt-[22px] relative z-10">
            <div
              style={{
                font: "800 46px/1 'Albert Sans', system-ui, sans-serif",
                color: "#0d1117",
                letterSpacing: "-0.02em",
              }}
            >
              Rezekii
            </div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "#00c073",
                letterSpacing: "0.22em",
                marginTop: 12,
                textTransform: "uppercase",
              }}
            >
              Connecting Affiliates
            </div>
          </div>

          <div className="flex-1" />
        </div>

        {/* CTA section — locked to bottom */}
        <div className="relative z-10 px-7 pb-10 flex flex-col gap-0">
          <Link
            href="/onboarding"
            style={{
              width: "100%",
              height: 60,
              borderRadius: 14,
              background: "#00c073",
              color: "#ffffff",
              fontSize: 20,
              fontWeight: 900,
              fontFamily: "'Albert Sans', system-ui, sans-serif",
              letterSpacing: "-0.01em",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              boxShadow: "0 14px 30px rgba(0,132,91,0.28)",
              textDecoration: "none",
            }}
          >
            Get started
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M9 18l6-6-6-6" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
          <Link
            href="/"
            style={{
              textAlign: "center",
              marginTop: 14,
              fontSize: 13,
              fontWeight: 500,
              color: "#9aa5b1",
              textDecoration: "none",
              display: "block",
            }}
          >
            Already have an account?{" "}
            <span style={{ color: "#0d1117", fontWeight: 700 }}>Sign in</span>
          </Link>
        </div>

        {/* Animation keyframes */}
        <style>{`
          @keyframes splashMarkPop {
            0% { opacity: 0; transform: scale(.6) rotate(-6deg) }
            60% { transform: scale(1.05) rotate(2deg) }
            100% { opacity: 1; transform: scale(1) rotate(0) }
          }
          @keyframes splashRingSpin {
            from { transform: rotate(0deg) }
            to { transform: rotate(360deg) }
          }
          @keyframes splashCounterRot {
            from { transform: rotate(0deg) }
            to { transform: rotate(-360deg) }
          }
          @keyframes splashTileBob {
            0%, 100% { margin-top: -${TILE / 2}px }
            50% { margin-top: -${TILE / 2 + 5}px }
          }
        `}</style>
      </div>
    </MobileFrame>
  );
}
