import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { routing } from "@/i18n/routing";
import { DocumentAttributes } from "@/components/providers/document-attributes";
import { Backdrop } from "@/components/backdrop";
import { SiteHeader } from "@/components/app-shell/site-header";
import { TabBar } from "@/components/app-shell/tab-bar";
import { getCurrentUser } from "@/lib/auth";
import { preview } from "@/lib/og";
import { SiteFooter } from "@/components/app-shell/site-footer";
import { ShellFooter } from "@/components/app-shell/shell-footer";
import { ServiceWorkerRegister } from "@/components/pwa/sw-register";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { TranslateProvider } from "@/components/translate/translate-provider";
import { translationAvailable } from "@/lib/translate";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

// Dark-only product — one committed look.
export const viewport: Viewport = {
  themeColor: "#001619",
  colorScheme: "dark",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });
  return {
    // Pages name themselves (lib/page-title.ts); this adds the brand, and is
    // the whole title for pages that do not.
    title: { default: t("title"), template: t("titleTemplate") },
    description: t("description"),
    // What a shared link shows in WhatsApp and elsewhere, until a page says
    // something more specific about itself.
    ...preview({ title: t("title"), description: t("description"), locale }),
  };
}

export default async function LocaleLayout({
  children,
  params,
}: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const user = await getCurrentUser();
  const tNav = await getTranslations("Nav");

  return (
    <NextIntlClientProvider>
      <DocumentAttributes />
      <Backdrop />
      {/* data-viewer lets a loading skeleton promise only what this viewer
          will get (a composer for a member, a join prompt for a visitor)
          with CSS alone, so server and client render the same thing. */}
      <div
        data-viewer={user ? "member" : "visitor"}
        className="group/viewer relative flex min-h-dvh flex-col"
      >
        {/* The first stop for a keyboard: past every link in the header,
            straight to the page. Hidden until it has focus. */}
        <a
          href="#main"
          className="bg-cyan text-primary-foreground shadow-elev-2 sr-only z-[60] rounded-md text-sm font-semibold focus:not-sr-only focus:fixed focus:start-4 focus:top-3 focus:px-4 focus:py-2.5"
        >
          {tNav("skipToContent")}
        </a>
        <SiteHeader />
        {/* Focusable only as the skip link's target, so it needs no ring. */}
        <main
          id="main"
          tabIndex={-1}
          className="flex-1 pb-20 outline-none lg:pb-0"
        >
          {/* Translating reads the text as its reader, so it needs one. */}
          <TranslateProvider enabled={Boolean(user) && translationAvailable()}>
            {children}
          </TranslateProvider>
        </main>
        <ShellFooter>
          <SiteFooter />
        </ShellFooter>
      </div>
      <TabBar signedIn={Boolean(user)} />
      <InstallPrompt />
      <ServiceWorkerRegister />
    </NextIntlClientProvider>
  );
}
