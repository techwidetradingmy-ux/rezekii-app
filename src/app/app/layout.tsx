import { Shell } from "@/components/shell";
import { LinkBanner } from "@/components/link-banner";

export default function CreatorLayout({ children, modal }: { children: React.ReactNode; modal: React.ReactNode }) {
  return (
    <Shell app="creator" banner={<LinkBanner />}>
      {children}
      {modal}
    </Shell>
  );
}
