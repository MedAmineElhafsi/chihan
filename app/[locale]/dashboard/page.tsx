import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  Compass,
  Globe2,
  LogOut,
  Pencil,
  Sparkles,
  UserRound,
} from "lucide-react";

import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getOwnProfile } from "@/lib/profiles";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login`);

  const profile = await getOwnProfile(user.id);
  // First-time users finish onboarding before reaching the dashboard.
  if (!profile || !profile.display_name) redirect(`/${locale}/onboarding`);

  const t = await getTranslations("Dashboard");
  const name = profile.display_name;
  const initial = name.charAt(0).toUpperCase();

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
      <div className="animate-fade-up flex flex-col gap-2">
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-card/40 px-3 py-1 text-xs font-medium text-muted-foreground">
          <Compass className="size-3.5 text-gold" />
          {t("signedInAs")} {user.email}
        </span>
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          {t("title")}
        </h1>
        <p className="max-w-xl text-muted-foreground">{t("subtitle")}</p>
      </div>

      {/* Profile summary */}
      <Card className="glass animate-fade-up mt-8 [animation-delay:80ms]">
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="size-14">
              {profile.avatar_url && (
                <AvatarImage src={profile.avatar_url} alt={name} />
              )}
              <AvatarFallback className="bg-gradient-to-br from-gold to-kurd-red text-primary-foreground">
                {initial}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="font-display text-lg font-semibold">{name}</div>
              <div className="text-sm text-muted-foreground">
                {profile.is_public ? t("publicState") : t("privateState")}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline" className="gap-1.5">
              <Link href="/profile">
                <UserRound className="size-4" />
                {t("viewProfile")}
              </Link>
            </Button>
            <Button asChild className="gap-1.5">
              <Link href="/profile/edit">
                <Pencil className="size-4" />
                {t("editProfile")}
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Explore the globe */}
      <Card className="glass animate-fade-up mt-5 overflow-hidden [animation-delay:120ms]">
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="inline-flex size-11 items-center justify-center rounded-xl bg-secondary text-gold ring-1 ring-border">
              <Globe2 className="size-5" />
            </div>
            <div>
              <div className="font-display text-lg font-semibold">
                {t("exploreTitle")}
              </div>
              <div className="max-w-md text-sm text-muted-foreground">
                {t("exploreBody")}
              </div>
            </div>
          </div>
          <Button asChild className="gap-2 glow-gold">
            <Link href="/explore">
              <Globe2 className="size-4" />
              {t("openGlobe")}
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* Coming soon */}
      <Card className="glass animate-fade-up mt-5 [animation-delay:200ms]">
        <CardHeader>
          <div className="mb-1 inline-flex size-11 items-center justify-center rounded-xl bg-secondary text-gold ring-1 ring-border">
            <Sparkles className="size-5" />
          </div>
          <CardTitle className="font-display">{t("comingSoonTitle")}</CardTitle>
          <CardDescription>{t("comingSoon")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form action="/auth/signout" method="post">
            <Button
              type="submit"
              variant="ghost"
              className="gap-2 text-muted-foreground"
            >
              <LogOut className="size-4" />
              {t("signOut")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
