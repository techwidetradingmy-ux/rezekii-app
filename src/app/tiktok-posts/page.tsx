"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import AppShell from "@/components/layout/AppShell";
import RzCard from "@/components/ui/RzCard";
import Link from "next/link";
import { ArrowLeft, Eye, Heart, Share2, Radio, Video, TrendingUp } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Post {
  id: string;
  title: string;
  views: string;
  likes: string;
  shares: string;
  gmv: number;
  commission: number;
  platform: "video" | "live";
  date: string;
  imageColor?: string;
  imageUrl: string;
}

// ── Mock fallback (shown when not authenticated or API unavailable) ─────────────
const MOCK_POSTS: Post[] = [
  {
    id: "tp1",
    title: "COSRX Serum Review — Glowing Skin In 7 Days!",
    views: "248K", likes: "18.2K", shares: "4.1K",
    gmv: 4200, commission: 504,
    platform: "video", date: "23 Apr 2026",
    imageColor: "#fde8f0",
    imageUrl: "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=400&h=600&fit=crop",
  },
  {
    id: "tp2",
    title: "Unboxing & GRWM Ft. ZALORA Collab",
    views: "312K", likes: "24.8K", shares: "6.3K",
    gmv: 6800, commission: 1020,
    platform: "video", date: "20 Apr 2026",
    imageColor: "#f0ede8",
    imageUrl: "https://images.unsplash.com/photo-1594938298603-c8148c4b4057?w=400&h=600&fit=crop",
  },
  {
    id: "tp3",
    title: "5 Tech Gadgets Under RM200",
    views: "155K", likes: "9.7K", shares: "2.8K",
    gmv: 1950, commission: 117,
    platform: "video", date: "18 Apr 2026",
    imageColor: "#e8ecff",
    imageUrl: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400&h=600&fit=crop",
  },
  {
    id: "tp4",
    title: "Hari Raya Snack Haul LIVE",
    views: "89K", likes: "7.2K", shares: "1.5K",
    gmv: 2800, commission: 280,
    platform: "live", date: "16 Apr 2026",
    imageColor: "#fff3d6",
    imageUrl: "https://images.unsplash.com/photo-1621939514649-280e2ee25f60?w=400&h=600&fit=crop",
  },
  {
    id: "tp5",
    title: "Morning Skincare Routine With New Products",
    views: "72K", likes: "5.4K", shares: "980",
    gmv: 1100, commission: 132,
    platform: "video", date: "14 Apr 2026",
    imageColor: "#fce8fe",
    imageUrl: "https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=400&h=600&fit=crop",
  },
  {
    id: "tp6",
    title: "Home Refresh Haul — New Arrivals From ScentCo",
    views: "43K", likes: "3.1K", shares: "620",
    gmv: 780, commission: 78,
    platform: "video", date: "10 Apr 2026",
    imageColor: "#e8f5f0",
    imageUrl: "https://images.unsplash.com/photo-1602928321679-560bb453f190?w=400&h=600&fit=crop",
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function parseCount(s: string): number {
  if (s.endsWith("M")) return parseFloat(s) * 1_000_000;
  if (s.endsWith("K")) return parseFloat(s) * 1_000;
  return parseFloat(s) || 0;
}

function fmtTotal(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
}

// ── Loading skeleton ──────────────────────────────────────────────────────────
function GridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-2">
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="rounded-[12px] bg-gray-100 animate-pulse"
          style={{ aspectRatio: "9/16" }}
        />
      ))}
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {[...Array(6)].map((_, i) => (
        <RzCard key={i} padding={false} className="overflow-hidden">
          <div className="flex gap-3 p-3">
            <div className="w-[52px] h-[72px] rounded-[8px] bg-gray-100 animate-pulse shrink-0" />
            <div className="flex-1 flex flex-col gap-2 pt-1">
              <div className="h-3 bg-gray-100 animate-pulse rounded-full w-full" />
              <div className="h-3 bg-gray-100 animate-pulse rounded-full w-2/3" />
              <div className="h-2.5 bg-gray-100 animate-pulse rounded-full w-1/2 mt-1" />
            </div>
          </div>
        </RzCard>
      ))}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function TikTokPostsPage() {
  const [view, setView]   = useState<"grid" | "list">("grid");
  const [posts, setPosts] = useState<Post[]>(MOCK_POSTS);
  const [isMock, setIsMock] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/tiktok/videos")
      .then((r) => r.json())
      .then((json) => {
        if (json.success && !json.mock && Array.isArray(json.data?.videos) && json.data.videos.length > 0) {
          setPosts(json.data.videos);
          setIsMock(false);
        }
        // else: keep MOCK_POSTS, isMock stays true
      })
      .catch(() => { /* network error — keep mock */ })
      .finally(() => setLoading(false));
  }, []);

  const totalViews      = posts.reduce((s, p) => s + parseCount(p.views), 0);
  const totalGMV        = posts.reduce((s, p) => s + p.gmv, 0);
  const totalCommission = posts.reduce((s, p) => s + p.commission, 0);

  const gmvDisplay        = isMock ? `RM ${(totalGMV / 1000).toFixed(1)}k` : "—";
  const commissionDisplay = isMock ? `RM ${totalCommission.toLocaleString()}` : "—";

  return (
    <AppShell>
      {/* Header */}
      <div className="px-5 pt-12 pb-5" style={{ background: "#00c073" }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Link href="/profile" className="tap-target">
              <ArrowLeft size={22} color="white" strokeWidth={2} />
            </Link>
            <div className="flex items-center gap-2">
              <h1 className="text-[22px] font-[800] text-white">My TikTok Posts</h1>
              {isMock && !loading && (
                <span className="text-[10px] font-[700] text-white/70 bg-white/20 px-2 py-0.5 rounded-full">
                  DEMO
                </span>
              )}
            </div>
          </div>

          {/* View toggle */}
          <div className="flex items-center gap-1 bg-white/20 rounded-[8px] p-0.5">
            {(["grid", "list"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className="px-3 py-1 rounded-[6px] text-[13px] font-[700] tap-target transition-all"
                style={{
                  background: view === v ? "white" : "transparent",
                  color: view === v ? "#00c073" : "rgba(255,255,255,0.7)",
                }}
              >
                {v === "grid" ? "⊞" : "☰"}
              </button>
            ))}
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2 animate-fade-up">
          {[
            { label: "Total Views", value: fmtTotal(totalViews), icon: Eye },
            { label: "Total GMV",   value: gmvDisplay,           icon: TrendingUp },
            { label: "Commission",  value: commissionDisplay,    icon: Heart },
          ].map(({ label, value, icon: Icon }) => (
            <RzCard key={label} padding={false} className="p-2.5 flex flex-col items-center">
              <Icon size={12} color="#9aa5b1" className="mb-0.5" />
              <p className="text-[14px] font-[800] text-[#0d1117]">{value}</p>
              <p className="text-[10px] text-[#9aa5b1] font-[500]">{label}</p>
            </RzCard>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-5 pt-4 pb-4">
        {loading ? (
          view === "grid" ? <GridSkeleton /> : <ListSkeleton />
        ) : view === "grid" ? (
          <div className="grid grid-cols-2 gap-2 animate-fade-up">
            {posts.map((post) => (
              <div
                key={post.id}
                className="relative rounded-[12px] overflow-hidden tap-target"
                style={{ aspectRatio: "9/16" }}
              >
                <div
                  className="absolute inset-0"
                  style={{ background: post.imageColor ?? "#e8e8e8" }}
                >
                  {post.imageUrl && (
                    <Image
                      src={post.imageUrl}
                      alt={post.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 390px) 50vw, 195px"
                    />
                  )}
                </div>

                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

                {/* Platform badge */}
                <div className="absolute top-2 left-2">
                  <span
                    className="text-[10px] font-[700] text-white px-2 py-0.5 rounded-full flex items-center gap-1"
                    style={{ background: post.platform === "live" ? "#e8005a" : "#0d1117" }}
                  >
                    {post.platform === "live" ? <Radio size={9} /> : <Video size={9} />}
                    {post.platform === "live" ? "LIVE" : "VIDEO"}
                  </span>
                </div>

                {/* Bottom info */}
                <div className="absolute bottom-0 left-0 right-0 p-2">
                  <div className="flex items-center gap-2 text-white/90">
                    <div className="flex items-center gap-0.5">
                      <Eye size={10} />
                      <span className="text-[10px] font-[600]">{post.views}</span>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <Heart size={10} />
                      <span className="text-[10px] font-[600]">{post.likes}</span>
                    </div>
                  </div>
                  {post.commission > 0 && (
                    <p className="text-[10px] text-[#00c073] font-[700] mt-0.5">
                      RM {post.commission} earned
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-3 animate-fade-up">
            {posts.map((post) => (
              <RzCard key={post.id} padding={false} className="overflow-hidden tap-target">
                <div className="flex gap-3 p-3">
                  {/* Thumbnail */}
                  <div
                    className="w-[52px] shrink-0 rounded-[8px] overflow-hidden relative"
                    style={{ height: 72, background: post.imageColor ?? "#e8e8e8" }}
                  >
                    {post.imageUrl && (
                      <Image
                        src={post.imageUrl}
                        alt={post.title}
                        fill
                        className="object-cover"
                        sizes="52px"
                      />
                    )}
                    <div className="absolute bottom-0.5 inset-x-0 flex justify-center">
                      <span
                        className="text-[8px] font-[700] text-white px-1 py-0.5 rounded-full"
                        style={{ background: post.platform === "live" ? "#e8005a" : "#0d1117" }}
                      >
                        {post.platform === "live" ? "LIVE" : "VID"}
                      </span>
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-[600] text-[#0d1117] leading-tight line-clamp-2 mb-2">
                      {post.title}
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <Eye size={11} color="#9aa5b1" />
                        <span className="text-[11px] text-[#9aa5b1]">{post.views}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Heart size={11} color="#9aa5b1" />
                        <span className="text-[11px] text-[#9aa5b1]">{post.likes}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Share2 size={11} color="#9aa5b1" />
                        <span className="text-[11px] text-[#9aa5b1]">{post.shares}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      {post.gmv > 0 ? (
                        <>
                          <span className="text-[11px] text-[#9aa5b1]">
                            GMV: RM {post.gmv.toLocaleString()}
                          </span>
                          <span className="text-[12px] font-[700] text-[#00c073]">
                            +RM {post.commission}
                          </span>
                        </>
                      ) : (
                        <span className="text-[11px] text-[#9aa5b1]">{post.date}</span>
                      )}
                    </div>
                  </div>
                </div>
              </RzCard>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
