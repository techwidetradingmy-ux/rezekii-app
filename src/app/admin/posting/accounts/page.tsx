import "@/app/admin.css";
import { allAccounts } from "@/modules/admin/accounts.ts";
import { AdminTikTokAccounts } from "@/components/admin/posting";
import { adminOnly } from "../../guard";

export const dynamic = "force-dynamic";

/** Admin › Posting › TikTok Accounts (as on rezekii.com). */
export default async function PostingAccounts() {
  await adminOnly();
  return <AdminTikTokAccounts accounts={await allAccounts()} />;
}
