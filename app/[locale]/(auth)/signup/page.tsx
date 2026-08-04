import { getTranslations, setRequestLocale } from "next-intl/server";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
    <div className="mx-auto flex min-h-[calc(100dvh-13rem)] w-full max-w-md flex-col justify-center px-4 py-12">
      <Card className="glass-strong animate-fade-up border-border/70 shadow-2xl">
        <CardHeader className="text-center">
          <CardTitle className="font-display text-2xl">
            {t("signupTitle")}
          </CardTitle>
          <CardDescription>{t("signupSubtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <AuthForm mode="signup" defaultEmail={email?.trim() ?? ""} />
        </CardContent>
      </Card>
    </div>
  );
}
