import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "../../current-user";
import { SiteFooter, SiteNav } from "../../site";
import { SamplesView } from "./samples-view";

export const metadata: Metadata = { title: "My samples · Rezekii" };
export const dynamic = "force-dynamic";

export default async function MySamplesPage() {
  const user = await currentUser();
  if (!user) redirect("/signin");
  return (
    <>
      <SiteNav variant="app" />
      <main className="site-wrap app-main">
        <nav className="app-crumbs" aria-label="Breadcrumb"><Link href="/app">Today</Link><span aria-hidden="true">›</span><span>My samples</span></nav>
        <h1>My samples</h1>
        <SamplesView />
      </main>
      <SiteFooter />
    </>
  );
}
