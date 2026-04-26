import React from "react";
import MobileFrame from "./MobileFrame";
import TabBar from "@/components/ui/TabBar";

interface AppShellProps {
  children: React.ReactNode;
  hideTabBar?: boolean;
}

export default function AppShell({ children, hideTabBar = false }: AppShellProps) {
  return (
    <MobileFrame>
      <main className="flex-1 overflow-y-auto pb-[83px] no-scrollbar">
        {children}
      </main>
      {!hideTabBar && <TabBar />}
    </MobileFrame>
  );
}
