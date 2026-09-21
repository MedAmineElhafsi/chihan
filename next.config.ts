import path from "node:path";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

// This folder is the project's root, stated rather than inferred. Next picks
// the root by looking for the highest lockfile above the project, so a stray
// package-lock.json in any parent folder (a mistyped `npm install` in the
// home folder did it once) turned that folder into the "workspace": under
// Turbopack on Windows the proxy then compiled against a path that does not
// exist, and every request failed with "adapterFn is not a function".
const root = path.join(__dirname);

const nextConfig: NextConfig = {
  turbopack: { root },
  outputFileTracingRoot: root,
  images: {
    remotePatterns: [
      // Supabase Storage (avatars / listing photos).
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
          {
            key: "Service-Worker-Allowed",
            value: "/",
          },
        ],
      },
      {
        source: "/manifest.webmanifest",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
