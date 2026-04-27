"use client";

import Link from "next/link";
import MobileFrame from "@/components/layout/MobileFrame";
import RzButton from "@/components/ui/RzButton";
import RezekiiLogo from "@/components/ui/RezekiiLogo";
import { ArrowRight } from "lucide-react";

export default function SplashPage() {
  return (
    <MobileFrame>
      <div className="flex flex-col min-h-dvh relative overflow-hidden bg-[#0d1117]">
        {/* Background orbs */}
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute top-[-80px] left-[-60px] w-[280px] h-[280px] rounded-full opacity-30"
            style={{ background: "radial-gradient(circle, #00c073 0%, transparent 70%)" }}
          />
          <div
            className="absolute bottom-[120px] right-[-80px] w-[240px] h-[240px] rounded-full opacity-20"
            style={{ background: "radial-gradient(circle, #25f4ee 0%, transparent 70%)" }}
          />
        </div>

        {/* Content */}
        <div className="flex flex-col flex-1 items-center justify-center px-5 relative z-10">
          {/* Logo block */}
          <div className="animate-fade-up flex flex-col items-center gap-4">
            {/* Icon mark */}
            <div
              className="w-20 h-20 rounded-[24px] flex items-center justify-center shadow-[0_8px_32px_rgba(0,192,115,0.4)]"
              style={{ background: "linear-gradient(135deg, #00c073 0%, #009a5c 100%)" }}
            >
              <span className="text-white text-[36px] font-[900] leading-none">R</span>
            </div>
            <RezekiiLogo size="lg" variant="light" />
            <p className="text-[#9aa5b1] text-[14px] text-center leading-relaxed max-w-[260px]">
              Browse products, apply for free samples,<br />post content, earn commissions.
            </p>
          </div>

          {/* TikTok badge */}
          <div className="animate-fade-up delay-200 mt-8 flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20">
            <span className="text-[#25f4ee] font-[700] text-[13px]">TikTok</span>
            <span className="text-white/60 text-[11px]">•</span>
            <span className="text-white/70 text-[12px]">Certified MCN & TAP Partner</span>
          </div>
        </div>

        {/* CTA Section */}
        <div className="relative z-10 px-5 pb-10 flex flex-col gap-3 animate-fade-up delay-300">
          <Link href="/onboarding">
            <RzButton rightIcon={<ArrowRight size={18} />}>
              Get Started — It&apos;s Free
            </RzButton>
          </Link>
          <Link href="/home" className="text-center text-[13px] text-[#9aa5b1] py-2 tap-target hover:text-white transition-colors">
            Already have an account? <span className="text-[#00c073] font-[600]">Sign In</span>
          </Link>
        </div>

        {/* Footer */}
        <div className="relative z-10 pb-6 text-center">
          <p className="text-[10px] text-white/30">
            By Techwide Marketing Sdn Bhd · Malaysia
          </p>
        </div>
      </div>
    </MobileFrame>
  );
}
