export const siteConfig = {
  name: "Numerical Analysis Studio",
  shortName: "数值分析",
  description:
    "面向数值分析学习与工程实践的可视化工具，支持线性代数计算、非线性方程求根、插值逼近、数值积分、常微分方程与误差分析。",
  keywords: [
    "数值分析",
    "数值计算",
    "线性代数",
    "矩阵计算",
    "非线性方程",
    "插值逼近",
    "数值积分",
    "常微分方程",
    "误差分析",
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

  return "https://numerical-analysis-visualizer.vercel.app";
}
