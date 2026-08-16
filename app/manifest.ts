import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/orvix-app-v4",
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
        src: "/icon.svg?v=orvix-20260817-v4",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icon.svg?v=orvix-20260817-v4",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
