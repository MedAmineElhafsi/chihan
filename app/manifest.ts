import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Grêdan",
    short_name: "Grêdan",
    description:
      "A global community and discovery platform for the Kurdish diaspora.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    // The manifest takes one colour; the splash uses the light theme's page,
    // and the page's own theme-color meta takes over once it loads.
    background_color: "#e9e1d3",
    theme_color: "#e1d7c6",
    categories: ["social", "lifestyle"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
