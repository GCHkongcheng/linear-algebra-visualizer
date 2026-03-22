import { ImageResponse } from "next/og";

import { siteConfig } from "@/lib/site";

export const runtime = "edge";
export const alt = siteConfig.name;
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "56px",
          background:
            "radial-gradient(1200px 650px at 8% 0%, #fff9f0 0%, #f4eee5 45%, #f1ece3 100%)",
          color: "#1b1916",
          fontFamily: "IBM Plex Sans",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            border: "1px solid rgba(234,88,12,0.3)",
            borderRadius: "999px",
            padding: "8px 16px",
            fontSize: 24,
            color: "#c2410c",
          }}
        >
          线性代数工作室
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ fontSize: 68, fontWeight: 700, lineHeight: 1.12 }}>
            {siteConfig.name}
          </div>
          <div style={{ fontSize: 32, color: "#334155", maxWidth: 980 }}>
            矩阵运算 · 方程组求解 · 分解与特征分析
          </div>
        </div>

        <div style={{ fontSize: 24, color: "#475569" }}>Built with Next.js + Math.js</div>
      </div>
    ),
    {
      ...size,
    }
  );
}
