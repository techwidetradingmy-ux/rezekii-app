import { Shell } from "@/components/shell";
import { LinkBanner } from "@/components/link-banner";

export default function CreatorLayout({ children }: { children: React.ReactNode }) {
  return (
    <Shell app="creator" banner={<LinkBanner />}>
      {children}
    </Shell>
  );
}
