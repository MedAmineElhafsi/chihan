import { getTranslations, setRequestLocale } from "next-intl/server";

import { AuthForm } from "@/components/auth/auth-form";

export default async function LoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Auth");

  return (
    <div className="animate-rise flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <span className="label-mono">{t("signInCta")}</span>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-air">
          {t("loginTitle")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("loginSubtitle")}</p>
      </div>
      <AuthForm mode="login" />
    </div>
  );
}
