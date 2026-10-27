import Image from "next/image";
import Link from "next/link";
import { DemoStrip } from "@/components/shell";
import { MENUS } from "@/lib/menus";

export const metadata = { title: "All pages · Rezekii 2.0 preview" };

const EXTRA: Record<string, [string, string][]> = {
  creator: [["/", "Creator site (landing)"], ["/signin", "Sign in / sign up / forgot password"], ["/app/notifications", "Notifications"], ["/app/account", "Account settings"]],
  seller: [["/seller", "Seller site (landing)"], ["/seller/connect", "Sign in and connect Seller Center"], ["/seller/app/notifications", "Notifications"], ["/seller/app/account", "Account settings"]],
  admin: [],
};

const NAMES = { creator: "Creator app", seller: "Seller app", admin: "Admin" } as const;

/** Every screen in the preview, grouped by app and section, for review. */
export default function Tour() {
  return (
    <>
      <DemoStrip />
      <main className="site-wrap v2-main">
        <div className="v2-row" style={{ gap: 14 }}>
          <span className="site-brand" style={{ display: "flex" }}>
            <span><Image src="/master-logo-transparent.png" alt="" width={30} height={30} /></span>
          </span>
          <div>
            <h1 style={{ margin: 0, fontSize: 32, fontWeight: 800, letterSpacing: "-0.02em" }}>Rezekii 2.0 · all pages</h1>
            <p className="v2-muted" style={{ margin: "4px 0 0" }}>Sample data only. Use the strip at the top to switch apps, or to see a creator who hasn&apos;t linked TikTok Shop yet.</p>
          </div>
        </div>
        <div className="v2-grid3 v2-in">
          {(Object.keys(NAMES) as (keyof typeof NAMES)[]).map((app) => (
            <section key={app} className="v2-card">
              <h2 className="v2-h2">{NAMES[app]}</h2>
              {EXTRA[app].length > 0 && (
                <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.9 }}>
                  {EXTRA[app].map(([href, label]) => (
                    <li key={href}><Link href={href}>{label}</Link></li>
                  ))}
                </ul>
              )}
              {MENUS[app].map((s) => (
                <div key={s.href}>
                  <b style={{ fontSize: 14 }}>{s.label}</b>
                  <ul style={{ margin: "4px 0 0", paddingLeft: 18, lineHeight: 1.9 }}>
                    {(s.pages.length ? s.pages : [[s.href, s.label] as [string, string]]).map(([href, label]) => (
                      <li key={href}><Link href={href}>{label}</Link></li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>
          ))}
        </div>
      </main>
    </>
  );
}
