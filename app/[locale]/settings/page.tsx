import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Download } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DeleteAccountButton } from "@/components/account/delete-account-button";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login`);

  const t = await getTranslations("Settings");

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5 px-4 py-12 sm:px-6">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          {t("title")}
        </h1>
        <p className="mt-1 text-muted-foreground">{t("subtitle")}</p>
      </div>

      <Card className="glass">
        <CardHeader>
          <CardTitle className="font-display">{t("exportTitle")}</CardTitle>
          <CardDescription>{t("exportBody")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline" className="gap-2">
            <a href="/api/account/export" download>
              <Download className="size-4" />
              {t("exportCta")}
            </a>
          </Button>
        </CardContent>
      </Card>

      <Card className="glass border-destructive/30">
        <CardHeader>
          <CardTitle className="font-display text-destructive">
            {t("dangerTitle")}
          </CardTitle>
          <CardDescription>{t("dangerBody")}</CardDescription>
        </CardHeader>
        <CardContent>
          <DeleteAccountButton />
        </CardContent>
      </Card>

      <p className="text-center text-sm text-muted-foreground">
        <Link href="/privacy" className="hover:underline">
          {t("privacyLink")}
        </Link>
      </p>
    </div>
  );
}
