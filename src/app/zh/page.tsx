import type { Metadata } from "next";
import { HomePage } from "../home";

export const metadata: Metadata = {
  title: "Rezekii · TikTok 达人平台",
  description: "排期发布 TikTok 视频，看清什么好卖，推广 Techwide 的 TikTok Shop 推广活动，从铜牌升到金牌。",
};

/** The homepage in Chinese (static). Visitors who picked 中文 get it at / too, through the rewrite in next.config.ts. */
export default function HomeZh() {
  return <HomePage lang="zh" />;
}
