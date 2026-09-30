import { ImageResponse } from "next/og";

export const alt = "ForgeX — perfumes & attars, forged to linger.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "radial-gradient(60% 70% at 75% 40%, #2a2a2e 0%, #0c0c0d 70%)",
          color: "#f3efe8",
        }}
      >
        <div style={{ display: "flex", fontSize: 34, letterSpacing: 14, fontWeight: 600 }}>
          FORGE<span style={{ color: "#c8102e" }}>X</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 96, lineHeight: 1, letterSpacing: -2 }}>Scent, forged to linger.</div>
          <div style={{ marginTop: 28, fontSize: 30, color: "#a8a39a" }}>Eau de parfum & alcohol-free attars</div>
        </div>
      </div>
    ),
    size,
  );
}
