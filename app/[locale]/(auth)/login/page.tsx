import { getTranslations, setRequestLocale } from "next-intl/server";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
    <div className="mx-auto flex min-h-[calc(100dvh-13rem)] w-full max-w-md flex-col justify-center px-4 py-12">
      <Card className="glass-strong animate-fade-up border-border/70 shadow-2xl">
        <CardHeader className="text-center">
          <CardTitle className="font-display text-2xl">
            {t("loginTitle")}
          </CardTitle>
          <CardDescription>{t("loginSubtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <AuthForm mode="login" />
        </CardContent>
      </Card>
    </div>
  );
}
