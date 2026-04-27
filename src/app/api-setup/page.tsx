"use client";

import { useState } from "react";
import AppShell from "@/components/layout/AppShell";
import RzCard from "@/components/ui/RzCard";
import RzButton from "@/components/ui/RzButton";
import RzInput from "@/components/ui/RzInput";
import Link from "next/link";
import {
  ArrowLeft, CheckCircle, XCircle, AlertCircle,
  Eye, EyeOff, Zap, Database, Video,
} from "lucide-react";

type Status = "idle" | "testing" | "ok" | "error";

interface TestResult {
  endpoint: string;
  status: Status;
  message: string;
  mock: boolean;
}

export default function ApiSetupPage() {
  const [appKey,       setAppKey]       = useState("");
  const [appSecret,    setAppSecret]    = useState("");
  const [accessToken,  setAccessToken]  = useState("");
  const [shopId,       setShopId]       = useState("");
  const [displayKey,   setDisplayKey]   = useState("");
  const [showSecrets,  setShowSecrets]  = useState(false);
  const [useMock,      setUseMock]      = useState(true);
  const [testing,      setTesting]      = useState(false);
  const [results,      setResults]      = useState<TestResult[]>([]);

  const endpoints = [
    { key: "products",  label: "Products",  path: "/api/tiktok/products",  icon: Database },
    { key: "analytics", label: "Analytics", path: "/api/tiktok/analytics", icon: Zap },
    { key: "videos",    label: "Videos",    path: "/api/tiktok/videos",    icon: Video },
  ];

  const testConnection = async () => {
    setTesting(true);
    setResults([]);

    const newResults: TestResult[] = [];

    for (const ep of endpoints) {
      try {
        const res  = await fetch(ep.path);
        const json = await res.json();
        newResults.push({
          endpoint: ep.label,
          status:   json.success ? "ok" : "error",
          message:  json.success
            ? `${json.count ?? "✓"} records returned${json.mock ? " (mock)" : " (live)"}`
            : (json.error ?? "Unknown error"),
          mock:     json.mock ?? true,
        });
      } catch {
        newResults.push({
          endpoint: ep.label,
          status:   "error",
          message:  "Network error — is the server running?",
          mock:     true,
        });
      }
      setResults([...newResults]);
    }

    setTesting(false);
  };

  return (
    <AppShell hideTabBar>
      {/* Header */}
      <div className="px-5 pt-12 pb-5" style={{ background: "#00c073" }}>
        <div className="flex items-center gap-3 mb-2">
          <Link href="/profile" className="tap-target">
            <ArrowLeft size={22} color="white" strokeWidth={2} />
          </Link>
          <h1 className="text-[22px] font-[800] text-white">API Setup</h1>
        </div>
        <p className="text-white/70 text-[13px] ml-9">
          Configure TikTok Shop & Display API credentials
        </p>
      </div>

      <div className="px-5 pt-4 pb-4 flex flex-col gap-4">

        {/* Mock Mode Toggle */}
        <RzCard className="animate-fade-up">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[14px] font-[700] text-[#0d1117]">Mock Data Mode</p>
              <p className="text-[12px] text-[#9aa5b1] mt-0.5">
                Use realistic sample data without credentials
              </p>
            </div>
            <button
              onClick={() => setUseMock((v) => !v)}
              className="tap-target"
            >
              <div
                className="w-12 h-6 rounded-full transition-all relative"
                style={{ background: useMock ? "#00c073" : "#d8f0e4" }}
              >
                <div
                  className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all"
                  style={{ left: useMock ? "calc(100% - 22px)" : "2px" }}
                />
              </div>
            </button>
          </div>
        </RzCard>

        {/* TikTok Shop Credentials */}
        <div className="animate-fade-up delay-100">
          <div className="flex items-center justify-between mb-2 px-1">
            <p className="text-[13px] font-[700] text-[#0d1117]">TikTok Shop Open API</p>
            <button
              onClick={() => setShowSecrets((v) => !v)}
              className="tap-target flex items-center gap-1 text-[12px] text-[#9aa5b1]"
            >
              {showSecrets ? <EyeOff size={13} /> : <Eye size={13} />}
              {showSecrets ? "Hide" : "Show"}
            </button>
          </div>
          <RzCard>
            <div className="flex flex-col gap-3">
              <RzInput
                label="App Key"
                placeholder="e.g. 7abc123def456"
                value={appKey}
                onChange={(e) => setAppKey(e.target.value)}
              />
              <RzInput
                label="App Secret"
                placeholder="••••••••••••••••"
                type={showSecrets ? "text" : "password"}
                value={appSecret}
                onChange={(e) => setAppSecret(e.target.value)}
              />
              <RzInput
                label="Access Token"
                placeholder="OAuth 2.0 access token"
                type={showSecrets ? "text" : "password"}
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
              />
              <RzInput
                label="Shop ID"
                placeholder="e.g. 123456789"
                value={shopId}
                onChange={(e) => setShopId(e.target.value)}
              />
            </div>
          </RzCard>
        </div>

        {/* TikTok Display Credentials */}
        <div className="animate-fade-up delay-200">
          <p className="text-[13px] font-[700] text-[#0d1117] mb-2 px-1">TikTok Display API</p>
          <RzCard>
            <RzInput
              label="Client Key"
              placeholder="From TikTok Developer Portal"
              value={displayKey}
              onChange={(e) => setDisplayKey(e.target.value)}
            />
            <p className="text-[11px] text-[#9aa5b1] mt-2">
              Display API uses per-user OAuth tokens obtained via TikTok Login Kit.
              The Client Secret should never be stored client-side.
            </p>
          </RzCard>
        </div>

        {/* Available Endpoints */}
        <div className="animate-fade-up delay-300">
          <p className="text-[13px] font-[700] text-[#0d1117] mb-2 px-1">API Endpoints</p>
          <RzCard padding={false} className="divide-y divide-[#f5fdf7]">
            {endpoints.map(({ key, label, path, icon: Icon }) => (
              <div key={key} className="flex items-center gap-3 px-4 py-3">
                <div className="w-8 h-8 rounded-[8px] flex items-center justify-center shrink-0" style={{ background: "rgba(0,192,115,0.12)" }}>
                  <Icon size={14} color="#00c073" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-[600] text-[#0d1117]">{label}</p>
                  <p className="text-[11px] text-[#9aa5b1] font-mono truncate">{path}</p>
                </div>
                {results.find((r) => r.endpoint === label) ? (
                  (() => {
                    const r = results.find((r) => r.endpoint === label)!;
                    return (
                      <div className="text-right shrink-0">
                        {r.status === "ok"
                          ? <CheckCircle size={16} color="#00c073" />
                          : <XCircle size={16} color="#e8005a" />
                        }
                      </div>
                    );
                  })()
                ) : (
                  <div className="w-4 h-4 rounded-full bg-[#f5fdf7] border border-[#d8f0e4] shrink-0" />
                )}
              </div>
            ))}
          </RzCard>
        </div>

        {/* Test Results */}
        {results.length > 0 && (
          <div className="animate-fade-up">
            <p className="text-[13px] font-[700] text-[#0d1117] mb-2 px-1">Test Results</p>
            <RzCard padding={false} className="divide-y divide-[#f5fdf7]">
              {results.map((r) => (
                <div key={r.endpoint} className="flex items-start gap-3 px-4 py-3">
                  {r.status === "ok"
                    ? <CheckCircle size={16} color="#00c073" className="shrink-0 mt-0.5" />
                    : <XCircle size={16} color="#e8005a" className="shrink-0 mt-0.5" />
                  }
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-[600] text-[#0d1117]">{r.endpoint}</p>
                    <p className="text-[11px] text-[#9aa5b1] mt-0.5">{r.message}</p>
                    {r.mock && (
                      <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-[600] text-[#f5a623] bg-[rgba(245,166,35,0.12)] px-2 py-0.5 rounded-full">
                        <AlertCircle size={9} />
                        Mock mode
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </RzCard>
          </div>
        )}

        {/* Test Button */}
        <div className="animate-fade-up delay-400 pb-2">
          <RzButton
            onClick={testConnection}
            loading={testing}
            leftIcon={<Zap size={18} />}
          >
            {testing ? "Testing Connection..." : "Test Connection"}
          </RzButton>
          <p className="text-center text-[11px] text-[#9aa5b1] mt-2">
            Credentials are validated server-side — never exposed to the browser
          </p>
        </div>

        {/* Env Vars Reference */}
        <RzCard className="animate-fade-up delay-500" padding={false}>
          <div className="p-4">
            <p className="text-[12px] font-[700] text-[#0d1117] mb-2">.env.local Reference</p>
            <pre className="text-[10px] text-[#4a5568] font-mono leading-relaxed bg-[#f5fdf7] p-3 rounded-[8px] overflow-x-auto">{`TIKTOK_SHOP_APP_KEY=
TIKTOK_SHOP_APP_SECRET=
TIKTOK_SHOP_ACCESS_TOKEN=
TIKTOK_SHOP_SHOP_ID=
TIKTOK_SHOP_ENABLED=true

TIKTOK_DISPLAY_CLIENT_KEY=
TIKTOK_DISPLAY_CLIENT_SECRET=`}</pre>
          </div>
        </RzCard>

      </div>
    </AppShell>
  );
}
