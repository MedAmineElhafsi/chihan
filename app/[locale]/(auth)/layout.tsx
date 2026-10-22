import { getTranslations, setRequestLocale } from "next-intl/server";

import { BrandMark } from "@/components/app-shell/brand";
import { EarthOrb } from "@/components/visuals/earth-orb";

export default async function AuthLayout({
  children,
  params,
}: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Landing");

  return (
    <div className="grid min-h-[calc(100dvh-3.5rem)] lg:grid-cols-2">
      {/* The world, turning — the same Earth as the globe, in the page's
          theme. It replaced a pre-rendered Remotion loop in the old cyan
          palette, which could follow neither the theme nor the switch. */}
      <aside className="relative hidden overflow-hidden border-e border-border lg:block">
        <div className="sun-wash absolute inset-0" />
        <EarthOrb className="absolute start-1/2 top-[12%] w-[78%] max-w-[36rem] -translate-x-1/2 rtl:translate-x-1/2" />
        <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-background via-background/80 to-transparent" />

        <div className="relative flex h-full flex-col justify-end gap-4 p-10">
          <BrandMark className="size-8" />
          <p className="max-w-sm font-display text-2xl font-semibold leading-tight tracking-tight text-ink">
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
