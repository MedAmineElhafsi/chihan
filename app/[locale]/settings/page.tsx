import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Ban, ChevronRight, Download, UserPlus } from "lucide-react";

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
import { PushEnableButton } from "@/components/pwa/push-enable-button";

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
  const tSafety = await getTranslations("Safety");
  const tPwa = await getTranslations("Pwa");

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
          <CardTitle className="font-display">{t("menuTitle")}</CardTitle>
          <CardDescription>{t("menuBody")}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Link
            href="/settings/blocked"
            className="flex items-center gap-3 border-t border-border/60 px-6 py-4 transition-colors hover:bg-secondary/40"
          >
            <span className="flex size-9 items-center justify-center rounded-full bg-secondary text-muted-foreground">
              <Ban className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium">
                {tSafety("blockedTitle")}
              </span>
              <span className="block text-xs text-muted-foreground">
                {t("blockedMenuHint")}
              </span>
            </span>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
          </Link>
          <Link
            href="/settings/invite"
            className="flex items-center gap-3 border-t border-border/60 px-6 py-4 transition-colors hover:bg-secondary/40"
          >
            <span className="flex size-9 items-center justify-center rounded-full bg-gold/15 text-gold">
              <UserPlus className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium">
                {t("inviteMenuTitle")}
              </span>
              <span className="block text-xs text-muted-foreground">
                {t("inviteMenuHint")}
              </span>
            </span>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
          </Link>
        </CardContent>
      </Card>

      <Card className="glass">
        <CardHeader>
          <CardTitle className="font-display">{tPwa("pushTitle")}</CardTitle>
          <CardDescription>{tPwa("pushBody")}</CardDescription>
        </CardHeader>
        <CardContent>
          <PushEnableButton />
        </CardContent>
      </Card>

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
