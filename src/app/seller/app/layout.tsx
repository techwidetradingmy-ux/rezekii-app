import { Shell } from "@/components/shell";

export default function SellerLayout({ children, modal }: { children: React.ReactNode; modal: React.ReactNode }) {
  return (
    <Shell app="seller">
      {children}
      {modal}
    </Shell>
  );
}
