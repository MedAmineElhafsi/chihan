import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { Fraunces, Manrope, Vazirmatn } from "next/font/google";

import { getDir, locales, routing, type Locale } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

const vazirmatn = Vazirmatn({
  subsets: ["arabic", "latin"],
  variable: "--font-vazirmatn",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
  ),
  title: "Cîhan",
  description:
    "A global community and discovery platform for the Kurdish diaspora.",
  applicationName: "Cîhan",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Cîhan",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

function resolveLocale(raw: string | null | undefined): Locale {
  if (raw && (locales as readonly string[]).includes(raw)) {
    return raw as Locale;
  }
  return routing.defaultLocale;
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const locale = resolveLocale(
    cookieStore.get("NEXT_LOCALE")?.value ??
      headerStore.get("x-next-intl-locale")
  );

  return (
    <html
      lang={locale}
      dir={getDir(locale)}
      suppressHydrationWarning
      className={cn(
        fraunces.variable,
        manrope.variable,
        vazirmatn.variable,
        "antialiased"
      )}
    >
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
