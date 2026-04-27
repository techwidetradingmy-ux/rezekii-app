"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    const onboarded = localStorage.getItem("rezekii_onboarded");
    if (onboarded) {
      router.replace("/home");
    } else {
      router.replace("/splash");
    }
  }, [router]);

  // Render nothing while redirecting
  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "#f5fdf7",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <span
        style={{
          width: 32,
          height: 32,
          borderRadius: "50%",
          border: "3px solid #00c073",
          borderTopColor: "transparent",
          display: "inline-block",
          animation: "spin 0.7s linear infinite",
        }}
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
