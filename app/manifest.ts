import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/orvix-app",
    name: "ORVIX",
    short_name: "ORVIX",
    description: "ORVIX smart fitness technology and customer support.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#050505",
    theme_color: "#050505",
    orientation: "portrait-primary",
    categories: ["shopping", "business"],
    icons: [
      {
        src: "/icon.svg?v=orvix-20260817-v3",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/logo.jpeg?v=orvix-20260817-v3",
        sizes: "512x512",
        type: "image/jpeg",
        purpose: "maskable",
      },
    ],
  };
}
