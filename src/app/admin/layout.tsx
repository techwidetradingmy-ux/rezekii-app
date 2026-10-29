import { Shell } from "@/components/shell";

export default function AdminLayout({ children, modal }: { children: React.ReactNode; modal: React.ReactNode }) {
  return (
    <Shell app="admin">
      {children}
      {modal}
    </Shell>
  );
}
