import type { Metadata } from "next";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { ArrowLeft, ExternalLink, Github, Mail } from "lucide-react";
import Link from "next/link";

import { AboutDocLinks } from "@/components/about/AboutDocLinks";
import { getSiteUrl, siteConfig } from "@/lib/site";

const GITHUB_REPO = siteConfig.githubRepo;
const CONTACT_EMAIL = siteConfig.contactEmail;
const BLOG_URL = "https://283947.xyz/posts/linear-algebra-workbench";
const README_PATH = path.join(process.cwd(), "README.md");
const CHANGELOG_PATH = path.join(process.cwd(), "CHANGELOG.md");

const copy = {
  pageTag: "\u5173\u4e8e\u9875\u9762",
  back: "\u8fd4\u56de\u5de5\u4f5c\u53f0",
  title: "\u5173\u4e8e\u9879\u76ee",
  metaDesc:
    "数值分析工作台的项目背景、技术栈与开发者说明。",
  shareDesc:
    "\u4e86\u89e3\u9879\u76ee\u521d\u8877\u3001\u6280\u672f\u6808\u548c\u5f00\u53d1\u8005\u8054\u7cfb\u65b9\u5f0f\u3002",
  sectionOrigin: "\u9879\u76ee\u521d\u8877",
  sectionStack: "技术栈（Next.js, Tailwind, Math.js）",
  sectionDev: "\u5f00\u53d1\u8005\u8bf4\u660e",
  sectionContact: "\u5f00\u53d1\u8005\u8054\u7cfb",
  paragraphOrigin:
    "数值分析里的很多概念并不只关心最终答案，还关心算法是否稳定、误差如何传播、迭代为什么收敛。这个项目希望把矩阵计算、方程求根、插值逼近、积分与微分方程等流程转化为可交互、可追踪、可验证的计算体验。",
  paragraphStack:
    "系统基于 Next.js 构建路由与页面，使用 Tailwind CSS 组织样式，并通过 Math.js 与自定义数值算法模块提供矩阵计算、非线性方程、插值逼近、数值积分和常微分方程求解能力。",
  paragraphDev:
    "\u9879\u76ee\u6301\u7eed\u4ee5\u201c\u8ba1\u7b97\u6b63\u786e\u6027 + \u53ef\u89e3\u91ca\u6027\u201d\u4e3a\u7b2c\u4e00\u4f18\u5148\u7ea7\u3002\u5982\u679c\u4f60\u53d1\u73b0\u7ed3\u679c\u5f02\u5e38\u6216\u5e0c\u671b\u65b0\u589e\u529f\u80fd\uff0c\u6b22\u8fce\u901a\u8fc7\u4e0b\u65b9\u8054\u7cfb\u65b9\u5f0f\u53cd\u9988\u3002\u53e6\u5916\uff0c\u5982\u679c\u4f60\u559c\u6b22\u8fd9\u4e2a\u9879\u76ee\uff0c\u8bf7\u70b9\u4e00\u4e2astar~",
  blogPrefix:
    "\u66f4\u591a\u54a8\u8be2\u8bf7\u5173\u6ce8\u6211\u7684\u535a\u5ba2\uff08\u94fe\u63a5",
  blogLabel: "283947.xyz",
  blogSuffix: "\uff09\u3002",
  docsLabel: "\u8bf4\u660e\u6587\u6863",
  changelogLabel: "\u66f4\u65b0\u65e5\u5fd7",
  repoLabel: "GitHub \u4ed3\u5e93",
  repoOpen: "\u67e5\u770b\u4ed3\u5e93",
  mailLabel: "\u8054\u7cfb\u90ae\u7bb1",
  mailSend: "\u53d1\u9001\u90ae\u4ef6",
} as const;

async function readMarkdownSafe(targetPath: string, fallbackText: string) {
  try {
    return await readFile(targetPath, "utf8");
  } catch {
    return fallbackText;
  }
}

export const metadata: Metadata = {
  title: copy.title,
  description: copy.metaDesc,
  alternates: {
    canonical: "/about",
  },
  openGraph: {
    title: `${copy.title} | 数值分析工作台`,
    description: copy.shareDesc,
    url: `${getSiteUrl()}/about`,
    siteName: siteConfig.name,
    locale: "zh_CN",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: `${copy.title} | 数值分析工作台`,
    description: copy.shareDesc,
  },
};

export default async function AboutPage() {
  const [readmeContent, changelogContent] = await Promise.all([
    readMarkdownSafe(
      README_PATH,
      "# README\n\n暂时无法读取 README.md，请稍后重试。",
    ),
    readMarkdownSafe(
      CHANGELOG_PATH,
      "# 更新日志\n\n暂时无法读取 CHANGELOG.md，请稍后重试。",
    ),
  ]);

  return (
    <main className="min-h-screen px-6 py-10 text-slate-900">
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-orange-700">
            {copy.pageTag}
          </div>
          <Link href="/" className="step-control">
            <ArrowLeft size={14} />
            {copy.back}
          </Link>
        </header>

        <article className="prose prose-slate max-w-none rounded-3xl border border-slate-200 bg-white/90 px-6 py-7 shadow-sm">
          <h1>数值分析工作台</h1>

          <h2>{copy.sectionOrigin}</h2>
          <p>{copy.paragraphOrigin}</p>

          <h2>{copy.sectionStack}</h2>
          <p>{copy.paragraphStack}</p>

          <h2>{copy.sectionDev}</h2>
          <p>{copy.paragraphDev}</p>

          <p>
            {copy.blogPrefix}
            <a href={BLOG_URL} target="_blank" rel="noreferrer">
              {copy.blogLabel}
            </a>
            {copy.blogSuffix}
          </p>

          <AboutDocLinks
            readmeTitle={copy.docsLabel}
            changelogTitle={copy.changelogLabel}
            readmeContent={readmeContent}
            changelogContent={changelogContent}
          />
        </article>

        <section className="rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-sm">
          <div className="mb-4 text-sm font-semibold text-slate-800">
            {copy.sectionContact}
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <a
              href={GITHUB_REPO}
              target="_blank"
              rel="noreferrer"
              className="group rounded-2xl border border-slate-200 bg-slate-50/80 p-4 transition hover:border-slate-300 hover:bg-white"
            >
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Github size={16} />
                {copy.repoLabel}
              </div>
              <div className="break-all text-xs text-slate-600">
                {GITHUB_REPO}
              </div>
              <div className="mt-3 inline-flex items-center gap-1 text-xs text-slate-500 group-hover:text-slate-800">
                {copy.repoOpen}
                <ExternalLink size={12} />
              </div>
            </a>

            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="group rounded-2xl border border-slate-200 bg-slate-50/80 p-4 transition hover:border-slate-300 hover:bg-white"
            >
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Mail size={16} />
                {copy.mailLabel}
              </div>
              <div className="text-xs text-slate-600">{CONTACT_EMAIL}</div>
              <div className="mt-3 inline-flex items-center gap-1 text-xs text-slate-500 group-hover:text-slate-800">
                {copy.mailSend}
                <ExternalLink size={12} />
              </div>
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}
