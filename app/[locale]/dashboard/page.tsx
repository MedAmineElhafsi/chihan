import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Compass, LogOut, Sparkles } from "lucide-react";

import { getCurrentUser } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await getCurrentUser();
  if (!user) {
    redirect(`/${locale}/login`);
  }

  const t = await getTranslations("Dashboard");

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
      <div className="animate-fade-up flex flex-col gap-2">
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-card/40 px-3 py-1 text-xs font-medium text-muted-foreground">
          <Compass className="size-3.5 text-gold" />
          {t("signedInAs")} {user!.email}
        </span>
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          {t("title")}
        </h1>
        <p className="max-w-xl text-muted-foreground">{t("subtitle")}</p>
      </div>

      <Card className="glass animate-fade-up mt-8 [animation-delay:120ms]">
        <CardHeader>
          <div className="mb-1 inline-flex size-11 items-center justify-center rounded-xl bg-secondary text-gold ring-1 ring-border">
            <Sparkles className="size-5" />
          </div>
          <CardTitle className="font-display">{t("comingSoonTitle")}</CardTitle>
          <CardDescription>{t("comingSoon")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form action="/auth/signout" method="post">
            <Button type="submit" variant="outline" className="gap-2">
              <LogOut className="size-4" />
              {t("signOut")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
