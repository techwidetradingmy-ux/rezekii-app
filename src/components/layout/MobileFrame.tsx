import React from "react";

export default function MobileFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh flex flex-col items-center bg-[#f5fdf7]">
      <div className="w-full max-w-[390px] min-h-dvh flex flex-col relative bg-[#f5fdf7]">
        {children}
      </div>
    </div>
  );
}
