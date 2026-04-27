"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import MobileFrame from "@/components/layout/MobileFrame";

const features = [
  {
    n: "01",
    t: "Apply for free samples",
    d: "Hundreds of brands, zero upfront cost.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M6 8h12l-1 11a2 2 0 0 1-2 1.8H9a2 2 0 0 1-2-1.8L6 8Z" stroke="white" strokeWidth="1.8" strokeLinejoin="round"/>
        <path d="M9 8V6a3 3 0 0 1 6 0v2" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
        <path d="M12 12v4M10 14h4" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    n: "02",
    t: "Post on TikTok",
    d: "Use your own voice — we track the link.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="6" width="18" height="12" rx="2" stroke="white" strokeWidth="1.8"/>
        <path d="M10 10v4l4-2-4-2Z" fill="white"/>
      </svg>
    ),
  },
  {
    n: "03",
    t: "Earn commission",
    d: "Paid to your bank every two weeks.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <rect x="4" y="7" width="16" height="12" rx="2.2" stroke="white" strokeWidth="1.8"/>
        <path d="M4 11h16" stroke="white" strokeWidth="1.8"/>
        <circle cx="16.5" cy="15" r="1.3" fill="white"/>
      </svg>
    ),
  },
];

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const t = setInterval(() => setStep((x) => (x + 1) % features.length), 2600);
    return () => clearInterval(t);
  }, []);

  return (
    <MobileFrame>
      <div
        className="flex flex-col min-h-dvh relative overflow-hidden"
        style={{
          background: "linear-gradient(180deg,#f5fdf7 0%,#ffffff 40%)",
          padding: "36px 22px 24px",
        }}
      >
        {/* Ambient blobs */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: -40,
            right: -60,
            width: 220,
            height: 220,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(0,192,115,0.22), transparent 65%)",
            pointerEvents: "none",
          }}
        />
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: 140,
            left: -70,
            width: 180,
            height: 180,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(232,0,90,0.14), transparent 65%)",
            pointerEvents: "none",
          }}
        />

        {/* Small logo */}
        <div className="flex justify-center mb-[10px] relative z-10">
          <Image
            src="/rezekii-logo.png"
            alt="Rezekii"
            width={44}
            height={44}
            priority
          />
        </div>

        {/* Hero illustration stage */}
        <div className="relative mb-[14px] z-10" style={{ height: 150 }}>
          {/* Product bag hero */}
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: 6,
              transform: "translateX(-50%)",
              width: 126,
              height: 126,
              borderRadius: 24,
              background: "#ffffff",
              padding: 10,
              boxShadow: "0 18px 40px rgba(0,0,0,0.14),0 6px 12px rgba(0,0,0,0.08)",
              animation: "floatA 3s ease-in-out infinite",
            }}
          >
            <Image
              src="/images/product-beauty.jpg"
              alt="Product"
              width={106}
              height={106}
              style={{ display: "block", width: "100%", height: "100%", borderRadius: 16, objectFit: "cover" }}
            />
          </div>

          {/* Earnings badge */}
          <div
            style={{
              position: "absolute",
              right: 14,
              top: 56,
              background: "#0d1117",
              borderRadius: 14,
              padding: "8px 12px",
              boxShadow: "0 10px 22px rgba(0,0,0,0.25)",
              animation: "floatC 3.8s ease-in-out infinite",
            }}
          >
            <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 8, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 3 }}>
              Earned
            </div>
            <div style={{ color: "#25f4ee", fontSize: 14, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>
              RM 142
            </div>
          </div>
        </div>

        {/* Headline */}
        <div
          className="text-center relative z-10"
          style={{
            fontSize: 26,
            fontWeight: 800,
            color: "#0d1117",
            letterSpacing: "-0.02em",
            lineHeight: 1.15,
            marginBottom: 8,
            fontFamily: "'Albert Sans', system-ui, sans-serif",
          }}
        >
          Earn from every<br />TikTok you post.
        </div>

        {/* Subtext */}
        <div
          className="text-center relative z-10"
          style={{
            fontSize: 13,
            color: "#4a5568",
            lineHeight: 1.5,
            marginBottom: 16,
            padding: "0 8px",
          }}
        >
          Browse free samples, post reviews on TikTok, earn commission when people buy.
        </div>

        {/* Animated feature row */}
        <div
          className="relative z-10"
          style={{
            marginBottom: 14,
            display: "flex",
            alignItems: "center",
            gap: 12,
            background: "#ffffff",
            border: "1.5px solid #00c073",
            borderRadius: 14,
            padding: "12px 14px",
            boxShadow: "0 6px 18px rgba(0,192,115,.14)",
          }}
        >
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              background: "#00c073",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {features[step].icon}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 800,
                color: "#00c073",
                letterSpacing: ".08em",
                fontFamily: "'Albert Sans', system-ui, sans-serif",
              }}
            >
              STEP {features[step].n}
            </div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: "#0d1117",
                marginTop: 2,
                fontFamily: "'Albert Sans', system-ui, sans-serif",
              }}
            >
              {features[step].t}
            </div>
            <div style={{ fontSize: 11.5, color: "#4a5568", marginTop: 2, lineHeight: 1.4 }}>
              {features[step].d}
            </div>
          </div>
        </div>

        {/* Progress dots */}
        <div className="flex gap-[6px] justify-center relative z-10" style={{ marginBottom: 14 }}>
          {features.map((_, idx) => (
            <div
              key={idx}
              style={{
                width: idx === step ? 22 : 6,
                height: 6,
                borderRadius: 999,
                background: idx === step ? "#00c073" : "#d8f0e4",
                transition: "width .35s cubic-bezier(.2,.8,.2,1)",
              }}
            />
          ))}
        </div>

        {/* Social proof strip */}
        <div
          className="flex items-center justify-center relative z-10"
          style={{ gap: 8, marginBottom: 12 }}
        >
          <div style={{ display: "flex" }}>
            {["#f5a623", "#e8005a", "#00c073", "#25f4ee"].map((c, idx) => (
              <div
                key={idx}
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  background: c,
                  border: "2px solid #fff",
                  marginLeft: idx ? -7 : 0,
                }}
              />
            ))}
          </div>
          <div style={{ fontSize: 11, color: "#4a5568", lineHeight: 1.3 }}>
            <strong style={{ color: "#0d1117", fontWeight: 700 }}>2,400+</strong> creators already earning
          </div>
        </div>

        {/* CTA buttons */}
        <div className="flex flex-col relative z-10 mt-auto" style={{ gap: 6 }}>
          {/* Continue with TikTok button */}
          <button
            onClick={() => router.push("/")}
            style={{
              width: "100%",
              height: 54,
              borderRadius: 14,
              border: "none",
              background: "#0d1117",
              color: "#ffffff",
              fontSize: 16,
              fontWeight: 700,
              fontFamily: "'Albert Sans', system-ui, sans-serif",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              cursor: "pointer",
              boxShadow: "0 8px 22px rgba(0,0,0,0.22)",
            }}
          >
            <Image
              src="/images/tiktok-square.png"
              alt="TikTok"
              width={22}
              height={22}
              style={{ borderRadius: 4 }}
            />
            Continue with TikTok
          </button>

          <div
            style={{
              textAlign: "center",
              fontSize: 10.5,
              color: "#9aa5b1",
              lineHeight: 1.4,
              marginTop: 2,
            }}
          >
            By continuing, you agree to our Terms &amp; Privacy Policy.
          </div>
        </div>

        {/* Animation keyframes */}
        <style>{`
          @keyframes floatA {
            0%,100% { transform: translateX(-50%) translateY(0) }
            50% { transform: translateX(-50%) translateY(-6px) }
          }
          @keyframes floatC {
            0%,100% { transform: translateY(0) }
            50% { transform: translateY(5px) }
          }
        `}</style>
      </div>
    </MobileFrame>
  );
}
