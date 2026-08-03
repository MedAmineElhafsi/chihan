import type { Metadata } from "next";
import { Fraunces, Manrope, Vazirmatn } from "next/font/google";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { getDir, routing } from "@/i18n/routing";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Backdrop } from "@/components/backdrop";
import { SiteHeader } from "@/components/app-shell/site-header";
import { SiteFooter } from "@/components/app-shell/site-footer";
import { ServiceWorkerRegister } from "@/components/pwa/sw-register";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { cn } from "@/lib/utils";

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

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });
  return {
    title: t("title"),
    description: t("description"),
    themeColor: [
      { media: "(prefers-color-scheme: dark)", color: "#070a14" },
      { media: "(prefers-color-scheme: light)", color: "#fbf7ef" },
    ],
  };
}

export default async function LocaleLayout({
  children,
  params,
}: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

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
      <body className="min-h-dvh">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <NextIntlClientProvider>
            <Backdrop />
            <div className="relative flex min-h-dvh flex-col">
              <SiteHeader />
              <main className="flex-1">{children}</main>
              <SiteFooter />
            </div>
            <InstallPrompt />
            <ServiceWorkerRegister />
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
