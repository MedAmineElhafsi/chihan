import type { Metadata } from "next";
import "./globals.css";

// Root layout is intentionally a pass-through: the real <html>/<body> live in
// `app/[locale]/layout.tsx` so the document can carry the active locale + dir.
// (Standard next-intl App Router pattern.)

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
  ),
  title: "Cîhan",
  description:
    "A global community and discovery platform for the Kurdish diaspora.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
