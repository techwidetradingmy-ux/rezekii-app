import React from "react";
import TabBar from "@/components/ui/TabBar";

interface AppShellProps {
  children: React.ReactNode;
  hideTabBar?: boolean;
}

/*
 * AppShell wraps every tab-bar page.
 *
 * Layout contract:
 *   - Full-width, full-height column.
 *   - Content scrolls naturally (window scroll, not inner overflow).
 *   - TabBar is position:fixed so it never scrolls away.
 *   - paddingBottom on the content wrapper keeps content clear of the bar.
 *     The value uses env(safe-area-inset-bottom) for notched phones.
 */
export default function AppShell({ children, hideTabBar = false }: AppShellProps) {
  return (
    <div style={{
      width: '100%',
      minHeight: '100dvh',
      background: '#f5fdf7',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',       /* centre the content column */
    }}>
      {/* Content column — matches TabBar's inner max-width */}
      <div style={{
        width: '100%',
        maxWidth: 390,
        flex: 1,
        paddingBottom: hideTabBar
          ? 0
          : 'calc(66px + env(safe-area-inset-bottom, 8px))',
      }}>
        {children}
      </div>

      {!hideTabBar && <TabBar />}
    </div>
  );
}
