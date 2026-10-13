import { SiteFooter, SiteNav } from "../site";

/** Signed-in pages share the menu and footer, so they stay in place while the next page loads (see loading.tsx). */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteNav variant="app" />
      {children}
      <SiteFooter />
    </>
  );
}
