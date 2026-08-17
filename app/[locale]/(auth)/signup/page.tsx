import { getTranslations, setRequestLocale } from "next-intl/server";

import { AuthForm } from "@/components/auth/auth-form";

export default async function SignupPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ email?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { email } = await searchParams;
  const t = await getTranslations("Auth");

  return (
    <div className="animate-rise flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <span className="label-mono">{t("signUpCta")}</span>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-air">
          {t("signupTitle")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("signupSubtitle")}</p>
      </div>
      <AuthForm mode="signup" defaultEmail={email?.trim() ?? ""} />
    </div>
  );
}
