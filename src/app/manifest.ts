import type { MetadataRoute } from "next";

import { getSiteUrl, siteConfig } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  const siteUrl = getSiteUrl();

  return {
    name: siteConfig.name,
    short_name: siteConfig.shortName,
    description: siteConfig.description,
    start_url: "/",
    display: "standalone",
    background_color: "#f8f4ee",
    theme_color: "#ea580c",
    lang: "zh-CN",
    icons: [
      {
        src: `${siteUrl}/favicon.ico`,
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}
