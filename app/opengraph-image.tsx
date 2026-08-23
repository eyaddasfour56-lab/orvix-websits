import { ImageResponse } from "next/og";
import { loadSiteSettings } from "@/lib/site-settings-server";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
  const settings = await loadSiteSettings();
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
          color: "white",
          background: `radial-gradient(circle at 18% 18%, ${settings.primaryColor} 0%, transparent 36%), linear-gradient(135deg, #10141d 0%, #050608 70%)`,
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          <div style={{ width: 72, height: 72, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 22, background: "white", color: "black", fontSize: 34, fontWeight: 900 }}>
            {settings.shortName.slice(0, 1)}
          </div>
          <div style={{ fontSize: 34, fontWeight: 900, letterSpacing: 9 }}>{settings.shortName}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div style={{ maxWidth: 930, fontSize: 72, lineHeight: 1.04, fontWeight: 900, letterSpacing: -3 }}>{settings.taglineEn}</div>
          <div style={{ fontSize: 25, color: "#b9c1d0" }}>Smart fitness technology · Secure checkout · Live order tracking</div>
        </div>
      </div>
    ),
    size
  );
}
