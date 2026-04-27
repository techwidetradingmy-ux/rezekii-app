"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import MobileFrame from "@/components/layout/MobileFrame";
import RzButton from "@/components/ui/RzButton";
import { ChevronRight, Package, Video, TrendingUp, Award } from "lucide-react";

const slides = [
  {
    icon: Package,
    iconBg: "rgba(0,192,115,0.15)",
    iconColor: "#00c073",
    title: "Browse Products",
    subtitle: "Discover thousands of TikTok Shop products across Beauty, Food, Tech, Fashion and more.",
    illustration: "🛍️",
  },
  {
    icon: Package,
    iconBg: "rgba(37,244,238,0.15)",
    iconColor: "#25f4ee",
    title: "Get Free Samples",
    subtitle: "Apply to receive real product samples. Post honest reviews and earn when your audience buys.",
    illustration: "📦",
  },
  {
    icon: Video,
    iconBg: "rgba(232,0,90,0.12)",
    iconColor: "#e8005a",
    title: "Create & Post",
    subtitle: "Post TikTok videos or go live featuring your products. The more authentic, the better your sales.",
    illustration: "🎬",
  },
  {
    icon: TrendingUp,
    iconBg: "rgba(245,166,35,0.15)",
    iconColor: "#f5a623",
    title: "Earn Commissions",
    subtitle: "Track your sales, view analytics, and get paid directly to your bank account — no minimum.",
    illustration: "💸",
  },
  {
    icon: Award,
    iconBg: "rgba(0,192,115,0.15)",
    iconColor: "#00c073",
    title: "Level Up",
    subtitle: "Grow from Starter to Gold to Platinum. Higher tiers unlock exclusive brand deals and higher rates.",
    illustration: "🏆",
  },
];

export default function OnboardingPage() {
  const [current, setCurrent] = useState(0);
  const router = useRouter();

  const isLast = current === slides.length - 1;
  const slide = slides[current];

  const finish = () => {
    localStorage.setItem("rezekii_onboarded", "true");
    router.push("/home");
  };

  const next = () => {
    if (isLast) {
      finish();
    } else {
      setCurrent((c) => c + 1);
    }
  };

  return (
    <MobileFrame>
      <div className="flex flex-col min-h-dvh bg-[#f5fdf7]">

        {/* Skip */}
        <div className="flex justify-end px-5 pt-12">
          <button
            onClick={finish}
            className="text-[13px] text-[#9aa5b1] font-[500] tap-target"
          >
            Skip
          </button>
        </div>

        {/* Slide content */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 pb-6">
          {/* Big illustration */}
          <div className="animate-fade-up">
            <div
              className="w-[160px] h-[160px] rounded-[40px] flex items-center justify-center text-[80px] mb-8 shadow-[0_8px_32px_rgba(0,0,0,0.08)]"
              style={{ background: slide.iconBg }}
            >
              {slide.illustration}
            </div>
          </div>

          <div className="animate-fade-up delay-100 text-center">
            <h1 className="text-[26px] font-[800] text-[#0d1117] leading-tight mb-3">
              {slide.title}
            </h1>
            <p className="text-[14px] text-[#4a5568] leading-relaxed max-w-[300px] mx-auto">
              {slide.subtitle}
            </p>
          </div>
        </div>

        {/* Dots */}
        <div className="flex items-center justify-center gap-2 pb-6">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className="tap-target"
            >
              <span
                className="block rounded-full transition-all duration-[200ms]"
                style={{
                  width: i === current ? "20px" : "6px",
                  height: "6px",
                  background: i === current ? "#00c073" : "#d8f0e4",
                }}
              />
            </button>
          ))}
        </div>

        {/* CTA */}
        <div className="px-5 pb-10">
          <RzButton onClick={next} rightIcon={<ChevronRight size={18} />}>
            {isLast ? "Start Earning" : "Next"}
          </RzButton>
          {current === 0 && (
            <button
              onClick={finish}
              className="w-full text-center text-[13px] text-[#9aa5b1] py-3 tap-target mt-1"
            >
              Already have an account? <span className="text-[#00c073] font-[600]">Sign In</span>
            </button>
          )}
        </div>
      </div>
    </MobileFrame>
  );
}
