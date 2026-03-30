import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";

import { getSiteUrl, siteConfig } from "@/lib/site";

import "./globals.css";

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: siteConfig.keywords,
  applicationName: siteConfig.name,
  creator: siteConfig.name,
  authors: [{ name: siteConfig.name, url: siteConfig.githubRepo }],
  publisher: siteConfig.name,
  alternates: {
    canonical: "/",
  },
  category: "education",
  openGraph: {
    title: siteConfig.name,
    description: siteConfig.description,
    url: siteUrl,
    siteName: siteConfig.name,
    locale: "zh_CN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.name,
    description: siteConfig.description,
    creator: siteConfig.name,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  icons: {
    icon: [{ url: "/favicon.ico" }],
    shortcut: [{ url: "/favicon.ico" }],
    apple: [{ url: "/favicon.ico" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ea580c",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: siteConfig.name,
    applicationCategory: "EducationalApplication",
    operatingSystem: "Web",
    description: siteConfig.description,
    url: siteUrl,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    author: {
      "@type": "Organization",
      name: siteConfig.name,
      url: siteConfig.githubRepo,
    },
  };

  return (
    <html lang="zh-CN">
      <body className="antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
