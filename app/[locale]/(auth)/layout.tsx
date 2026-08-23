import { getTranslations, setRequestLocale } from "next-intl/server";

import { BrandMark } from "@/components/app-shell/brand";

export default async function AuthLayout({
  children,
  params,
}: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Landing");

  return (
    <div className="grid min-h-[calc(100dvh-3.5rem)] lg:grid-cols-2">
      {/* Signal panel — the Remotion loop */}
      <aside className="relative hidden overflow-hidden border-e border-border lg:block">
        <video
          className="absolute inset-0 size-full object-cover"
          src="/video/hero.mp4"
          poster="/video/hero-frame.png"
          autoPlay
          loop
          muted
          playsInline
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-depth-1 via-transparent to-transparent" />

        <div className="relative flex h-full flex-col justify-end gap-4 p-10">
          <BrandMark className="size-8" />
          <p className="max-w-sm font-display text-2xl font-semibold leading-tight tracking-tight text-air">
            {t("ctaTitle")}
          </p>
          <p className="label-mono">{t("coordinates")}</p>
        </div>
      </aside>

      {/* Form side */}
      <div className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
