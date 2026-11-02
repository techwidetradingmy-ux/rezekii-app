import { Shell } from "@/components/shell";
import { LangProvider } from "@/lib/i18n/client";

/** Admin is Techwide's own workspace and reads English, whatever language the device picked (as in Rezekii 1.0). */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <LangProvider lang="en" words={null}><Shell app="admin">{children}</Shell></LangProvider>;
}
