import { ImageResponse } from "next/og";

import { siteConfig } from "@/lib/site";

export const runtime = "edge";
export const alt = siteConfig.name;
export const size = {
  width: 1200,
  height: 600,
};
export const contentType = "image/png";

export default function TwitterImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "52px",
          background:
            "linear-gradient(135deg, #fffaf3 0%, #f7efe4 45%, #f3ecdf 100%)",
          color: "#1b1916",
          fontFamily: "IBM Plex Sans",
        }}
      >
        <div style={{ fontSize: 60, fontWeight: 700 }}>{siteConfig.name}</div>
        <div style={{ fontSize: 30, color: "#475569" }}>线性代数可视化与可验证计算工具</div>
      </div>
    ),
    {
      ...size,
    }
  );
}
