import type { Metadata } from "next";
import { ArrowLeft, ExternalLink, Github, Mail } from "lucide-react";
import Link from "next/link";

import { getSiteUrl, siteConfig } from "@/lib/site";

const GITHUB_REPO = siteConfig.githubRepo;
const CONTACT_EMAIL = siteConfig.contactEmail;

const copy = {
  pageTag: "\u5173\u4e8e\u9875\u9762",
  back: "\u8fd4\u56de\u5de5\u4f5c\u53f0",
  title: "\u5173\u4e8e\u9879\u76ee",
  sectionOrigin: "\u9879\u76ee\u521d\u8877",
  sectionStack: "\u6280\u672f\u6808\uff08Next.js, Tailwind, Math.js\uff09",
  sectionDev: "\u5f00\u53d1\u8005\u8bf4\u660e",
  sectionContact: "\u5f00\u53d1\u8005\u8054\u7cfb",
  mailLabel: "\u8054\u7cfb\u90ae\u7bb1",
} as const;

export const metadata: Metadata = {
  title: copy.title,
  description: "Linear Algebra Studio project background, stack, and developer notes.",
  alternates: {
    canonical: "/about",
  },
  openGraph: {
    title: `${copy.title} | Linear Algebra Studio`,
    description:
      "Read the project vision, implementation stack, and contact information.",
    url: `${getSiteUrl()}/about`,
    siteName: siteConfig.name,
    locale: "zh_CN",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: `${copy.title} | Linear Algebra Studio`,
    description:
      "Read the project vision, implementation stack, and contact information.",
  },
};

export default function AboutPage() {
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
          <h1>Linear Algebra Studio</h1>

          <h2>{copy.sectionOrigin}</h2>
          <p>
            This project turns linear algebra workflows into a traceable and verifiable
            experience, instead of only showing final numbers. We focus on step
            explanation, reusable matrix flows, and result correctness checks for both
            learners and engineering use cases.
          </p>

          <h2>{copy.sectionStack}</h2>
          <p>
            The application is built with <strong>Next.js</strong> for routing and
            rendering, <strong>Tailwind CSS</strong> for the design system, and{" "}
            <strong>Math.js</strong> for matrix and algebraic computation.
          </p>

          <h2>{copy.sectionDev}</h2>
          <p>
            Correctness and explainability stay as the top priorities. If you notice
            numerical issues or want new algorithms, you can contact the developer via
            the links below.
          </p>
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
                GitHub Repository
              </div>
              <div className="break-all text-xs text-slate-600">{GITHUB_REPO}</div>
              <div className="mt-3 inline-flex items-center gap-1 text-xs text-slate-500 group-hover:text-slate-800">
                Open Repository
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
                Send Email
                <ExternalLink size={12} />
              </div>
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}
