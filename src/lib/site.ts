export const siteConfig = {
  name: "线性代数工作台",
  shortName: "线代工作台",
  description:
    "\u9762\u5411\u7ebf\u6027\u4ee3\u6570\u5b66\u4e60\u4e0e\u5de5\u7a0b\u5b9e\u8df5\u7684\u53ef\u89c6\u5316\u5de5\u5177\uff0c\u652f\u6301\u77e9\u9635\u8fd0\u7b97\u3001\u7ebf\u6027\u65b9\u7a0b\u7ec4\u3001\u77e9\u9635\u5206\u89e3\u4e0e\u7279\u5f81\u5206\u6790\u3002",
  keywords: [
    "\u7ebf\u6027\u4ee3\u6570",
    "\u77e9\u9635\u8ba1\u7b97",
    "\u9ad8\u65af\u6d88\u5143",
    "LU\u5206\u89e3",
    "\u7279\u5f81\u503c",
    "Next.js",
    "Math.js",
  ],
  githubRepo: "https://github.com/GCHkongcheng/linear-algebra-visualizer",
  contactEmail: "2839474636@qq.com",
};

function normalizeSiteUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed.replace(/\/$/, "");
  }
  return `https://${trimmed.replace(/\/$/, "")}`;
}

export function getSiteUrl(): string {
  const fromPublic = normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL ?? "");
  if (fromPublic) return fromPublic;

  const fromVercel = normalizeSiteUrl(
    process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL ?? ""
  );
  if (fromVercel) return fromVercel;

  return "https://linear-algebra-visualizer.vercel.app";
}
