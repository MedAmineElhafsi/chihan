import { Fragment, type CSSProperties } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { BrandMark } from "@/components/app-shell/brand";
import { AuthMotion } from "@/components/visuals/auth-motion";

/** Places an element in the panel's entrance sequence (`.auth-rise`). */
const step = (i: number) => ({ "--i": i }) as CSSProperties;

export default async function AuthLayout({
  children,
  params,
}: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Landing");
  const words = t("ctaTitle").split(" ");

  return (
    <div className="grid min-h-[calc(100dvh-3.5rem)] lg:grid-cols-2">
      {/* Newroz over the mountains — a Remotion loop per theme, with the
          words written over it in HTML so they are in the reader's language. */}
      <aside className="relative hidden overflow-hidden border-e border-border lg:block">
        <AuthMotion />
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-background via-background/70 to-transparent" />

        <div className="relative flex h-full flex-col justify-end gap-4 p-10">
          <BrandMark className="auth-rise size-8" />
          <p className="max-w-sm font-display text-2xl font-semibold leading-tight tracking-tight text-ink">
            {words.map((w, i) => (
              <Fragment key={i}>
                <span className="auth-rise inline-block" style={step(i + 1)}>
                  {w}
                </span>{" "}
              </Fragment>
            ))}
          </p>
          <p className="auth-rise label-mono" style={step(words.length + 2)}>
            {t("coordinates")}
          </p>
        </div>
      </aside>

      {/* Form side */}
      <div className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
